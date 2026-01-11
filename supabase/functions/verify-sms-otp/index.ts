import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  phone: string;
  otp: string;
  type: "verification" | "password_reset" | "login_otp";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, otp, type }: VerifyRequest = await req.json();

    if (!phone || !otp || !type) {
      throw new Error("Missing required fields: phone, otp, and type");
    }

    // Format phone number to E.164 format (international support)
    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith("+")) {
      // If no country code prefix, add + (assumes full number provided)
      formattedPhone = "+" + formattedPhone;
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the OTP record
    const { data: otpRecord, error: fetchError } = await supabase
      .from("sms_otps")
      .select("*")
      .eq("phone", formattedPhone)
      .eq("type", type)
      .eq("verified", false)
      .single();

    if (fetchError || !otpRecord) {
      throw new Error("No pending verification found. Please request a new code.");
    }

    // Check if expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      // Delete expired OTP
      await supabase.from("sms_otps").delete().eq("id", otpRecord.id);
      throw new Error("Verification code has expired. Please request a new one.");
    }

    // Check attempts (max 5)
    if (otpRecord.attempts >= 5) {
      await supabase.from("sms_otps").delete().eq("id", otpRecord.id);
      throw new Error("Too many failed attempts. Please request a new code.");
    }

    // Verify OTP
    if (otpRecord.otp_code !== otp) {
      // Increment attempts
      await supabase
        .from("sms_otps")
        .update({ attempts: otpRecord.attempts + 1 })
        .eq("id", otpRecord.id);
      
      const remainingAttempts = 5 - (otpRecord.attempts + 1);
      throw new Error(`Invalid code. ${remainingAttempts} attempts remaining.`);
    }

    // Mark as verified
    await supabase
      .from("sms_otps")
      .update({ verified: true, verified_at: new Date().toISOString() })
      .eq("id", otpRecord.id);

    // If this is a registration verification, update user's phone_verified status
    if (type === "verification" && otpRecord.user_id) {
      await supabase
        .from("profiles")
        .update({ phone_verified: true, phone_verified_at: new Date().toISOString() })
        .eq("id", otpRecord.user_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Phone number verified successfully",
        userId: otpRecord.user_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in verify-sms-otp:", error);
    const errorMessage = error instanceof Error ? error.message : "Verification failed";
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
