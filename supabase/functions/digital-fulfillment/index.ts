import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FulfillmentRequest {
  order_id: string;
  market_item_id: string;
  user_id: string;
  user_email: string;
  quantity?: number;
}

interface KinguinProduct {
  kinguinId: number;
  name: string;
  price: number;
  stock: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...params } = await req.json();

    switch (action) {
      case 'fulfill_order':
        return await fulfillOrder(supabase, params as FulfillmentRequest);
      
      case 'sync_products':
        return await syncProductsFromProvider(supabase, params.provider);
      
      case 'check_stock':
        return await checkStock(supabase, params.market_item_id);
      
      case 'get_deliveries':
        return await getUserDeliveries(supabase, params.user_id);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: unknown) {
    console.error('Digital fulfillment error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fulfillOrder(supabase: any, request: FulfillmentRequest) {
  const { order_id, market_item_id, user_id, user_email, quantity = 1 } = request;
  
  console.log(`Fulfilling order ${order_id} for user ${user_id}`);

  // 1. Check for available codes in inventory
  const { data: availableCodes, error: codesError } = await supabase
    .from('digital_product_codes')
    .select('*')
    .eq('market_item_id', market_item_id)
    .eq('is_sold', false)
    .eq('is_reserved', false)
    .limit(quantity);

  if (codesError) {
    console.error('Error fetching codes:', codesError);
    throw new Error('Failed to fetch available codes');
  }

  // 2. If no codes available, try auto-purchase from provider
  if (!availableCodes || availableCodes.length < quantity) {
    console.log('No codes available, attempting auto-purchase...');
    
    const autoPurchaseResult = await attemptAutoPurchase(supabase, market_item_id, quantity);
    
    if (!autoPurchaseResult.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No codes available and auto-purchase failed',
          details: autoPurchaseResult.error 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Refetch codes after auto-purchase
    const { data: newCodes } = await supabase
      .from('digital_product_codes')
      .select('*')
      .eq('market_item_id', market_item_id)
      .eq('is_sold', false)
      .eq('is_reserved', false)
      .limit(quantity);
    
    if (!newCodes || newCodes.length < quantity) {
      return new Response(
        JSON.stringify({ success: false, error: 'Auto-purchase completed but codes not available' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    availableCodes.push(...newCodes);
  }

  // 3. Reserve and mark codes as sold
  const codesToDeliver = availableCodes.slice(0, quantity);
  const deliveredCodes: string[] = [];

  for (const code of codesToDeliver) {
    // Mark as sold
    const { error: updateError } = await supabase
      .from('digital_product_codes')
      .update({
        is_sold: true,
        sold_at: new Date().toISOString(),
        sold_to_user_id: user_id,
        sold_order_id: order_id,
      })
      .eq('id', code.id)
      .eq('is_sold', false); // Optimistic lock

    if (updateError) {
      console.error('Error marking code as sold:', updateError);
      continue;
    }

    // Log delivery
    await supabase
      .from('digital_code_deliveries')
      .insert({
        order_id,
        code_id: code.id,
        user_id,
        product_name: code.product_name,
        delivery_method: 'instant',
      });

    deliveredCodes.push(code.code);
  }

  // 4. Send email notification with codes (if Resend is configured)
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (resendKey && user_email) {
    try {
      await sendCodeEmail(resendKey, user_email, codesToDeliver[0]?.product_name, deliveredCodes);
      
      // Update delivery record
      for (const code of codesToDeliver) {
        await supabase
          .from('digital_code_deliveries')
          .update({ email_sent: true, email_sent_at: new Date().toISOString() })
          .eq('code_id', code.id);
      }
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      codes: deliveredCodes,
      count: deliveredCodes.length,
      message: 'Digital product delivered successfully',
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function attemptAutoPurchase(supabase: any, marketItemId: string, quantity: number) {
  // Get provider config
  const { data: configs } = await supabase
    .from('key_provider_config')
    .select('*')
    .eq('is_enabled', true)
    .eq('auto_purchase_enabled', true);

  if (!configs || configs.length === 0) {
    return { success: false, error: 'No auto-purchase providers enabled' };
  }

  // Get market item details
  const { data: item } = await supabase
    .from('market_items')
    .select('name, category, subcategory')
    .eq('id', marketItemId)
    .single();

  if (!item) {
    return { success: false, error: 'Market item not found' };
  }

  // Try each enabled provider
  for (const config of configs) {
    try {
      let result: { success: boolean; orderId?: string; codes?: string[]; unitCost?: number } | null = null;
      switch (config.provider) {
        case 'kinguin':
          result = await purchaseFromKinguin(item.name, quantity);
          break;
        case 'g2a':
          result = await purchaseFromG2A(item.name, quantity);
          break;
        case 'eneba':
          result = await purchaseFromEneba(item.name, quantity);
          break;
        default:
          continue;
      }

      if (result && result.success && result.codes) {
        // Store purchased codes
        for (const code of result.codes) {
          await supabase
            .from('digital_product_codes')
            .insert({
              market_item_id: marketItemId,
              product_name: item.name,
              product_type: 'game_points',
              game_name: item.subcategory || item.category,
              code: code,
              source_provider: config.provider,
              source_order_id: result.orderId || null,
              cost_price_cents: Math.round((result.unitCost || 0) * 100),
            });
        }

        return { success: true };
      }
    } catch (error) {
      console.error(`Auto-purchase from ${config.provider} failed:`, error);
    }
  }

  return { success: false, error: 'All providers failed' };
}

async function purchaseFromKinguin(productName: string, quantity: number) {
  const apiKey = Deno.env.get('KINGUIN_API_KEY');
  if (!apiKey) {
    throw new Error('Kinguin API key not configured');
  }

  // Search for product
  const searchResponse = await fetch(
    `https://gateway.kinguin.net/esa/api/v1/products?name=${encodeURIComponent(productName)}&limit=1`,
    {
      headers: {
        'X-Api-Key': apiKey,
      },
    }
  );

  const searchData = await searchResponse.json();
  if (!searchData.results || searchData.results.length === 0) {
    throw new Error('Product not found on Kinguin');
  }

  const product = searchData.results[0];
  
  // Place order (simplified - real implementation needs more error handling)
  const orderResponse = await fetch(
    'https://gateway.kinguin.net/esa/api/v2/order',
    {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        products: [
          {
            kinguinId: product.kinguinId,
            qty: quantity,
          },
        ],
      }),
    }
  );

  const orderData = await orderResponse.json();
  
  if (!orderData.orderId) {
    throw new Error('Order creation failed');
  }

  // Get keys (may need to poll for completion in real implementation)
  const keysResponse = await fetch(
    `https://gateway.kinguin.net/esa/api/v2/order/${orderData.orderId}/keys`,
    {
      headers: {
        'X-Api-Key': apiKey,
      },
    }
  );

  const keysData = await keysResponse.json();
  
  return {
    success: true,
    orderId: orderData.orderId,
    codes: keysData.keys?.map((k: any) => k.serial) || [],
    unitCost: product.price,
  };
}

async function purchaseFromG2A(productName: string, quantity: number): Promise<{ success: boolean; orderId?: string; codes?: string[]; unitCost?: number }> {
  // G2A API implementation placeholder
  // G2A uses a different API structure
  throw new Error('G2A integration not yet implemented');
}

async function purchaseFromEneba(productName: string, quantity: number): Promise<{ success: boolean; orderId?: string; codes?: string[]; unitCost?: number }> {
  // Eneba API implementation placeholder
  throw new Error('Eneba integration not yet implemented');
}

async function syncProductsFromProvider(supabase: any, provider: string) {
  // Get provider config
  const { data: config } = await supabase
    .from('key_provider_config')
    .select('*')
    .eq('provider', provider)
    .single();

  if (!config) {
    return new Response(
      JSON.stringify({ error: 'Provider not configured' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const markupMultiplier = 1 + (config.markup_percent / 100);
  let products: any[] = [];

  try {
    switch (provider) {
      case 'kinguin':
        products = await fetchKinguinProducts();
        break;
      // Add other providers
    }

    // Update or create market items with marked-up prices
    console.log(`Syncing ${products.length} products from ${provider}`);
    let successCount = 0;
    
    for (const product of products) {
      const markedUpPrice = product.price * markupMultiplier;
      const externalId = `${provider}_${product.id}`;
      
      // Check if exists
      const { data: existing } = await supabase
        .from('market_items')
        .select('id')
        .eq('external_id', externalId)
        .maybeSingle();
      
      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('market_items')
          .update({
            current_price: markedUpPrice,
            image_url: product.coverImage || product.images?.cover?.url || null,
            data_source: provider,
          })
          .eq('id', existing.id);
        
        if (!error) successCount++;
      } else {
        // Insert new
        const { error } = await supabase
          .from('market_items')
          .insert({
            name: product.name,
            category: 'gamepoints',
            subcategory: product.platform || 'PC',
            current_price: markedUpPrice,
            data_source: provider,
            image_url: product.coverImage || product.images?.cover?.url || null,
            external_id: externalId,
          });
        
        if (error) {
          console.error(`Failed to insert ${product.name}:`, error.message);
        } else {
          successCount++;
        }
      }
    }

    // Update last sync time
    await supabase
      .from('key_provider_config')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('provider', provider);

    console.log(`Sync complete: ${successCount}/${products.length} products saved`);
    
    return new Response(
      JSON.stringify({ success: true, synced: successCount, total: products.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Sync error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function fetchKinguinProducts() {
  const apiKey = Deno.env.get('KINGUIN_API_KEY');
  if (!apiKey) {
    throw new Error('Kinguin API key not configured');
  }

  // Search for gift cards and game currencies
  const searchTerms = [
    'Steam Wallet Gift Card',
    'Xbox Gift Card',
    'PlayStation Gift Card',
    'Nintendo eShop Gift Card',
    'Riot Points Gift Card',
    'Roblox Gift Card',
  ];
  const products: any[] = [];

  // Exclude terms for filtering
  const excludeTerms = ['esim', 'e-sim', 'sim card', 'mobile data', 'travel', 'vpn', 'antivirus'];

  for (const term of searchTerms) {
    try {
      const response = await fetch(
        `https://gateway.kinguin.net/esa/api/v1/products?phrase=${encodeURIComponent(term)}&limit=5&sortBy=popularity&sortType=desc`,
        {
          headers: { 'X-Api-Key': apiKey },
        }
      );

      if (!response.ok) {
        console.error(`Kinguin API error for ${term}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      console.log(`Kinguin ${term}: ${data.results?.length || 0} products found`);
      
      if (data.results) {
        // Filter: must have image and exclude bad terms
        const filtered = data.results.filter((p: any) => {
          const name = p.name?.toLowerCase() || '';
          const hasImage = p.images?.cover?.url || p.coverImage || p.images?.screenshots?.[0]?.url;
          const hasExcluded = excludeTerms.some(ex => name.includes(ex));
          // Must contain "gift card" or "wallet" or platform-specific terms
          const isGiftCard = name.includes('gift card') || name.includes('wallet') || name.includes('eshop') || name.includes('points');
          return hasImage && !hasExcluded && isGiftCard;
        });
        
        products.push(...filtered.map((p: any) => ({
          id: p.kinguinId,
          name: p.name,
          price: p.price,
          platform: p.platform,
          coverImage: p.images?.cover?.url || p.coverImage || p.images?.screenshots?.[0]?.url || null,
          stock: p.qty,
        })));
      }
    } catch (err) {
      console.error(`Error fetching ${term}:`, err);
    }
  }

  // Deduplicate by id
  const seen = new Set();
  const unique = products.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  console.log(`Total unique game currency products: ${unique.length}`);
  return unique;
}

async function checkStock(supabase: any, marketItemId: string) {
  const { data, error } = await supabase
    .from('digital_product_codes')
    .select('id')
    .eq('market_item_id', marketItemId)
    .eq('is_sold', false)
    .eq('is_reserved', false);

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ stock: data?.length || 0 }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getUserDeliveries(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('digital_code_deliveries')
    .select(`
      *,
      digital_product_codes (
        code,
        game_name,
        product_type
      )
    `)
    .eq('user_id', userId)
    .order('delivered_at', { ascending: false });

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ deliveries: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function sendCodeEmail(resendKey: string, email: string, productName: string, codes: string[]) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'CardBoom <noreply@cardboom.com>',
      to: [email],
      subject: `Your ${productName} Code is Ready! 🎮`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #F97316;">Your Digital Product is Ready!</h1>
          <p>Thank you for your purchase. Here ${codes.length > 1 ? 'are your codes' : 'is your code'}:</p>
          
          <div style="background: #1a1a2e; color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            ${codes.map(code => `
              <div style="font-family: monospace; font-size: 18px; padding: 10px; background: #16213e; border-radius: 4px; margin: 5px 0;">
                ${code}
              </div>
            `).join('')}
          </div>
          
          <p style="color: #666;">
            <strong>Important:</strong> Keep this code safe and redeem it promptly. 
            If you have any issues, contact our support team.
          </p>
          
          <p style="color: #888; font-size: 12px;">
            This email was sent by CardBoom. Do not share your codes with anyone.
          </p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Email failed: ${error.message}`);
  }
}
