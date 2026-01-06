import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const IYZICO_API_KEY = Deno.env.get('IYZICO_API_KEY')!;
const IYZICO_SECRET_KEY = Deno.env.get('IYZICO_SECRET_KEY')!;
const IYZICO_BASE_URL = Deno.env.get('IYZICO_BASE_URL') || 'https://sandbox-api.iyzipay.com';

// Generate iyzico authorization header using HMACSHA256 (V2 format)
// Formula: HMACSHA256(randomKey + uriPath + requestBody, secretKey)
// Header: IYZWSv2 base64("apiKey:" + apiKey + "&randomKey:" + randomKey + "&signature:" + encryptedData)
async function generateAuthorizationV2(
  apiKey: string,
  secretKey: string,
  randomKey: string,
  uriPath: string,
  requestBody: string
): Promise<string> {
  const encoder = new TextEncoder();
  
  // Step 1: Generate HMAC-SHA256 signature
  // encryptedData = HMACSHA256(randomKey + uriPath + requestBody, secretKey)
  const dataToSign = randomKey + uriPath + requestBody;
  
  // Import the secret key for HMAC
  const keyData = encoder.encode(secretKey);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Sign the data
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(dataToSign));
  
  // Convert to hex string (not base64!)
  const signatureHex = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Step 2: Create base64 encoded authorization string
  // base64("apiKey:" + apiKey + "&randomKey:" + randomKey + "&signature:" + encryptedData)
  const authString = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signatureHex}`;
  const base64Encoded = btoa(authString);
  
  console.log('[iyzico-init-3ds] Using V2 HMACSHA256 auth format');
  console.log('[iyzico-init-3ds] Random key:', randomKey);
  console.log('[iyzico-init-3ds] URI path:', uriPath);
  console.log('[iyzico-init-3ds] Signature (first 20 chars):', signatureHex.substring(0, 20) + '...');
  
  // Step 3: Return authorization header
  return `IYZWSv2 ${base64Encoded}`;
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

    // Get fee rate from request (passed from frontend based on user subscription)
    const feePercent = 0.065; // Default 6.5%, frontend already calculates correct fee
    const flatFee = 0.50;
    const fee = (amount * feePercent) + flatFee;
    const total = amount + fee;
    const conversationId = `topup_${user.id.substring(0, 8)}_${Date.now()}`;
    const basketId = `basket_${Date.now()}`;

    console.log('[iyzico-init-3ds] Processing payment:', { amount, fee, total, userId: user.id });

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
    
    // iyzico expects price as string with 2 decimal places
    const iyzicoRequest: Record<string, unknown> = {
      locale: 'en',
      conversationId,
      price: total.toFixed(2),
      paidPrice: total.toFixed(2),
      installment: 1,
      paymentChannel: 'WEB',
      basketId,
      paymentGroup: 'PRODUCT',
      callbackUrl,
      currency: 'USD',
      paymentCard: {
        cardHolderName,
        cardNumber: cardNumber.replace(/\s/g, ''),
        expireYear: expireYear.length === 2 ? `20${expireYear}` : expireYear,
        expireMonth: expireMonth.padStart(2, '0'),
        cvc
      },
      buyer: {
        id: user.id.substring(0, 20),
        name: buyerName || 'Test',
        surname: buyerSurname || 'User',
        identityNumber: '11111111111',
        email: buyerEmail || user.email || 'test@test.com',
        gsmNumber: buyerPhone || '+905000000000',
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

    console.log('[iyzico-init-3ds] Sending 3DS init request to:', IYZICO_BASE_URL);
    console.log('[iyzico-init-3ds] Callback URL:', callbackUrl);

    const randomKey = Date.now().toString();
    const uriPath = '/payment/3dsecure/initialize';
    const requestBodyStr = JSON.stringify(iyzicoRequest);
    const authorization = await generateAuthorizationV2(IYZICO_API_KEY, IYZICO_SECRET_KEY, randomKey, uriPath, requestBodyStr);
    
    console.log('[iyzico-init-3ds] Random key:', randomKey);
    console.log('[iyzico-init-3ds] API Key configured:', !!IYZICO_API_KEY);
    console.log('[iyzico-init-3ds] Secret Key configured:', !!IYZICO_SECRET_KEY);

    const response = await fetch(`${IYZICO_BASE_URL}${uriPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization,
        'x-iyzi-rnd': randomKey
      },
      body: requestBodyStr
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
