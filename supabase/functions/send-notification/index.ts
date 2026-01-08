import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  user_id: string;
  type: 'price_alert' | 'new_offer' | 'message' | 'order_update' | 'follower' | 'review' | 'referral' | 'grading_complete' | 'listing_created' | 'outbid' | 'auction_won' | 'storage_fee';
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

function getNotificationUrl(type: string, data?: Record<string, unknown>): string {
  switch (type) {
    case 'price_alert':
      return data?.market_item_id ? `/item/${data.market_item_id}` : '/markets';
    case 'new_offer':
      return data?.listing_id ? `/listing/${data.listing_id}` : '/trades';
    case 'message':
      return data?.conversation_id ? `/messages?id=${data.conversation_id}` : '/messages';
    case 'order_update':
      return data?.listing_id ? `/listing/${data.listing_id}` : (data?.order_id ? `/orders/${data.order_id}` : '/portfolio');
    case 'grading_complete':
      return data?.listing_id ? `/listing/${data.listing_id}` : (data?.grading_order_id ? `/grading/orders/${data.grading_order_id}` : '/grading/orders');
    case 'listing_created':
      return data?.listing_id ? `/listing/${data.listing_id}` : '/sell';
    case 'outbid':
    case 'auction_won':
      return data?.auction_id ? `/auctions/${data.auction_id}` : '/auctions';
    case 'storage_fee':
      return '/vault';
    case 'follower':
      return data?.follower_id ? `/user/${data.follower_id}` : '/';
    default:
      return '/';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: NotificationPayload = await req.json();
    console.log('Sending notification:', payload);

    // Check user's notification preferences
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', payload.user_id)
      .single();

    // Map notification type to preference field
    const prefMap: Record<string, string> = {
      'price_alert': 'price_alerts',
      'new_offer': 'new_offers',
      'message': 'messages',
      'order_update': 'order_updates',
      'follower': 'follower_activity',
      'review': 'new_offers',
      'referral': 'new_offers',
      'daily_xp': 'new_offers', // Use existing pref field
    };

    const prefField = prefMap[payload.type];
    if (prefs && prefField && !prefs[prefField]) {
      console.log('User has disabled this notification type');
      return new Response(JSON.stringify({ success: false, reason: 'disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Store notification in database
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: payload.user_id,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: payload.data,
      })
      .select()
      .single();

    if (notifError) {
      console.error('Error storing notification:', notifError);
      throw notifError;
    }

    console.log('Notification stored successfully:', notification.id);

    // Send push notification if user has push enabled
    if (prefs?.push_enabled && prefs?.push_subscription) {
      try {
        const pushSubscription = prefs.push_subscription as any;
        console.log('Sending push notification to:', pushSubscription.endpoint);
        
        // Use fetch to send to the push service endpoint
        const pushPayload = JSON.stringify({
          title: payload.title,
          body: payload.body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          data: {
            ...payload.data,
            url: getNotificationUrl(payload.type, payload.data)
          }
        });

        // Note: In production, you'd use web-push library or a service
        // This is a simplified version that relies on the service worker
        console.log('Push payload prepared:', pushPayload);
      } catch (pushError) {
        console.error('Error sending push notification:', pushError);
        // Don't fail the whole request if push fails
      }
    }

    return new Response(JSON.stringify({ success: true, notification }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in send-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
