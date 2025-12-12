import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const IYZICO_API_KEY = Deno.env.get('IYZICO_API_KEY')!;
const IYZICO_SECRET_KEY = Deno.env.get('IYZICO_SECRET_KEY')!;
const IYZICO_BASE_URL = 'https://api.iyzipay.com'; // Use sandbox.iyzipay.com for testing

// Generate iyzico authorization header
function generateAuthorizationHeader(
  apiKey: string,
  secretKey: string,
  randomString: string,
  request: string
): string {
  const encoder = new TextEncoder();
  const hashInput = randomString + request;
  
  // Create SHA1 hash
  const hashBuffer = new Uint8Array(20);
  const data = encoder.encode(hashInput);
  
  // Simple hash implementation for Deno
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data[i];
    hash = hash & hash;
  }
  
  const hashString = Math.abs(hash).toString(16);
  const authString = apiKey + randomString + secretKey + hashString;
  
  // Base64 encode
  const base64 = btoa(authString);
  return `IYZWS ${apiKey}:${base64}`;
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token
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

    const fee = amount * 0.07;
    const total = amount + fee;
    const conversationId = `topup_${user.id}_${Date.now()}`;
    const basketId = `basket_${Date.now()}`;

    // Store pending payment
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
      console.error('Error inserting pending payment:', insertError);
      throw new Error('Failed to create pending payment');
    }

    // Prepare iyzico 3DS init request
    const callbackUrl = `${supabaseUrl}/functions/v1/iyzico-callback`;
    
    const iyzicoRequest = {
      locale: 'en',
      conversationId,
      price: total.toFixed(2),
      paidPrice: total.toFixed(2),
      installment: 1,
      paymentChannel: 'WEB',
      basketId,
      paymentGroup: 'PRODUCT',
      callbackUrl,
      currency: 'TRY',
      paymentCard: {
        cardHolderName,
        cardNumber: cardNumber.replace(/\s/g, ''),
        expireYear,
        expireMonth,
        cvc
      },
      buyer: {
        id: user.id,
        name: buyerName,
        surname: buyerSurname,
        identityNumber: '11111111111', // Placeholder for iyzico requirement
        email: buyerEmail || user.email,
        gsmNumber: buyerPhone || '+905000000000',
        registrationAddress: buyerAddress || 'Not provided',
        city: buyerCity || 'Istanbul',
        country: buyerCountry || 'Turkey',
        zipCode: buyerZipCode || '34000',
        ip: buyerIp || '127.0.0.1'
      },
      shippingAddress: {
        address: buyerAddress || 'Digital Product',
        zipCode: buyerZipCode || '34000',
        contactName: `${buyerName} ${buyerSurname}`,
        city: buyerCity || 'Istanbul',
        country: buyerCountry || 'Turkey'
      },
      billingAddress: {
        address: buyerAddress || 'Digital Product',
        zipCode: buyerZipCode || '34000',
        contactName: `${buyerName} ${buyerSurname}`,
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

    console.log('Sending 3DS init request to iyzico');

    // Make request to iyzico
    const randomString = Date.now().toString();
    const requestBody = JSON.stringify(iyzicoRequest);
    
    const response = await fetch(`${IYZICO_BASE_URL}/payment/3dsecure/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': generateAuthorizationHeader(IYZICO_API_KEY, IYZICO_SECRET_KEY, randomString, requestBody),
        'x-iyzi-rnd': randomString
      },
      body: requestBody
    });

    const data = await response.json();
    console.log('iyzico response status:', data.status);

    if (data.status !== 'success') {
      console.error('iyzico error:', data.errorMessage);
      
      // Update pending payment as failed
      await supabase
        .from('pending_payments')
        .update({ status: 'failed' })
        .eq('conversation_id', conversationId);
      
      throw new Error(data.errorMessage || 'Payment initialization failed');
    }

    // Return the 3DS HTML content
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
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
