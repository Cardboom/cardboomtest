import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type OTPType = "verification" | "password_reset" | "login_otp";
type NotificationType = "item_sold" | "grading_complete" | "offer_accepted";
type SMSType = OTPType | NotificationType;

interface SMSRequest {
  phone: string;
  type: SMSType;
  userId?: string;
  data?: {
    item_title?: string;
    sale_price?: string;
    grade?: string;
    psa_range?: string;
    offer_amount?: number;
    currency?: string;
  };
}

// OTP messages (require code parameter)
const otpMessages: Record<string, Record<OTPType, (otp: string) => string>> = {
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

// Notification messages (use data parameters)
const notificationMessages: Record<string, Record<NotificationType, (data: SMSRequest['data']) => string>> = {
  tr: {
    item_sold: (data) => `CardBoom: 🎉 Ürününüz satıldı! "${data?.item_title || 'Ürün'}" ${data?.sale_price || ''} fiyatına satıldı. Detaylar için uygulamayı açın.`,
    grading_complete: (data) => `CardBoom: Derecelendirme tamamlandı! Kartınız ${data?.grade || 'N/A'}/10 aldı (${data?.psa_range || 'N/A'}). Detaylar için uygulamayı açın.`,
    offer_accepted: (data) => `CardBoom: 🎉 Teklifiniz kabul edildi! ${data?.currency === 'TRY' ? '₺' : data?.currency === 'EUR' ? '€' : '$'}${data?.offer_amount?.toLocaleString() || ''} tutarındaki teklifiniz onaylandı. Ödemenizi tamamlamak için uygulamayı açın.`,
  },
  en: {
    item_sold: (data) => `CardBoom: 🎉 Your item sold! "${data?.item_title || 'Item'}" sold for ${data?.sale_price || ''}. Open the app for details.`,
    grading_complete: (data) => `CardBoom: Grading complete! Your card received ${data?.grade || 'N/A'}/10 (${data?.psa_range || 'N/A'}). Open the app for details.`,
    offer_accepted: (data) => `CardBoom: 🎉 Your offer was accepted! Your ${data?.currency === 'TRY' ? '₺' : data?.currency === 'EUR' ? '€' : '$'}${data?.offer_amount?.toLocaleString() || ''} offer was approved. Open the app to complete your purchase.`,
  },
  de: {
    item_sold: (data) => `CardBoom: 🎉 Ihr Artikel wurde verkauft! "${data?.item_title || 'Artikel'}" für ${data?.sale_price || ''} verkauft. Öffnen Sie die App für Details.`,
    grading_complete: (data) => `CardBoom: Bewertung abgeschlossen! Ihre Karte erhielt ${data?.grade || 'N/A'}/10 (${data?.psa_range || 'N/A'}). Öffnen Sie die App.`,
    offer_accepted: (data) => `CardBoom: 🎉 Ihr Angebot wurde angenommen! Ihr Angebot von ${data?.currency === 'TRY' ? '₺' : data?.currency === 'EUR' ? '€' : '$'}${data?.offer_amount?.toLocaleString() || ''} wurde akzeptiert. Öffnen Sie die App.`,
  },
  fr: {
    item_sold: (data) => `CardBoom: 🎉 Votre article a été vendu! "${data?.item_title || 'Article'}" vendu pour ${data?.sale_price || ''}. Ouvrez l'app pour les détails.`,
    grading_complete: (data) => `CardBoom: Notation terminée! Votre carte a reçu ${data?.grade || 'N/A'}/10 (${data?.psa_range || 'N/A'}). Ouvrez l'app.`,
    offer_accepted: (data) => `CardBoom: 🎉 Votre offre a été acceptée! Votre offre de ${data?.currency === 'TRY' ? '₺' : data?.currency === 'EUR' ? '€' : '$'}${data?.offer_amount?.toLocaleString() || ''} a été approuvée. Ouvrez l'app.`,
  },
  es: {
    item_sold: (data) => `CardBoom: 🎉 Tu artículo se vendió! "${data?.item_title || 'Artículo'}" vendido por ${data?.sale_price || ''}. Abre la app para detalles.`,
    grading_complete: (data) => `CardBoom: Calificación completa! Tu carta recibió ${data?.grade || 'N/A'}/10 (${data?.psa_range || 'N/A'}). Abre la app.`,
    offer_accepted: (data) => `CardBoom: 🎉 Tu oferta fue aceptada! Tu oferta de ${data?.currency === 'TRY' ? '₺' : data?.currency === 'EUR' ? '€' : '$'}${data?.offer_amount?.toLocaleString() || ''} fue aprobada. Abre la app.`,
  },
  ja: {
    item_sold: (data) => `CardBoom: 🎉 商品が売れました！「${data?.item_title || '商品'}」が${data?.sale_price || ''}で売れました。アプリで詳細を確認。`,
    grading_complete: (data) => `CardBoom: グレーディング完了！カードは${data?.grade || 'N/A'}/10（${data?.psa_range || 'N/A'}）を獲得。アプリで確認。`,
    offer_accepted: (data) => `CardBoom: 🎉 オファーが承認されました！${data?.currency === 'TRY' ? '₺' : data?.currency === 'EUR' ? '€' : '$'}${data?.offer_amount?.toLocaleString() || ''}のオファーが承認されました。アプリを開いて購入を完了してください。`,
  },
  ko: {
    item_sold: (data) => `CardBoom: 🎉 상품이 판매되었습니다! "${data?.item_title || '상품'}"이 ${data?.sale_price || ''}에 판매되었습니다. 앱에서 확인하세요.`,
    grading_complete: (data) => `CardBoom: 그레이딩 완료! 카드가 ${data?.grade || 'N/A'}/10 (${data?.psa_range || 'N/A'})을 받았습니다. 앱에서 확인.`,
    offer_accepted: (data) => `CardBoom: 🎉 제안이 수락되었습니다! ${data?.currency === 'TRY' ? '₺' : data?.currency === 'EUR' ? '€' : '$'}${data?.offer_amount?.toLocaleString() || ''} 제안이 승인되었습니다. 앱에서 구매를 완료하세요.`,
  },
  zh: {
    item_sold: (data) => `CardBoom: 🎉 您的商品已售出！"${data?.item_title || '商品'}"以${data?.sale_price || ''}售出。打开应用查看详情。`,
    grading_complete: (data) => `CardBoom: 评级完成！您的卡片获得${data?.grade || 'N/A'}/10（${data?.psa_range || 'N/A'}）。打开应用查看。`,
    offer_accepted: (data) => `CardBoom: 🎉 您的报价已被接受！您的${data?.currency === 'TRY' ? '₺' : data?.currency === 'EUR' ? '€' : '$'}${data?.offer_amount?.toLocaleString() || ''}报价已获批准。打开应用完成购买。`,
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
  const cleanPhone = phone.replace("+", "");
  
  for (const digits of [3, 2, 1]) {
    const code = cleanPhone.substring(0, digits);
    if (countryCodeToLanguage[code]) {
      return countryCodeToLanguage[code];
    }
  }
  
  return "en";
}

function isOTPType(type: SMSType): type is OTPType {
  return ["verification", "password_reset", "login_otp"].includes(type);
}

serve(async (req) => {
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

    const { phone, type, userId, data }: SMSRequest = await req.json();

    if (!phone || !type) {
      throw new Error("Missing required fields: phone and type");
    }

    // Format phone number to E.164 format
    let formattedPhone = phone.trim();
    
    if (!formattedPhone.startsWith("+")) {
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "+90" + formattedPhone.slice(1);
      } else {
        formattedPhone = "+" + formattedPhone;
      }
    }

    const phoneRegex = /^\+[1-9][0-9]{7,14}$/;
    if (!phoneRegex.test(formattedPhone)) {
      throw new Error("Invalid phone number format. Please include country code (e.g., +90 for Turkey)");
    }

    const language = getLanguageFromPhone(formattedPhone);
    console.log("Sending SMS to:", formattedPhone, "in language:", language, "type:", type);

    const supabaseUrl = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let message: string;

    if (isOTPType(type)) {
      // OTP flow: generate and store code
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await supabase
        .from("sms_otps")
        .delete()
        .lt("expires_at", new Date().toISOString());

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

      const langMessages = otpMessages[language] || otpMessages.en;
      message = langMessages[type](otp);
    } else {
      // Notification flow: use data parameters
      const langMessages = notificationMessages[language] || notificationMessages.en;
      message = langMessages[type](data);
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
        message: isOTPType(type) ? "Verification code sent" : "Notification sent",
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