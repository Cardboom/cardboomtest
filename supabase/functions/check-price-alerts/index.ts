import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking price alerts...');

    // Get all watchlist items with target prices and price drop notifications enabled
    const { data: watchlistItems, error: watchlistError } = await supabase
      .from('watchlist')
      .select(`
        id,
        user_id,
        target_price,
        notify_on_price_drop,
        market_item_id,
        market_items (
          id,
          name,
          current_price,
          image_url
        )
      `)
      .eq('notify_on_price_drop', true)
      .not('target_price', 'is', null);

    if (watchlistError) {
      console.error('Error fetching watchlist:', watchlistError);
      throw watchlistError;
    }

    console.log(`Found ${watchlistItems?.length || 0} watchlist items with alerts`);

    const triggeredAlerts = [];

    for (const item of watchlistItems || []) {
      const marketItem = item.market_items as any;
      if (!marketItem) continue;

      // Check if current price is at or below target
      if (marketItem.current_price <= item.target_price) {
        console.log(`Price alert triggered for ${marketItem.name}: ${marketItem.current_price} <= ${item.target_price}`);

        // Send notification
        const notificationPayload = {
          user_id: item.user_id,
          type: 'price_alert',
          title: '🎯 Price Alert Triggered!',
          body: `${marketItem.name} is now ₺${marketItem.current_price} (your target: ₺${item.target_price})`,
          data: {
            market_item_id: marketItem.id,
            current_price: marketItem.current_price,
            target_price: item.target_price,
          },
        };

        // Store notification directly
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: notificationPayload.user_id,
            type: notificationPayload.type,
            title: notificationPayload.title,
            body: notificationPayload.body,
            data: notificationPayload.data,
          });

        if (notifError) {
          console.error('Error creating notification:', notifError);
        } else {
          triggeredAlerts.push(item.id);
        }

        // Optionally disable the alert after triggering
        await supabase
          .from('watchlist')
          .update({ notify_on_price_drop: false })
          .eq('id', item.id);
      }
    }

    console.log(`Triggered ${triggeredAlerts.length} price alerts`);

    return new Response(JSON.stringify({ 
      success: true, 
      checked: watchlistItems?.length || 0,
      triggered: triggeredAlerts.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in check-price-alerts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
