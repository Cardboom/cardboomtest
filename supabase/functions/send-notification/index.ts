import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getCorsHeaders } from "../_shared/cors.ts";

// Tightened CORS - only allows cardboom.com and Lovable preview URLs
const corsHeaders = getCorsHeaders();

interface NotificationPayload {
  user_id: string;
  type: 'price_alert' | 'new_offer' | 'message' | 'new_message' | 'order_update' | 'follower' | 'review' | 'referral' | 'grading_complete' | 'listing_created' | 'outbid' | 'auction_won' | 'storage_fee' | 'sale' | 'daily_xp' | 'donation_complete' | 'donation_refund' | 'vault_shipping_required' | 'gift' | 'order_shipped' | 'order_delivered' | 'order_completed';
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// Email template with dark design and cyan accents
const generateEmailHtml = (title: string, body: string, ctaUrl?: string, ctaText?: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%); border-radius: 16px; overflow: hidden; border: 1px solid #2a2a2a;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; border-bottom: 1px solid rgba(6, 182, 212, 0.2);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size: 28px; font-weight: 800; color: #06b6d4;">Card</span><span style="font-size: 28px; font-weight: 400; color: #ffffff;">Boom</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                ${title}
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #a3a3a3;">
                ${body}
              </p>
              ${ctaUrl && ctaText ? `
              <a href="${ctaUrl}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                ${ctaText}
              </a>
              ` : ''}
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(6, 182, 212, 0.3) 50%, transparent 100%);"></div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #666666;">
                <strong style="color: #888888;">Brainbaby Bilişim A.Ş.</strong><br>
                MERSIS: 0187173385800001 | Tax ID: 1871733858
              </p>
              <p style="margin: 0; font-size: 12px; color: #666666;">
                You're receiving this email because you have notifications enabled on CardBoom.<br>
                <a href="https://cardboom.com/settings/notifications" style="color: #06b6d4; text-decoration: none;">Manage notification preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Types that should trigger email notifications
const EMAIL_ENABLED_TYPES = [
  'sale',
  'order_update',
  'order_shipped',
  'order_delivered', 
  'order_completed',
  'grading_complete',
  'vault_shipping_required',
  'donation_complete',
  'auction_won',
];

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
      'order_shipped': 'order_updates',
      'order_delivered': 'order_updates',
      'order_completed': 'order_updates',
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

    // Send email for order-related notifications
    let emailSent = false;
    if (EMAIL_ENABLED_TYPES.includes(payload.type)) {
      try {
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@cardboom.com';

        if (resendApiKey) {
          // Get user's email
          const { data: userData } = await supabase.auth.admin.getUserById(payload.user_id);
          const userEmail = userData?.user?.email;

          if (userEmail) {
            const resend = new Resend(resendApiKey);
            
            // Build CTA based on notification type
            let ctaUrl: string | undefined;
            let ctaText: string | undefined;
            
            if (payload.data?.order_id) {
              ctaUrl = `https://cardboom.com/order/${payload.data.order_id}`;
              ctaText = 'View Order Details';
            } else if (payload.data?.listing_id) {
              ctaUrl = `https://cardboom.com/listing/${payload.data.listing_id}`;
              ctaText = 'View Listing';
            }

            const emailHtml = generateEmailHtml(
              payload.title,
              payload.body,
              ctaUrl,
              ctaText
            );

            await resend.emails.send({
              from: `CardBoom <${fromEmail}>`,
              to: [userEmail],
              subject: payload.title,
              html: emailHtml,
              headers: {
                'List-Unsubscribe': '<https://cardboom.com/settings/notifications>',
                'Reply-To': 'support@cardboom.com',
              },
            });

            emailSent = true;
            console.log(`Email sent to ${userEmail} for ${payload.type}`);
          }
        }
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the whole request if email fails
      }
    }

    return new Response(JSON.stringify({ success: true, notification, emailSent }), {
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
