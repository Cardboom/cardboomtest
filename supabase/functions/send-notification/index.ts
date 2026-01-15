import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Tightened CORS - only allows cardboom.com and Lovable preview URLs
const corsHeaders = getCorsHeaders();

interface NotificationPayload {
  user_id: string;
  type: 'price_alert' | 'new_offer' | 'message' | 'new_message' | 'order_update' | 'follower' | 'review' | 'referral' | 'grading_complete' | 'listing_created' | 'outbid' | 'auction_won' | 'storage_fee' | 'sale' | 'daily_xp' | 'donation_complete' | 'donation_refund' | 'vault_shipping_required' | 'gift';
  title: string;
  body: string;
  data?: Record<string, unknown>;
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
      'new_message': 'messages',
      'order_update': 'order_updates',
      'follower': 'follower_activity',
      'review': 'new_offers',
      'referral': 'new_offers',
      'daily_xp': 'new_offers',
      'sale': 'order_updates',
      'grading_complete': 'order_updates',
      'listing_created': 'order_updates',
      'outbid': 'new_offers',
      'auction_won': 'order_updates',
      'storage_fee': 'order_updates',
      'donation_complete': 'order_updates',
      'donation_refund': 'order_updates',
      'vault_shipping_required': 'order_updates',
      'gift': 'new_offers',
    };

    const prefField = prefMap[payload.type];
    if (prefs && prefField && !prefs[prefField]) {
      return new Response(JSON.stringify({ success: false, reason: 'disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Store notification in database (real-time subscriptions handle delivery)
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
      throw notifError;
    }

    return new Response(JSON.stringify({ success: true, notification }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('send-notification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
