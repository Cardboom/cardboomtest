import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LoginAlertRequest {
  user_id: string;
  device_info: {
    browser?: string;
    os?: string;
    device_type?: string;
  };
  ip_address?: string;
  location?: string;
  is_new_device: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { user_id, device_info, ip_address, location, is_new_device }: LoginAlertRequest = await req.json();

    console.log(`[login-alert] Processing login alert for user: ${user_id}`);

    // Get user profile and preferences
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, display_name, notify_new_login, notify_new_device')
      .eq('id', user_id)
      .single();

    if (profileError || !profile) {
      console.error('[login-alert] Profile not found:', profileError);
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user wants notifications
    const shouldNotify = 
      (is_new_device && profile.notify_new_device !== false) ||
      (!is_new_device && profile.notify_new_login !== false);

    if (!shouldNotify) {
      console.log('[login-alert] User has disabled login notifications');
      return new Response(
        JSON.stringify({ skipped: true, reason: 'notifications_disabled' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record the login notification
    const { data: notification, error: insertError } = await supabase
      .from('login_notifications')
      .insert({
        user_id,
        device_info,
        ip_address,
        location,
        is_new_device,
        notification_sent: true,
        notification_sent_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[login-alert] Failed to insert notification:', insertError);
    }

    // Build device description
    const deviceName = device_info.browser && device_info.os 
      ? `${device_info.browser} on ${device_info.os}`
      : 'Unknown device';
    
    const deviceType = device_info.device_type || 'device';
    const loginTime = new Date().toLocaleString('en-US', { 
      dateStyle: 'medium', 
      timeStyle: 'short',
      timeZone: 'UTC'
    });

    // Prepare email content
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "CardBoom <security@cardboom.com>";
    const subject = is_new_device 
      ? '🔐 New Device Login to Your CardBoom Account'
      : '🔔 New Login to Your CardBoom Account';

    const alertType = is_new_device ? 'new device' : 'new location';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #0a0a0a;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 32px; border: 1px solid #333;">
            
            <!-- Logo -->
            <div style="text-align: center; margin-bottom: 32px;">
              <img src="https://cardboom.com/favicon.png" alt="CardBoom" width="48" height="48" style="border-radius: 8px;">
            </div>

            <!-- Alert Badge -->
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="background: ${is_new_device ? '#f59e0b' : '#3b82f6'}; color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                ${is_new_device ? '⚠️ New Device Detected' : '🔔 Login Alert'}
              </span>
            </div>

            <!-- Title -->
            <h1 style="color: #ffffff; text-align: center; font-size: 24px; margin: 0 0 16px 0;">
              New Sign-in to Your Account
            </h1>

            <p style="color: #a0aec0; text-align: center; margin: 0 0 32px 0; font-size: 16px;">
              Hi ${profile.display_name || 'there'}, we noticed a ${alertType} login to your CardBoom account.
            </p>

            <!-- Login Details Card -->
            <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="color: #718096; padding: 8px 0; font-size: 14px;">Device</td>
                  <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 500;">${deviceName}</td>
                </tr>
                <tr>
                  <td style="color: #718096; padding: 8px 0; font-size: 14px;">Type</td>
                  <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 500;">${deviceType}</td>
                </tr>
                ${location ? `
                <tr>
                  <td style="color: #718096; padding: 8px 0; font-size: 14px;">Location</td>
                  <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 500;">${location}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="color: #718096; padding: 8px 0; font-size: 14px;">Time</td>
                  <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 500;">${loginTime} UTC</td>
                </tr>
                ${ip_address ? `
                <tr>
                  <td style="color: #718096; padding: 8px 0; font-size: 14px;">IP Address</td>
                  <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right; font-family: monospace;">${ip_address}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            <!-- Action Buttons -->
            <div style="text-align: center; margin-bottom: 24px;">
              <p style="color: #a0aec0; font-size: 14px; margin: 0 0 16px 0;">
                If this was you, you can ignore this email.
              </p>
              <a href="https://cardboom.com/settings" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                🚨 Not You? Secure Your Account
              </a>
            </div>

            <!-- Security Tips -->
            <div style="border-top: 1px solid #333; padding-top: 24px;">
              <p style="color: #718096; font-size: 12px; margin: 0; line-height: 1.6;">
                💡 <strong style="color: #a0aec0;">Security Tips:</strong> Never share your password. Enable login alerts in your 
                <a href="https://cardboom.com/settings" style="color: #3b82f6; text-decoration: none;">account settings</a>.
                CardBoom will never ask for your password via email.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 24px;">
            <p style="color: #4a5568; font-size: 12px; margin: 0;">
              © 2026 CardBoom. All rights reserved.
            </p>
            <p style="color: #4a5568; font-size: 12px; margin: 8px 0 0 0;">
              <a href="https://cardboom.com/settings" style="color: #4a5568; text-decoration: none;">Manage notification settings</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [profile.email],
      subject: subject,
      html: htmlContent,
    });

    console.log('[login-alert] Email sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        email_sent: true,
        notification_id: notification?.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('[login-alert] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
