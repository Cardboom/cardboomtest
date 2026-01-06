import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Trim any whitespace from secrets that could corrupt the signature
const IYZICO_API_KEY = (Deno.env.get('IYZICO_API_KEY') || '').trim();
const IYZICO_SECRET_KEY = (Deno.env.get('IYZICO_SECRET_KEY') || '').trim();
// Remove trailing slash from base URL if present
const IYZICO_BASE_URL = (Deno.env.get('IYZICO_BASE_URL') || 'https://api.iyzipay.com').replace(/\/$/, '').trim();

// Generate iyzico authorization header using HMAC-SHA256 (V2 format - recommended for production)
// Formula: HMACSHA256(randomKey + uriPath + requestBody, secretKey)
// Header: IYZWSv2 base64("apiKey:" + apiKey + "&randomKey:" + randomKey + "&signature:" + signature)
async function generateAuthorizationV2(
  apiKey: string,
  secretKey: string,
  randomKey: string,
  uriPath: string,
  requestBody: string
): Promise<string> {
  const encoder = new TextEncoder();
  
  // HMAC-SHA256: sign(randomKey + uriPath + requestBody, secretKey)
  const dataToSign = randomKey + uriPath + requestBody;
  
  console.log('[iyzico-init-3ds] V2 Auth - Data to sign length:', dataToSign.length);
  console.log('[iyzico-init-3ds] V2 Auth - URI Path:', uriPath);
  console.log('[iyzico-init-3ds] V2 Auth - Random Key:', randomKey);
  
  // Import the secret key for HMAC
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Create HMAC signature
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(dataToSign));
  const signatureArray = new Uint8Array(signatureBuffer);
  
  // Convert to hex string
  const signatureHex = Array.from(signatureArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  console.log('[iyzico-init-3ds] V2 Auth - Signature (hex):', signatureHex.substring(0, 32) + '...');
  
  // Build the authorization string
  const authString = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signatureHex}`;
  const authBase64 = btoa(authString);
  
  console.log('[iyzico-init-3ds] Using V2 HMAC-SHA256 auth format');
  
  return `IYZWSv2 ${authBase64}`;
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
      amountUSD, // Amount in USD for wallet credit
      paymentCurrency = 'TRY', // Currency to charge the card in (TRY or USD)
      tryRate = 38, // Exchange rate if paying in TRY
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
    if (typeof amountUSD !== 'number' || isNaN(amountUSD) || amountUSD < 10 || amountUSD > 10000) {
      throw new Error('Invalid amount. Must be between $10 and $10,000');
    }

    const feePercent = 0.065;
    const flatFee = 0.50;
    const feeUSD = (amountUSD * feePercent) + flatFee;
    const totalUSD = amountUSD + feeUSD;
    
    // Calculate payment amount based on currency
    const paymentAmount = paymentCurrency === 'TRY' ? totalUSD * tryRate : totalUSD;
    const currency = paymentCurrency === 'TRY' ? 'TRY' : 'USD';
    
    const conversationId = `topup_${user.id.substring(0, 8)}_${Date.now()}`;
    const basketId = `basket_${Date.now()}`;

    console.log('[iyzico-init-3ds] Processing payment:', { 
      amountUSD, 
      feeUSD, 
      totalUSD, 
      paymentCurrency: currency,
      paymentAmount,
      tryRate,
      userId: user.id 
    });
    console.log('[iyzico-init-3ds] Using base URL:', IYZICO_BASE_URL);

    const { error: insertError } = await supabase
      .from('pending_payments')
      .insert({
        user_id: user.id,
        amount: amountUSD, // Store in USD
        fee: feeUSD,
        total: totalUSD,
        conversation_id: conversationId,
        status: 'pending'
      });

    if (insertError) {
      console.error('[iyzico-init-3ds] Error inserting pending payment:', insertError);
      throw new Error('Failed to create pending payment');
    }

    const callbackUrl = `${supabaseUrl}/functions/v1/iyzico-callback`;
    
    // Format price - remove trailing zeros as per iyzico documentation
    const formatPrice = (price: number): string => {
      const fixed = price.toFixed(2);
      // Remove trailing zeros: 10.00 -> 10, 10.50 -> 10.5
      return parseFloat(fixed).toString();
    };
    
    // Build request object with correct currency
    const iyzicoRequest = {
      locale: 'en',
      conversationId: conversationId,
      price: formatPrice(paymentAmount),
      paidPrice: formatPrice(paymentAmount),
      installment: 1,
      paymentChannel: 'WEB',
      basketId: basketId,
      paymentGroup: 'PRODUCT',
      callbackUrl: callbackUrl,
      currency: currency, // TRY for Turkish cards, USD for international
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
          price: formatPrice(paymentAmount),
          name: 'Wallet Top-up',
          category1: 'Digital',
          category2: 'Wallet',
          itemType: 'VIRTUAL'
        }
      ]
    };

    console.log('[iyzico-init-3ds] Callback URL:', callbackUrl);
    console.log('[iyzico-init-3ds] Currency:', currency);
    console.log('[iyzico-init-3ds] Payment amount:', formatPrice(paymentAmount));

    const randomKey = Date.now().toString() + Math.random().toString(36).substring(2, 15);
    const uriPath = '/payment/3dsecure/initialize';
    const requestBody = JSON.stringify(iyzicoRequest);
    
    const authorization = await generateAuthorizationV2(
      IYZICO_API_KEY, 
      IYZICO_SECRET_KEY, 
      randomKey, 
      uriPath, 
      requestBody
    );
    
    console.log('[iyzico-init-3ds] Random key:', randomKey);
    console.log('[iyzico-init-3ds] API Key (first 10):', IYZICO_API_KEY?.substring(0, 10) + '...');
    console.log('[iyzico-init-3ds] Secret Key length:', IYZICO_SECRET_KEY?.length);

    const response = await fetch(`${IYZICO_BASE_URL}${uriPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization,
        'x-iyzi-rnd': randomKey,
        'Accept': 'application/json'
      },
      body: requestBody
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
