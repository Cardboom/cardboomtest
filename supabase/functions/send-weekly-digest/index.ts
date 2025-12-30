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

    console.log("Starting weekly digest job");

    // Get users who opted in for weekly digest
    const { data: preferences } = await supabase
      .from('email_preferences')
      .select('user_id')
      .eq('weekly_digest', true);

    if (!preferences || preferences.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get market stats for the digest
    const { data: topGainers } = await supabase
      .from('market_items')
      .select('name, price, price_change_24h, image_url')
      .order('price_change_24h', { ascending: false })
      .limit(5);

    const { data: recentSales } = await supabase
      .from('orders')
      .select('listing_id, total_amount, created_at')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5);

    let sentCount = 0;

    for (const pref of preferences) {
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, display_name')
        .eq('id', pref.user_id)
        .maybeSingle();

      if (!profile?.email) continue;

      // Build digest content
      const gainersHtml = topGainers?.map(item => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #333;">
            <img src="${item.image_url || ''}" width="40" height="40" style="border-radius: 4px; margin-right: 10px;" />
            ${item.name}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #333; color: #22c55e;">
            +${(item.price_change_24h || 0).toFixed(1)}%
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #333;">
            $${(item.price || 0).toFixed(2)}
          </td>
        </tr>
      `).join('') || '';

      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #ffffff; margin: 0; padding: 40px; }
          .container { max-width: 600px; margin: 0 auto; background: #1a1a2e; border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; color: #ffffff; }
          .content { padding: 30px; }
          .section { margin: 25px 0; }
          .section h3 { color: #f59e0b; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; }
          th { text-align: left; padding: 10px; color: #888; border-bottom: 2px solid #333; }
          .cta { text-align: center; margin: 30px 0; }
          .cta a { display: inline-block; background: #f59e0b; color: #000; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: bold; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #333; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Your Weekly Market Digest</h1>
          </div>
          <div class="content">
            <p>Hey ${profile.display_name || 'Collector'}! Here's what happened this week on CardBoom:</p>
            
            <div class="section">
              <h3>🚀 Top Gainers</h3>
              <table>
                <thead>
                  <tr>
                    <th>Card</th>
                    <th>Change</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${gainersHtml}
                </tbody>
              </table>
            </div>
            
            <div class="cta">
              <a href="https://cardboom.com/markets">View Full Market →</a>
            </div>
          </div>
          <div class="footer">
            <p>You're receiving this because you subscribed to weekly digests.</p>
            <p><a href="https://cardboom.com/profile" style="color: #888;">Manage preferences</a></p>
          </div>
        </div>
      </body>
      </html>
      `;

      try {
        const emailResponse = await resend.emails.send({
          from: "CardBoom <digest@cardboom.com>",
          to: [profile.email],
          subject: "📊 Your Weekly CardBoom Digest",
          html: htmlContent,
        });

        await supabase.from('email_logs').insert({
          user_id: pref.user_id,
          email: profile.email,
          template_key: 'weekly_digest',
          subject: 'Your Weekly CardBoom Digest',
          status: emailResponse.error ? 'failed' : 'sent',
          resend_id: emailResponse.data?.id || null,
        });

        sentCount++;
      } catch (e) {
        console.error(`Failed to send digest to ${profile.email}:`, e);
      }
    }

    console.log(`Weekly digest sent to ${sentCount} users`);

    return new Response(JSON.stringify({ sent: sentCount }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in weekly digest:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
