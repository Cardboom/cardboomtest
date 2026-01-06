import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const IYZICO_API_KEY = Deno.env.get('IYZICO_API_KEY')!;
const IYZICO_SECRET_KEY = Deno.env.get('IYZICO_SECRET_KEY')!;
const IYZICO_BASE_URL = Deno.env.get('IYZICO_BASE_URL') || 'https://sandbox-api.iyzipay.com';

// Generate PKI string from object (iyzico specific format)
// Keys must be in the EXACT order iyzico expects, not alphabetical
function generatePkiString(obj: Record<string, unknown>): string {
  let result = '[';
  
  const entries = Object.entries(obj);
  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];
    if (value === null || value === undefined) continue;
    
    if (Array.isArray(value)) {
      result += `${key}=[`;
      for (let j = 0; j < value.length; j++) {
        const item = value[j];
        if (typeof item === 'object' && item !== null) {
          result += generatePkiString(item as Record<string, unknown>);
        } else {
          result += String(item);
        }
        if (j < value.length - 1) {
          result += ', ';
        }
      }
      result += ']';
    } else if (typeof value === 'object') {
      result += `${key}=${generatePkiString(value as Record<string, unknown>)}`;
    } else {
      result += `${key}=${value}`;
    }
    
    if (i < entries.length - 1) {
      result += ',';
    }
  }
  
  result += ']';
  return result;
}

// Generate iyzico authorization header using SHA1 (V1 format)
// This is the tried and tested format used by the official SDK
async function generateAuthorizationV1(
  apiKey: string,
  secretKey: string,
  randomString: string,
  pkiString: string
): Promise<string> {
  const encoder = new TextEncoder();
  
  // hashString = apiKey + randomString + secretKey + pkiString
  const hashInput = apiKey + randomString + secretKey + pkiString;
  const hashBuffer = await crypto.subtle.digest('SHA-1', encoder.encode(hashInput));
  const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  
  console.log('[iyzico-init-3ds] Using V1 SHA1 auth format');
  console.log('[iyzico-init-3ds] PKI string length:', pkiString.length);
  console.log('[iyzico-init-3ds] PKI string (first 100 chars):', pkiString.substring(0, 100) + '...');
  
  return `IYZWS ${apiKey}:${hashBase64}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { 
      amount, 
      cardHolderName, 
      cardNumber, 
      expireMonth, 
      expireYear, 
      cvc,
      buyerName,
      buyerSurname,
      buyerEmail,
      buyerPhone,
      buyerAddress,
      buyerCity,
      buyerCountry,
      buyerZipCode,
      buyerIp
    } = await req.json();

    // Validate amount
    if (typeof amount !== 'number' || isNaN(amount) || amount < 10 || amount > 10000) {
      throw new Error('Invalid amount. Must be between $10 and $10,000');
    }

    const feePercent = 0.065;
    const flatFee = 0.50;
    const fee = (amount * feePercent) + flatFee;
    const total = amount + fee;
    const conversationId = `topup_${user.id.substring(0, 8)}_${Date.now()}`;
    const basketId = `basket_${Date.now()}`;

    console.log('[iyzico-init-3ds] Processing payment:', { amount, fee, total, userId: user.id });
    console.log('[iyzico-init-3ds] Using base URL:', IYZICO_BASE_URL);

    const { error: insertError } = await supabase
      .from('pending_payments')
      .insert({
        user_id: user.id,
        amount,
        fee,
        total,
        conversation_id: conversationId,
        status: 'pending'
      });

    if (insertError) {
      console.error('[iyzico-init-3ds] Error inserting pending payment:', insertError);
      throw new Error('Failed to create pending payment');
    }

    const callbackUrl = `${supabaseUrl}/functions/v1/iyzico-callback`;
    
    // Build request object with fields in the EXACT order iyzico expects
    // The order matters for PKI string generation!
    const iyzicoRequest = {
      locale: 'en',
      conversationId: conversationId,
      price: total.toFixed(2),
      paidPrice: total.toFixed(2),
      installment: 1,
      paymentChannel: 'WEB',
      basketId: basketId,
      paymentGroup: 'PRODUCT',
      callbackUrl: callbackUrl,
      currency: 'USD',
      paymentCard: {
        cardHolderName: cardHolderName,
        cardNumber: cardNumber.replace(/\s/g, ''),
        expireYear: expireYear.length === 2 ? `20${expireYear}` : expireYear,
        expireMonth: expireMonth.padStart(2, '0'),
        cvc: cvc,
        registerCard: 0
      },
      buyer: {
        id: user.id.substring(0, 20),
        name: buyerName || 'Test',
        surname: buyerSurname || 'User',
        identityNumber: '11111111111',
        email: buyerEmail || user.email || 'test@test.com',
        gsmNumber: buyerPhone || '+905000000000',
        registrationDate: '2013-04-21 15:12:09',
        lastLoginDate: '2015-10-05 12:43:35',
        registrationAddress: buyerAddress || 'Test Address',
        city: buyerCity || 'Istanbul',
        country: buyerCountry || 'Turkey',
        zipCode: buyerZipCode || '34000',
        ip: buyerIp || '85.34.78.112'
      },
      shippingAddress: {
        address: buyerAddress || 'Test Address',
        zipCode: buyerZipCode || '34000',
        contactName: `${buyerName || 'Test'} ${buyerSurname || 'User'}`,
        city: buyerCity || 'Istanbul',
        country: buyerCountry || 'Turkey'
      },
      billingAddress: {
        address: buyerAddress || 'Test Address',
        zipCode: buyerZipCode || '34000',
        contactName: `${buyerName || 'Test'} ${buyerSurname || 'User'}`,
        city: buyerCity || 'Istanbul',
        country: buyerCountry || 'Turkey'
      },
      basketItems: [
        {
          id: 'wallet_topup',
          price: total.toFixed(2),
          name: 'Wallet Top-up',
          category1: 'Digital',
          category2: 'Wallet',
          itemType: 'VIRTUAL'
        }
      ]
    };

    console.log('[iyzico-init-3ds] Callback URL:', callbackUrl);

    const randomString = Date.now().toString();
    const pkiString = generatePkiString(iyzicoRequest);
    const authorization = await generateAuthorizationV1(IYZICO_API_KEY, IYZICO_SECRET_KEY, randomString, pkiString);
    
    console.log('[iyzico-init-3ds] Random string:', randomString);
    console.log('[iyzico-init-3ds] API Key (first 10):', IYZICO_API_KEY?.substring(0, 10) + '...');
    console.log('[iyzico-init-3ds] Secret Key configured:', !!IYZICO_SECRET_KEY);

    const response = await fetch(`${IYZICO_BASE_URL}/payment/3dsecure/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization,
        'x-iyzi-rnd': randomString,
        'Accept': 'application/json'
      },
      body: JSON.stringify(iyzicoRequest)
    });

    const data = await response.json();
    console.log('[iyzico-init-3ds] Response status:', data.status);
    console.log('[iyzico-init-3ds] Response errorCode:', data.errorCode);
    console.log('[iyzico-init-3ds] Response errorMessage:', data.errorMessage);

    if (data.status !== 'success') {
      console.error('[iyzico-init-3ds] Payment failed:', data.errorMessage, data.errorCode);
      
      await supabase
        .from('pending_payments')
        .update({ status: 'failed' })
        .eq('conversation_id', conversationId);
      
      throw new Error(data.errorMessage || 'Payment initialization failed');
    }

    return new Response(JSON.stringify({
      success: true,
      threeDSHtmlContent: data.threeDSHtmlContent,
      conversationId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in iyzico-init-3ds:', errorMessage);
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
