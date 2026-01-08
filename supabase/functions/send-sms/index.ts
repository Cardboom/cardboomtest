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

// Language messages based on country code
const messages: Record<string, Record<string, (otp: string) => string>> = {
  tr: {
    verification: (otp) => `CardBoom: Doğrulama kodunuz ${otp}. 10 dakika geçerlidir. Bu kodu kimseyle paylaşmayın.`,
    password_reset: (otp) => `CardBoom: Şifre sıfırlama kodunuz ${otp}. 10 dakika geçerlidir. Bu talebi siz yapmadıysanız dikkate almayın.`,
    login_otp: (otp) => `CardBoom: Giriş kodunuz ${otp}. 10 dakika geçerlidir. Bu kodu kimseyle paylaşmayın.`,
  },
  en: {
    verification: (otp) => `CardBoom: Your verification code is ${otp}. Valid for 10 minutes. Do not share this code.`,
    password_reset: (otp) => `CardBoom: Your password reset code is ${otp}. Valid for 10 minutes. If you didn't request this, ignore this message.`,
    login_otp: (otp) => `CardBoom: Your login code is ${otp}. Valid for 10 minutes. Do not share this code.`,
  },
  de: {
    verification: (otp) => `CardBoom: Ihr Bestätigungscode lautet ${otp}. Gültig für 10 Minuten. Teilen Sie diesen Code nicht.`,
    password_reset: (otp) => `CardBoom: Ihr Passwort-Reset-Code lautet ${otp}. Gültig für 10 Minuten. Ignorieren Sie diese Nachricht, wenn Sie dies nicht angefordert haben.`,
    login_otp: (otp) => `CardBoom: Ihr Login-Code lautet ${otp}. Gültig für 10 Minuten. Teilen Sie diesen Code nicht.`,
  },
  fr: {
    verification: (otp) => `CardBoom: Votre code de vérification est ${otp}. Valide 10 minutes. Ne partagez pas ce code.`,
    password_reset: (otp) => `CardBoom: Votre code de réinitialisation est ${otp}. Valide 10 minutes. Ignorez si vous n'avez pas fait cette demande.`,
    login_otp: (otp) => `CardBoom: Votre code de connexion est ${otp}. Valide 10 minutes. Ne partagez pas ce code.`,
  },
  es: {
    verification: (otp) => `CardBoom: Tu código de verificación es ${otp}. Válido por 10 minutos. No compartas este código.`,
    password_reset: (otp) => `CardBoom: Tu código de recuperación es ${otp}. Válido por 10 minutos. Ignora si no lo solicitaste.`,
    login_otp: (otp) => `CardBoom: Tu código de acceso es ${otp}. Válido por 10 minutos. No compartas este código.`,
  },
  ja: {
    verification: (otp) => `CardBoom: 認証コードは${otp}です。10分間有効です。このコードを共有しないでください。`,
    password_reset: (otp) => `CardBoom: パスワードリセットコードは${otp}です。10分間有効です。リクエストしていない場合は無視してください。`,
    login_otp: (otp) => `CardBoom: ログインコードは${otp}です。10分間有効です。このコードを共有しないでください。`,
  },
  ko: {
    verification: (otp) => `CardBoom: 인증 코드는 ${otp}입니다. 10분간 유효합니다. 이 코드를 공유하지 마세요.`,
    password_reset: (otp) => `CardBoom: 비밀번호 재설정 코드는 ${otp}입니다. 10분간 유효합니다. 요청하지 않았다면 무시하세요.`,
    login_otp: (otp) => `CardBoom: 로그인 코드는 ${otp}입니다. 10분간 유효합니다. 이 코드를 공유하지 마세요.`,
  },
  zh: {
    verification: (otp) => `CardBoom: 您的验证码是 ${otp}。有效期10分钟。请勿分享此代码。`,
    password_reset: (otp) => `CardBoom: 您的密码重置码是 ${otp}。有效期10分钟。如果您没有请求，请忽略。`,
    login_otp: (otp) => `CardBoom: 您的登录码是 ${otp}。有效期10分钟。请勿分享此代码。`,
  },
};

// Map country codes to languages
const countryCodeToLanguage: Record<string, string> = {
  "90": "tr",   // Turkey
  "1": "en",    // USA/Canada
  "44": "en",   // UK
  "49": "de",   // Germany
  "43": "de",   // Austria
  "41": "de",   // Switzerland (default to German)
  "33": "fr",   // France
  "32": "fr",   // Belgium (default to French)
  "34": "es",   // Spain
  "52": "es",   // Mexico
  "54": "es",   // Argentina
  "81": "ja",   // Japan
  "82": "ko",   // South Korea
  "86": "zh",   // China
  "852": "zh",  // Hong Kong
  "886": "zh",  // Taiwan
};

function getLanguageFromPhone(phone: string): string {
  // Remove the + prefix
  const cleanPhone = phone.replace("+", "");
  
  // Check 3-digit codes first, then 2-digit, then 1-digit
  for (const digits of [3, 2, 1]) {
    const code = cleanPhone.substring(0, digits);
    if (countryCodeToLanguage[code]) {
      return countryCodeToLanguage[code];
    }
  }
  
  return "en"; // Default to English
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
    
    // Ensure the phone starts with +
    if (!formattedPhone.startsWith("+")) {
      // If starts with 0, assume Turkish number
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "+90" + formattedPhone.slice(1);
      } else {
        // Default to adding + if it looks like an international number
        formattedPhone = "+" + formattedPhone;
      }
    }

    // Basic E.164 validation: must start with + followed by digits
    const phoneRegex = /^\+[1-9][0-9]{7,14}$/;
    if (!phoneRegex.test(formattedPhone)) {
      throw new Error("Invalid phone number format. Please include country code (e.g., +90 for Turkey)");
    }

    // Detect language from phone number
    const language = getLanguageFromPhone(formattedPhone);
    console.log("Sending SMS to:", formattedPhone, "in language:", language);

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

    // Get localized message
    const langMessages = messages[language] || messages.en;
    const message = langMessages[type](otp);

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