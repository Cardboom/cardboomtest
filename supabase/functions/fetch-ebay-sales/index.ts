import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EBAY_CLIENT_ID = Deno.env.get('EBAY_CLIENT_ID');
const EBAY_CLIENT_SECRET = Deno.env.get('EBAY_CLIENT_SECRET');

const EBAY_OAUTH_URL = 'https://api.ebay.com/identity/v1/oauth2/token';

interface CachedToken {
  access_token: string;
  expires_at: string;
}

// deno-lint-ignore no-explicit-any
type SupabaseClientAny = ReturnType<typeof createClient<any>>;

// Get OAuth token with auto-refresh
async function getEbayToken(supabase: SupabaseClientAny): Promise<string | null> {
  const { data: setting, error: fetchError } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'ebay_oauth_token')
    .single();

  if (!fetchError && setting?.value) {
    const cached = setting.value as CachedToken;
    const expiresAt = new Date(cached.expires_at);
    
    if (expiresAt > new Date()) {
      console.log('[fetch-ebay-sales] Using cached eBay token');
      return cached.access_token;
    }
    console.log('[fetch-ebay-sales] Cached token expired, refreshing...');
  }

  if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
    console.log('[fetch-ebay-sales] eBay OAuth credentials not configured');
    return null;
  }

  try {
    const credentials = btoa(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`);
    
    console.log('[fetch-ebay-sales] Requesting new eBay OAuth token...');
    
    const response = await fetch(EBAY_OAUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'https://api.ebay.com/oauth/api_scope',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[fetch-ebay-sales] eBay OAuth error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + (data.expires_in - 300) * 1000);
    
    const { error: upsertError } = await supabase
      .from('platform_settings')
      .upsert({
        key: 'ebay_oauth_token',
        value: {
          access_token: data.access_token,
          expires_at: expiresAt.toISOString(),
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    if (upsertError) {
      console.error('[fetch-ebay-sales] Failed to cache token:', upsertError);
    }

    console.log('[fetch-ebay-sales] New eBay token obtained and cached');
    return data.access_token;
  } catch (error) {
    console.error('[fetch-ebay-sales] Error getting eBay token:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 10 } = await req.json();
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const ebayToken = await getEbayToken(supabase);
    
    if (!ebayToken) {
      console.error('[fetch-ebay-sales] Failed to get eBay token');
      return new Response(
        JSON.stringify({ error: 'eBay API not configured or token refresh failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[fetch-ebay-sales] Fetching eBay sales for: ${query}`);

    const searchParams = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      filter: 'buyingOptions:{FIXED_PRICE|AUCTION}',
      sort: 'newlyListed',
    });

    const response = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?${searchParams}`,
      {
        headers: {
          'Authorization': `Bearer ${ebayToken}`,
          'Content-Type': 'application/json',
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[fetch-ebay-sales] eBay API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'eBay API error', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    const sales = (data.itemSummaries || []).map((item: Record<string, unknown>) => ({
      id: item.itemId,
      title: item.title,
      price: parseFloat((item.price as Record<string, string>)?.value || '0'),
      currency: (item.price as Record<string, string>)?.currency || 'USD',
      imageUrl: (item.image as Record<string, string>)?.imageUrl || ((item.thumbnailImages as Record<string, string>[])?.[0])?.imageUrl,
      itemUrl: item.itemWebUrl,
      condition: item.condition,
      seller: (item.seller as Record<string, string>)?.username,
      sellerFeedback: (item.seller as Record<string, string>)?.feedbackPercentage,
      listingDate: item.itemCreationDate,
      location: (item.itemLocation as Record<string, string>)?.country,
    }));

    console.log(`[fetch-ebay-sales] Found ${sales.length} eBay listings for: ${query}`);

    return new Response(
      JSON.stringify({ 
        sales,
        total: data.total || sales.length,
        query,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[fetch-ebay-sales] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
