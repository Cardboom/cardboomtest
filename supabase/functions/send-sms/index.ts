import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMSRequest {
  phone: string;
  type: "verification" | "password_reset" | "login_otp";
  userId?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_SENDER_ID = Deno.env.get("TWILIO_PHONE_NUMBER") || "CARDBOOM";

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      throw new Error("Missing Twilio credentials");
    }

    const { phone, type, userId }: SMSRequest = await req.json();

    if (!phone || !type) {
      throw new Error("Missing required fields: phone and type");
    }

    // Format phone number to E.164 format
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "+90" + formattedPhone.slice(1);
    } else if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+90" + formattedPhone;
    }

    // Validate Turkish phone number format
    const phoneRegex = /^\+90[5][0-9]{9}$/;
    if (!phoneRegex.test(formattedPhone)) {
      throw new Error("Invalid Turkish phone number format");
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Store OTP in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Clean up expired OTPs first
    await supabase
      .from("sms_otps")
      .delete()
      .lt("expires_at", new Date().toISOString());

    // Insert new OTP
    const { error: insertError } = await supabase
      .from("sms_otps")
      .upsert({
        phone: formattedPhone,
        otp_code: otp,
        type,
        user_id: userId || null,
        expires_at: expiresAt.toISOString(),
        verified: false,
        attempts: 0,
      }, { onConflict: "phone,type" });

    if (insertError) {
      console.error("Error storing OTP:", insertError);
      throw new Error("Failed to generate verification code");
    }

    // Compose message based on type
    let message = "";
    switch (type) {
      case "verification":
        message = `CardBoom: Your verification code is ${otp}. Valid for 10 minutes. Do not share this code.`;
        break;
      case "password_reset":
        message = `CardBoom: Your password reset code is ${otp}. Valid for 10 minutes. If you didn't request this, ignore this message.`;
        break;
      case "login_otp":
        message = `CardBoom: Your login code is ${otp}. Valid for 10 minutes. Do not share this code.`;
        break;
      default:
        message = `CardBoom: Your code is ${otp}. Valid for 10 minutes.`;
    }

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const authHeader = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: TWILIO_SENDER_ID,
        To: formattedPhone,
        Body: message,
      }),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error("Twilio error:", twilioData);
      throw new Error(twilioData.message || "Failed to send SMS");
    }

    console.log("SMS sent successfully:", twilioData.sid);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Verification code sent",
        expiresAt: expiresAt.toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-sms:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to send SMS";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
