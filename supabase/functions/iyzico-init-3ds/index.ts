import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const IYZICO_API_KEY = (Deno.env.get('IYZICO_API_KEY') || '').trim();
const IYZICO_SECRET_KEY = (Deno.env.get('IYZICO_SECRET_KEY') || '').trim();
const IYZICO_BASE_URL = (Deno.env.get('IYZICO_BASE_URL') || 'https://api.iyzipay.com').replace(/\/$/, '').trim();

async function generateAuthorizationV2(
  apiKey: string,
  secretKey: string,
  randomKey: string,
  uriPath: string,
  requestBody: string
): Promise<string> {
  const encoder = new TextEncoder();
  const dataToSign = randomKey + uriPath + requestBody;
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(dataToSign));
  const signatureArray = new Uint8Array(signatureBuffer);
  const signatureHex = Array.from(signatureArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const authString = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signatureHex}`;
  const authBase64 = btoa(authString);
  
  return `IYZWSv2 ${authBase64}`;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
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
      amountUSD,
      paymentCurrency = 'TRY',
      tryRate = 38,
      // New card fields
      cardHolderName, 
      cardNumber, 
      expireMonth, 
      expireYear, 
      cvc,
      // Saved card fields
      useSavedCard = false,
      cardToken,
      cardUserKey,
      // Save card option
      saveCard = false,
      cardLabel,
      // Buyer details
      buyerName,
      buyerSurname,
      buyerEmail,
      buyerPhone,
      buyerAddress,
      buyerCity,
      buyerCountry,
      buyerZipCode,
      buyerIp,
      // Direct purchase (optional)
      directPurchase = false,
      listingId,
      sellerId,
    } = await req.json();

    // Validate amount
    if (typeof amountUSD !== 'number' || isNaN(amountUSD) || amountUSD < 10 || amountUSD > 10000) {
      throw new Error('Invalid amount. Must be between $10 and $10,000');
    }

    // Fee structure: USD = 6.5%, TRY/local currencies = 12%
    const feePercent = paymentCurrency === 'USD' ? 0.065 : 0.12;
    const flatFee = 0.50;
    const feeUSD = (amountUSD * feePercent) + flatFee;
    const totalUSD = amountUSD + feeUSD;
    
    // Use consistent rate - default to 45.01 TRY/USD if not provided
    const effectiveTryRate = tryRate || 45.01;
    const paymentAmount = paymentCurrency === 'TRY' ? totalUSD * effectiveTryRate : totalUSD;
    const currency = paymentCurrency === 'TRY' ? 'TRY' : 'USD';
    
    const conversationId = `topup_${user.id.substring(0, 8)}_${Date.now()}`;
    const basketId = `basket_${Date.now()}`;

    console.log('[iyzico-init-3ds] Processing payment:', { 
      amountUSD, 
      feeUSD, 
      totalUSD, 
      paymentCurrency: currency,
      paymentAmount,
      useSavedCard,
      saveCard,
      userId: user.id 
    });

    const { error: insertError } = await supabase
      .from('pending_payments')
      .insert({
        user_id: user.id,
        amount: amountUSD,
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
    
    const formatPrice = (price: number): string => {
      const fixed = price.toFixed(2);
      return parseFloat(fixed).toString();
    };
    
    // Build payment card object based on whether using saved card or new card
    let paymentCard: Record<string, any>;
    
    if (useSavedCard && cardToken && cardUserKey) {
      // Use saved card token
      paymentCard = {
        cardToken: cardToken,
        cardUserKey: cardUserKey,
      };
      console.log('[iyzico-init-3ds] Using saved card token');
    } else {
      // Use new card details
      paymentCard = {
        cardHolderName: cardHolderName,
        cardNumber: cardNumber.replace(/\s/g, ''),
        expireYear: expireYear.length === 2 ? `20${expireYear}` : expireYear,
        expireMonth: expireMonth.padStart(2, '0'),
        cvc: cvc,
        registerCard: saveCard ? 1 : 0,
      };
      console.log('[iyzico-init-3ds] Using new card, registerCard:', saveCard ? 1 : 0);
    }

    const iyzicoRequest: Record<string, any> = {
      locale: 'en',
      conversationId: conversationId,
      price: formatPrice(paymentAmount),
      paidPrice: formatPrice(paymentAmount),
      installment: 1,
      paymentChannel: 'WEB',
      basketId: basketId,
      paymentGroup: 'PRODUCT',
      callbackUrl: callbackUrl,
      currency: currency,
      paymentCard: paymentCard,
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

    // Store metadata for callback to use (card label, save preference)
    if (saveCard && cardLabel) {
      await supabase
        .from('pending_payments')
        .update({ 
          metadata: { 
            saveCard: true, 
            cardLabel: cardLabel,
            directPurchase,
            listingId,
            sellerId,
          } 
        })
        .eq('conversation_id', conversationId);
    }

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
