import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  user_id: string;
  type: 'price_alert' | 'new_offer' | 'message' | 'order_update' | 'follower' | 'review' | 'referral';
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

    // TODO: Send push notification if user has push enabled
    // This would require web-push or a service like Firebase Cloud Messaging

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
