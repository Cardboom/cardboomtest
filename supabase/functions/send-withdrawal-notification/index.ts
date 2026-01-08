import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WithdrawalNotificationRequest {
  withdrawalId: string;
  userId: string;
  amount: number;
  iban: string;
  accountHolderName: string;
  userEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { withdrawalId, userId, amount, iban, accountHolderName, userEmail }: WithdrawalNotificationRequest = await req.json();

    // Validate inputs
    if (!withdrawalId || !userId || !amount || !iban || !accountHolderName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, full_name')
      .eq('id', userId)
      .single();

    const username = profile?.username || profile?.full_name || 'Unknown User';

    // Build email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .detail-row { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .label { font-weight: 600; color: #6b7280; }
          .value { font-weight: 500; }
          .amount { font-size: 24px; font-weight: bold; color: #ef4444; }
          .footer { padding: 15px 20px; background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">💸 New Withdrawal Request</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Action required in CardBoom Admin Panel</p>
          </div>
          <div class="content">
            <div class="detail-row">
              <span class="label">Request ID:</span>
              <span class="value">${withdrawalId.slice(0, 8)}...</span>
            </div>
            <div class="detail-row">
              <span class="label">User:</span>
              <span class="value">${username}</span>
            </div>
            <div class="detail-row">
              <span class="label">User Email:</span>
              <span class="value">${userEmail}</span>
            </div>
            <div class="detail-row">
              <span class="label">Amount:</span>
              <span class="value amount">$${amount.toFixed(2)}</span>
            </div>
            <div class="detail-row">
              <span class="label">Account Holder:</span>
              <span class="value">${accountHolderName}</span>
            </div>
            <div class="detail-row">
              <span class="label">IBAN:</span>
              <span class="value" style="font-family: monospace;">${iban}</span>
            </div>
            <div class="detail-row">
              <span class="label">Submitted:</span>
              <span class="value">${new Date().toISOString()}</span>
            </div>
          </div>
          <div class="footer">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">
              Please review this request in the Admin Panel and process the withdrawal.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email using Resend API directly
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "CardBoom <onboarding@resend.dev>";
    
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: ['turk@brainbaby.ai'],
        subject: `User Withdrawal Request - $${amount.toFixed(2)}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Resend API error:', emailResponse.status, errorText);
      // Don't fail the request - just log the error
    } else {
      const emailResult = await emailResponse.json();
      console.log("Withdrawal notification email sent:", emailResult);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-withdrawal-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
