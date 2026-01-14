import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface AbandonedCart {
  id: string;
  user_id: string | null;
  email: string | null;
  listing_id: string | null;
  listing_title: string | null;
  listing_price: number | null;
  listing_image: string | null;
  recovery_email_count: number;
  created_at: string;
  status: string;
}

const generateEmailHtml = (
  type: '1hr' | '24hr' | 'similar',
  cart: AbandonedCart,
  discountPercent?: number,
  similarCards?: Array<{ title: string; price: number; image_url: string; id: string }>
) => {
  const baseUrl = "https://cardboom.com";
  const unsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(cart.email || '')}`;
  
  const formatPrice = (price: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);

  let subject = '';
  let headline = '';
  let body = '';
  let ctaText = '';
  let ctaUrl = cart.listing_id ? `${baseUrl}/cards/${cart.listing_id}` : baseUrl;

  if (type === '1hr') {
    subject = "Your cards are still waiting! 🎴";
    headline = "Don't let this one get away!";
    body = `You were checking out <strong>${cart.listing_title || 'an amazing card'}</strong> but didn't complete your purchase. It's still available—for now.`;
    ctaText = "Complete My Purchase";
  } else if (type === '24hr') {
    const discountedPrice = cart.listing_price ? cart.listing_price * (1 - (discountPercent || 2) / 100) : 0;
    subject = `Price dropped on ${cart.listing_title || 'your card'}! 📉`;
    headline = "Good news—the price just dropped!";
    body = `
      <p>The card you were interested in now has a special price just for you:</p>
      <div style="background: linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(6, 182, 212, 0.05)); border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="text-decoration: line-through; color: #888; margin: 0;">${formatPrice(cart.listing_price || 0)}</p>
        <p style="font-size: 28px; font-weight: bold; color: #06b6d4; margin: 8px 0;">${formatPrice(discountedPrice)}</p>
        <p style="color: #10b981; font-size: 14px; margin: 0;">You save ${discountPercent || 2}%!</p>
      </div>
    `;
    ctaText = "Grab This Deal";
  } else if (type === 'similar') {
    subject = "Similar cards just listed! 🔥";
    headline = "Cards you might love";
    body = `Based on what you were browsing, we found some similar cards that just hit the market:`;
    ctaText = "Browse New Listings";
    ctaUrl = baseUrl + "/browse";
    
    if (similarCards && similarCards.length > 0) {
      body += `<div style="margin: 20px 0;">`;
      for (const card of similarCards.slice(0, 3)) {
        body += `
          <a href="${baseUrl}/cards/${card.id}" style="display: block; background: #1a1a2e; border-radius: 12px; padding: 16px; margin: 12px 0; text-decoration: none; color: inherit;">
            <div style="display: flex; align-items: center; gap: 16px;">
              <img src="${card.image_url || 'https://cardboom.com/placeholder.png'}" alt="${card.title}" style="width: 60px; height: 84px; object-fit: cover; border-radius: 8px;" />
              <div>
                <p style="font-weight: 600; color: #fff; margin: 0 0 4px 0;">${card.title}</p>
                <p style="color: #06b6d4; font-weight: bold; margin: 0;">${formatPrice(card.price)}</p>
              </div>
            </div>
          </a>
        `;
      }
      body += `</div>`;
    }
  }

  return {
    subject,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #06b6d4; font-size: 28px; margin: 0;">CardBoom</h1>
    </div>

    <!-- Main Card -->
    <div style="background: linear-gradient(180deg, #1a1a2e 0%, #16162a 100%); border-radius: 16px; padding: 32px; border: 1px solid rgba(6, 182, 212, 0.2);">
      
      ${cart.listing_image && type !== 'similar' ? `
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="${cart.listing_image}" alt="${cart.listing_title}" style="max-width: 200px; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.4);" />
        </div>
      ` : ''}

      <h2 style="color: #fff; font-size: 24px; text-align: center; margin: 0 0 16px 0;">${headline}</h2>
      
      <div style="color: #a0a0b0; font-size: 16px; line-height: 1.6; text-align: center;">
        ${body}
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin-top: 32px;">
        <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #06b6d4, #0891b2); color: #fff; font-weight: 600; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-size: 16px;">
          ${ctaText}
        </a>
      </div>
    </div>

    <!-- Trust badges -->
    <div style="display: flex; justify-content: center; gap: 24px; margin-top: 24px; flex-wrap: wrap;">
      <span style="color: #6b7280; font-size: 12px;">🔒 Secure Checkout</span>
      <span style="color: #6b7280; font-size: 12px;">✓ Buyer Protection</span>
      <span style="color: #6b7280; font-size: 12px;">📦 Fast Shipping</span>
    </div>

    <!-- Footer -->
    <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
      <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px 0;">
        Brainbaby Bilişim A.Ş. | Ankara, Turkey
      </p>
      <p style="color: #6b7280; font-size: 12px; margin: 0;">
        <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
    `
  };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let processed = 0;
    let errors = 0;

    // 1. Process 1-hour abandoned carts (first email)
    const { data: oneHourCarts } = await supabase
      .from('abandoned_carts')
      .select('*')
      .eq('status', 'abandoned')
      .eq('recovery_email_count', 0)
      .lt('created_at', oneHourAgo.toISOString())
      .gt('created_at', twentyFourHoursAgo.toISOString())
      .not('email', 'is', null)
      .limit(50);

    for (const cart of oneHourCarts || []) {
      try {
        const { subject, html } = generateEmailHtml('1hr', cart);
        
        await resend.emails.send({
          from: "CardBoom <noreply@cardboom.com>",
          to: [cart.email!],
          subject,
          html,
          headers: {
            'List-Unsubscribe': `<https://cardboom.com/unsubscribe?email=${encodeURIComponent(cart.email!)}>`,
          },
        });

        await supabase
          .from('abandoned_carts')
          .update({
            recovery_email_count: 1,
            recovery_email_sent_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('id', cart.id);

        processed++;
        console.log(`Sent 1hr recovery email to ${cart.email}`);
      } catch (err) {
        console.error(`Error sending 1hr email to ${cart.email}:`, err);
        errors++;
      }
    }

    // 2. Process 24-hour abandoned carts (price drop email)
    const { data: twentyFourHourCarts } = await supabase
      .from('abandoned_carts')
      .select('*')
      .eq('status', 'abandoned')
      .eq('recovery_email_count', 1)
      .lt('created_at', twentyFourHoursAgo.toISOString())
      .gt('created_at', sevenDaysAgo.toISOString())
      .not('email', 'is', null)
      .limit(50);

    for (const cart of twentyFourHourCarts || []) {
      try {
        const discountPercent = 2; // Small discount to trigger urgency
        const { subject, html } = generateEmailHtml('24hr', cart, discountPercent);
        
        await resend.emails.send({
          from: "CardBoom <noreply@cardboom.com>",
          to: [cart.email!],
          subject,
          html,
          headers: {
            'List-Unsubscribe': `<https://cardboom.com/unsubscribe?email=${encodeURIComponent(cart.email!)}>`,
          },
        });

        await supabase
          .from('abandoned_carts')
          .update({
            recovery_email_count: 2,
            recovery_email_sent_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('id', cart.id);

        processed++;
        console.log(`Sent 24hr price drop email to ${cart.email}`);
      } catch (err) {
        console.error(`Error sending 24hr email to ${cart.email}:`, err);
        errors++;
      }
    }

    // 3. Process browse-only users (similar cards email)
    // These are users who viewed items but never started checkout
    const { data: browseOnlyCarts } = await supabase
      .from('abandoned_carts')
      .select('*')
      .eq('status', 'browse_only')
      .eq('recovery_email_count', 0)
      .lt('created_at', twentyFourHoursAgo.toISOString())
      .not('email', 'is', null)
      .not('listing_id', 'is', null)
      .limit(30);

    for (const cart of browseOnlyCarts || []) {
      try {
        // Fetch similar cards based on viewed listing
        const { data: viewedListing } = await supabase
          .from('listings')
          .select('category, market_item_id')
          .eq('id', cart.listing_id!)
          .single();

        let similarCards: Array<{ title: string; price: number; image_url: string; id: string }> = [];
        
        if (viewedListing) {
          const { data: similar } = await supabase
            .from('listings')
            .select('id, title, price, image_url')
            .eq('category', viewedListing.category)
            .eq('status', 'active')
            .neq('id', cart.listing_id!)
            .order('created_at', { ascending: false })
            .limit(3);

          similarCards = (similar || []).map(s => ({
            id: s.id,
            title: s.title,
            price: s.price,
            image_url: s.image_url || '',
          }));
        }

        if (similarCards.length === 0) continue;

        const { subject, html } = generateEmailHtml('similar', cart, undefined, similarCards);
        
        await resend.emails.send({
          from: "CardBoom <noreply@cardboom.com>",
          to: [cart.email!],
          subject,
          html,
          headers: {
            'List-Unsubscribe': `<https://cardboom.com/unsubscribe?email=${encodeURIComponent(cart.email!)}>`,
          },
        });

        await supabase
          .from('abandoned_carts')
          .update({
            recovery_email_count: 1,
            recovery_email_sent_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('id', cart.id);

        processed++;
        console.log(`Sent similar cards email to ${cart.email}`);
      } catch (err) {
        console.error(`Error sending similar cards email to ${cart.email}:`, err);
        errors++;
      }
    }

    // 4. Mark old abandoned carts as expired
    await supabase
      .from('abandoned_carts')
      .update({ status: 'expired', updated_at: now.toISOString() })
      .eq('status', 'abandoned')
      .lt('created_at', sevenDaysAgo.toISOString());

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed, 
        errors,
        message: `Processed ${processed} abandoned cart emails with ${errors} errors`
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error processing abandoned carts:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
