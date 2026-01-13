import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  template_key: string;
  variables: Record<string, string>;
  user_id?: string;
}

// Replace template variables
function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

// Generate plain text version from HTML
function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { to, template_key, variables, user_id }: EmailRequest = await req.json();

    console.log(`Sending email: ${template_key} to ${to}`);

    // Add email to variables for unsubscribe link
    const enrichedVariables = { ...variables, email: to };

    // Check user email preferences if user_id provided
    if (user_id) {
      const { data: prefs } = await supabase
        .from('email_preferences')
        .select('*')
        .eq('user_id', user_id)
        .maybeSingle();

      if (prefs) {
        const prefMap: Record<string, string> = {
          welcome: 'welcome_emails',
          price_alert: 'price_alerts',
          item_sold: 'sold_notifications',
          order_confirmation: 'order_updates',
          weekly_digest: 'weekly_digest',
        };
        
        const prefKey = prefMap[template_key];
        if (prefKey && prefs[prefKey] === false) {
          console.log(`User opted out of ${template_key} emails`);
          return new Response(JSON.stringify({ skipped: true, reason: 'user_opted_out' }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
      }
    }

    // Fetch email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', template_key)
      .eq('is_active', true)
      .maybeSingle();

    if (templateError || !template) {
      console.error("Template not found:", template_key);
      return new Response(
        JSON.stringify({ error: "Template not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Replace variables in subject and content
    const subject = replaceVariables(template.subject, enrichedVariables);
    const htmlContent = replaceVariables(template.html_content, enrichedVariables);
    const textContent = htmlToPlainText(htmlContent);

    // Send email via Resend with deliverability headers
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "CardBoom <onboarding@resend.dev>";
    const replyToEmail = Deno.env.get("RESEND_REPLY_TO") || "support@cardboom.com";
    
    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [to],
      reply_to: replyToEmail,
      subject: subject,
      html: htmlContent,
      text: textContent,
      headers: {
        // List-Unsubscribe header for one-click unsubscribe (RFC 8058)
        "List-Unsubscribe": `<https://cardboom.com/unsubscribe?email=${encodeURIComponent(to)}>, <mailto:unsubscribe@cardboom.com?subject=Unsubscribe%20${encodeURIComponent(to)}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        // Precedence header to indicate bulk mail
        "X-Priority": "3",
        "X-Mailer": "CardBoom Mailer",
      },
      tags: [
        { name: "template", value: template_key },
        { name: "environment", value: "production" },
      ],
    });

    console.log("Email sent successfully:", emailResponse);

    // Log email
    await supabase.from('email_logs').insert({
      user_id: user_id || null,
      email: to,
      template_key: template_key,
      subject: subject,
      status: emailResponse.error ? 'failed' : 'sent',
      resend_id: emailResponse.data?.id || null,
      error_message: emailResponse.error?.message || null,
      metadata: variables,
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
