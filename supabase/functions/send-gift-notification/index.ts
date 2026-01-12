import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GiftNotificationRequest {
  recipientType: 'email' | 'phone';
  recipient: string;
  senderName: string;
  gemAmount: number;
  giftCode: string;
  message?: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipientType, recipient, senderName, gemAmount, giftCode, message }: GiftNotificationRequest = await req.json();

    if (!recipient || !senderName || !gemAmount || !giftCode) {
      throw new Error('Missing required fields');
    }

    if (recipientType === 'email') {
      // Send email notification via Resend
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (!resendApiKey) {
        console.error('RESEND_API_KEY not configured');
        return new Response(JSON.stringify({ error: 'Email service not configured' }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const resend = new Resend(resendApiKey);
      
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>You've Received CardBoom Gems!</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0b; color: #ffffff; margin: 0; padding: 40px 20px;">
          <div style="max-width: 500px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #333;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #38bdf8; font-size: 28px; margin: 0;">🎁 You've Received a Gift!</h1>
            </div>
            
            <p style="font-size: 18px; color: #e0e0e0; text-align: center; margin-bottom: 30px;">
              <strong style="color: #38bdf8;">${senderName}</strong> has sent you a gift of
            </p>
            
            <div style="text-align: center; background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%); border-radius: 12px; padding: 30px; margin-bottom: 30px;">
              <p style="font-size: 48px; font-weight: bold; color: #000; margin: 0;">💎 ${gemAmount.toLocaleString()}</p>
              <p style="font-size: 16px; color: #1a1a2e; margin: 5px 0 0 0;">CardBoom Gems</p>
            </div>
            
            ${message ? `
            <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 20px; margin-bottom: 30px;">
              <p style="color: #a0a0a0; font-size: 14px; margin: 0 0 5px 0;">Personal message:</p>
              <p style="color: #ffffff; font-style: italic; margin: 0;">"${message}"</p>
            </div>
            ` : ''}
            
            <div style="text-align: center; background: #1a1a1a; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
              <p style="color: #a0a0a0; font-size: 14px; margin: 0 0 10px 0;">Your Gift Code:</p>
              <p style="font-size: 24px; font-family: monospace; font-weight: bold; color: #38bdf8; letter-spacing: 2px; margin: 0;">${giftCode}</p>
            </div>
            
            <div style="text-align: center;">
              <a href="https://cardboom.app/gems" style="display: inline-block; background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%); color: #000; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Claim Your Gems
              </a>
            </div>
            
            <p style="text-align: center; color: #666; font-size: 12px; margin-top: 30px;">
              This gift card expires in 1 year. Visit CardBoom to claim your gems!
            </p>
          </div>
        </body>
        </html>
      `;

      const emailResponse = await resend.emails.send({
        from: "CardBoom <noreply@updates.cardboom.com>",
        to: [recipient],
        subject: `🎁 ${senderName} sent you ${gemAmount.toLocaleString()} CardBoom Gems!`,
        html: emailHtml,
      });

      console.log("Gift email sent successfully:", emailResponse);
      return new Response(JSON.stringify({ success: true, type: 'email', response: emailResponse }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
      
    } else if (recipientType === 'phone') {
      // Send SMS notification via Twilio
      const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const twilioFromNumber = Deno.env.get("TWILIO_FROM_NUMBER");

      if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
        console.error('Twilio credentials not configured');
        return new Response(JSON.stringify({ error: 'SMS service not configured' }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const smsBody = `🎁 ${senderName} sent you ${gemAmount.toLocaleString()} CardBoom Gems! Use code: ${giftCode} at cardboom.app/gems to claim.${message ? ` Message: "${message}"` : ''}`;

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
      const authHeader = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

      const formData = new URLSearchParams();
      formData.append("To", recipient);
      formData.append("From", twilioFromNumber);
      formData.append("Body", smsBody);

      const twilioResponse = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${authHeader}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const twilioData = await twilioResponse.json();

      if (!twilioResponse.ok) {
        console.error('Twilio error:', twilioData);
        throw new Error(twilioData.message || 'Failed to send SMS');
      }

      console.log("Gift SMS sent successfully:", twilioData.sid);
      return new Response(JSON.stringify({ success: true, type: 'sms', sid: twilioData.sid }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid recipient type' }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-gift-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);