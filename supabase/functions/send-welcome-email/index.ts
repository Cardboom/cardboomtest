import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { user_id, email, name } = await req.json();

    console.log(`Sending welcome email to ${email}`);

    // Create default email preferences for new user
    await supabase.from('email_preferences').upsert({
      user_id,
      welcome_emails: true,
      price_alerts: true,
      sold_notifications: true,
      weekly_digest: true,
      marketing_emails: true,
      order_updates: true,
    }, { onConflict: 'user_id' });

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #ffffff; margin: 0; padding: 40px; }
        .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); padding: 40px; text-align: center; }
        .header h1 { margin: 0; font-size: 32px; color: #ffffff; }
        .content { padding: 40px; }
        .content h2 { color: #f59e0b; margin-top: 0; }
        .features { margin: 30px 0; }
        .feature { display: flex; align-items: center; margin: 15px 0; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px; }
        .feature-icon { font-size: 24px; margin-right: 15px; }
        .cta { text-align: center; margin: 30px 0; }
        .cta a { display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; }
        .footer { padding: 20px 40px; text-align: center; color: #888; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎴 Welcome to CardBoom!</h1>
        </div>
        <div class="content">
          <h2>Hey ${name || 'Collector'}! 👋</h2>
          <p>Welcome to the ultimate marketplace for trading cards and collectibles. We're thrilled to have you join our community!</p>
          
          <div class="features">
            <div class="feature">
              <span class="feature-icon">💰</span>
              <div>
                <strong>Real-time Price Discovery</strong>
                <p style="margin: 5px 0 0; color: #aaa;">Track market values with AI-powered pricing intelligence</p>
              </div>
            </div>
            <div class="feature">
              <span class="feature-icon">🔒</span>
              <div>
                <strong>Secure Transactions</strong>
                <p style="margin: 5px 0 0; color: #aaa;">Escrow protection on every purchase</p>
              </div>
            </div>
            <div class="feature">
              <span class="feature-icon">🏆</span>
              <div>
                <strong>Earn Rewards</strong>
                <p style="margin: 5px 0 0; color: #aaa;">Level up, unlock achievements, and earn XP</p>
              </div>
            </div>
          </div>
          
          <div class="cta">
            <a href="https://cardboom.com">Start Exploring →</a>
          </div>
        </div>
        <div class="footer">
          <p>© 2024 CardBoom. All rights reserved.</p>
          <p>You're receiving this because you signed up for CardBoom.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "CardBoom <welcome@cardboom.com>",
      to: [email],
      subject: "Welcome to CardBoom! 🎴 Your collectibles journey starts now",
      html: htmlContent,
    });

    console.log("Welcome email sent:", emailResponse);

    // Log email
    await supabase.from('email_logs').insert({
      user_id,
      email,
      template_key: 'welcome',
      subject: 'Welcome to CardBoom!',
      status: emailResponse.error ? 'failed' : 'sent',
      resend_id: emailResponse.data?.id || null,
      error_message: emailResponse.error?.message || null,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
