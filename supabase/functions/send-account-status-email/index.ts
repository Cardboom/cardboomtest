import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StatusEmailRequest {
  user_id: string;
  status: 'banned' | 'paused' | 'suspended';
  reason?: string;
  paused_until?: string;
}

const generateBanEmailHtml = (userName: string, reason: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Suspended</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%); border-radius: 16px; overflow: hidden; border: 1px solid #2a2a2a;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; border-bottom: 1px solid rgba(239, 68, 68, 0.2);">
              <span style="font-size: 28px; font-weight: 800; color: #ef4444;">⚠️</span>
              <span style="font-size: 28px; font-weight: 800; color: #06b6d4; margin-left: 12px;">Card</span><span style="font-size: 28px; font-weight: 400; color: #ffffff;">Boom</span>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #ef4444; line-height: 1.3;">
                Account Suspended
              </h1>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #a3a3a3;">
                Hello ${userName},
              </p>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #a3a3a3;">
                Your CardBoom account has been <strong style="color: #ef4444;">permanently suspended</strong> due to a violation of our Terms of Service.
              </p>
              
              <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #ef4444;">
                  Reason for suspension:
                </p>
                <p style="margin: 0; font-size: 14px; color: #a3a3a3;">
                  ${reason}
                </p>
              </div>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #a3a3a3;">
                If you believe this was a mistake or would like to appeal this decision, please contact our support team:
              </p>
              
              <a href="mailto:support@cardboom.com" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                Contact Support
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; border-top: 1px solid rgba(239, 68, 68, 0.1);">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #666666;">
                <strong style="color: #888888;">Brainbaby Bilişim A.Ş.</strong><br>
                MERSIS: 0187173385800001 | Tax ID: 1871733858
              </p>
              <p style="margin: 0; font-size: 12px; color: #666666;">
                Please reply to <a href="mailto:support@cardboom.com" style="color: #06b6d4;">support@cardboom.com</a> for any questions.
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

const generatePauseEmailHtml = (userName: string, pausedUntil: string) => {
  const date = new Date(pausedUntil);
  const formattedDate = date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Temporarily Paused</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%); border-radius: 16px; overflow: hidden; border: 1px solid #2a2a2a;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; border-bottom: 1px solid rgba(245, 158, 11, 0.2);">
              <span style="font-size: 28px; font-weight: 800; color: #f59e0b;">⏸️</span>
              <span style="font-size: 28px; font-weight: 800; color: #06b6d4; margin-left: 12px;">Card</span><span style="font-size: 28px; font-weight: 400; color: #ffffff;">Boom</span>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #f59e0b; line-height: 1.3;">
                Account Temporarily Paused
              </h1>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #a3a3a3;">
                Hello ${userName},
              </p>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #a3a3a3;">
                Your CardBoom account has been <strong style="color: #f59e0b;">temporarily paused</strong>.
              </p>
              
              <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #f59e0b;">
                  Your account will be automatically restored on:
                </p>
                <p style="margin: 0; font-size: 18px; font-weight: 600; color: #ffffff;">
                  ${formattedDate}
                </p>
              </div>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #a3a3a3;">
                During this time, you will not be able to list items, make purchases, or participate in auctions. Your existing listings and wallet balance remain safe.
              </p>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #a3a3a3;">
                If you have questions or believe this was done in error, please contact support:
              </p>
              
              <a href="mailto:support@cardboom.com" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                Contact Support
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; border-top: 1px solid rgba(245, 158, 11, 0.1);">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #666666;">
                <strong style="color: #888888;">Brainbaby Bilişim A.Ş.</strong><br>
                MERSIS: 0187173385800001 | Tax ID: 1871733858
              </p>
              <p style="margin: 0; font-size: 12px; color: #666666;">
                Please reply to <a href="mailto:support@cardboom.com" style="color: #06b6d4;">support@cardboom.com</a> for any questions.
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
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, status, reason, paused_until }: StatusEmailRequest = await req.json();

    console.log(`Processing account status email for user ${user_id}, status: ${status}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user details
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", user_id)
      .single();

    if (profileError || !profile) {
      console.error("Failed to get user profile:", profileError);
      throw new Error("User not found");
    }

    // Get email from auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user_id);
    
    if (authError || !authUser?.user?.email) {
      console.error("Failed to get user email:", authError);
      throw new Error("User email not found");
    }

    const userEmail = authUser.user.email;
    const userName = profile.display_name || userEmail.split("@")[0];

    // Initialize Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }
    const resend = new Resend(resendApiKey);

    let emailHtml: string;
    let subject: string;

    if (status === "banned" || status === "suspended") {
      emailHtml = generateBanEmailHtml(userName, reason || "Violation of terms of service");
      subject = "⚠️ Your CardBoom Account Has Been Suspended";
    } else if (status === "paused") {
      emailHtml = generatePauseEmailHtml(userName, paused_until || new Date().toISOString());
      subject = "⏸️ Your CardBoom Account Has Been Temporarily Paused";
    } else {
      throw new Error("Invalid status type");
    }

    // Send email
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@cardboom.com";
    const { error: sendError } = await resend.emails.send({
      from: `CardBoom <${fromEmail}>`,
      to: [userEmail],
      subject,
      html: emailHtml,
    });

    if (sendError) {
      console.error("Resend error:", sendError);
      throw sendError;
    }

    console.log(`Account status email sent to ${userEmail}`);

    return new Response(
      JSON.stringify({ success: true, email: userEmail }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-account-status-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
