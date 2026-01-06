import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Trim any whitespace from secrets
const IYZICO_API_KEY = (Deno.env.get('IYZICO_API_KEY') || '').trim();
const IYZICO_SECRET_KEY = (Deno.env.get('IYZICO_SECRET_KEY') || '').trim();
const IYZICO_BASE_URL = (Deno.env.get('IYZICO_BASE_URL') || 'https://api.iyzipay.com').replace(/\/$/, '').trim();

// Generate iyzico authorization header using HMAC-SHA256 (V2 format)
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
  
  // Build the authorization string
  const authString = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signatureHex}`;
  const authBase64 = btoa(authString);
  
  return `IYZWSv2 ${authBase64}`;
}

// HMAC-SHA1 signature verification for iyzico callbacks
async function verifyIyzicoSignature(
  paymentId: string,
  currency: string,
  basketId: string,
  conversationId: string,
  paidPrice: string,
  price: string,
  receivedSignature: string,
  secretKey: string
): Promise<boolean> {
  // iyzico callback signature format: paymentId:currency:basketId:conversationId:paidPrice:price:secretKey
  const signatureString = `${paymentId}:${currency}:${basketId}:${conversationId}:${paidPrice}:${price}:${secretKey}`;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureData = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signatureString)
  );
  
  // Convert to base64
  const computedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureData)));
  
  // Constant-time comparison to prevent timing attacks
  if (computedSignature.length !== receivedSignature.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < computedSignature.length; i++) {
    result |= computedSignature.charCodeAt(i) ^ receivedSignature.charCodeAt(i);
  }
  
  return result === 0;
}

// Verify payment by calling iyzico API directly
async function verifyPaymentWithIyzico(
  paymentId: string,
  conversationId: string
): Promise<{ verified: boolean; data?: any; error?: string }> {
  const retrieveRequest = {
    locale: 'en',
    conversationId,
    paymentId
  };

  const randomKey = Date.now().toString() + Math.random().toString(36).substring(2, 15);
  const uriPath = '/payment/detail';
  const requestBody = JSON.stringify(retrieveRequest);

  try {
    const authorization = await generateAuthorizationV2(IYZICO_API_KEY, IYZICO_SECRET_KEY, randomKey, uriPath, requestBody);
    
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
    console.log('Payment detail response:', data.status, data.errorMessage);
    
    if (data.status === 'success' && data.paymentId === paymentId) {
      return { verified: true, data };
    }
    
    return { verified: false, error: data.errorMessage || 'Payment verification failed' };
  } catch (error) {
    console.error('Error verifying payment with iyzico:', error);
    return { verified: false, error: 'Failed to verify payment' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const frontendUrl = supabaseUrl.replace('.supabase.co', '.lovableproject.com').replace('https://kgffwhyfgkqeevsuhldt', 'https://b56128be-ee17-48af-baa7-915f88c0900b');

  try {
    // Parse form data from iyzico callback
    const formData = await req.formData();
    const status = formData.get('status') as string;
    const paymentId = formData.get('paymentId') as string;
    const conversationId = formData.get('conversationId') as string;
    const mdStatus = formData.get('mdStatus') as string;

    console.log('iyzico callback received:', { status, paymentId, conversationId, mdStatus });

    // SECURITY: Validate required fields
    if (!conversationId || !paymentId) {
      console.error('Missing required callback parameters');
      return redirectWithError(frontendUrl, 'Invalid callback');
    }

    // SECURITY: Validate conversationId format (should start with topup_ or be a valid pattern)
    if (!conversationId.startsWith('topup_') && !conversationId.startsWith('CB-')) {
      console.error('Invalid conversationId format:', conversationId);
      return redirectWithError(frontendUrl, 'Invalid request');
    }

    // Get pending payment
    const { data: pendingPayment, error: fetchError } = await supabase
      .from('pending_payments')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('status', 'pending') // Only allow pending payments
      .single();

    if (fetchError || !pendingPayment) {
      console.error('Pending payment not found or already processed:', conversationId);
      return redirectWithError(frontendUrl, 'Payment record not found');
    }

    // SECURITY: Check if payment was already processed (idempotency)
    if (pendingPayment.status !== 'pending') {
      console.log('Payment already processed:', conversationId);
      return new Response(null, {
        status: 302,
        headers: { 'Location': `${frontendUrl}/wallet?payment=already-processed` }
      });
    }

    // Check if 3DS was successful (mdStatus = 1 means success)
    // mdStatus values: 1 = success, 2/3/4 = various failures, 0 = 3DS not applied
    if (mdStatus !== '1') {
      console.log('3DS verification failed:', { status, mdStatus });
      
      await supabase
        .from('pending_payments')
        .update({ status: 'failed' })
        .eq('conversation_id', conversationId)
        .eq('status', 'pending');

      return redirectWithError(frontendUrl, '3DS verification failed');
    }

    console.log('3DS verification successful, completing payment...');

    // Complete the 3DS payment
    const completeRequest = {
      locale: 'en',
      conversationId,
      paymentId
    };

    const randomKey = Date.now().toString() + Math.random().toString(36).substring(2, 15);
    const uriPath = '/payment/3dsecure/auth';
    const requestBody = JSON.stringify(completeRequest);

    console.log('Completing 3DS payment...');

    const authorization = await generateAuthorizationV2(IYZICO_API_KEY, IYZICO_SECRET_KEY, randomKey, uriPath, requestBody);

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
    console.log('3DS completion response:', data.status);

    if (data.status !== 'success') {
      console.error('Payment completion failed:', data.errorMessage);
      
      await supabase
        .from('pending_payments')
        .update({ status: 'failed', payment_id: paymentId })
        .eq('conversation_id', conversationId);

      return redirectWithError(frontendUrl, data.errorMessage || 'Payment failed');
    }

    // Payment successful - update wallet and create transaction
    // Get user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', pendingPayment.user_id)
      .single();

    if (walletError || !wallet) {
      console.error('Wallet not found:', pendingPayment.user_id);
      return redirectWithError(frontendUrl, 'Wallet not found');
    }

    // Update wallet balance
    const newBalance = parseFloat(wallet.balance) + parseFloat(pendingPayment.amount);
    
    const { error: updateError } = await supabase
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', wallet.id);

    if (updateError) {
      console.error('Failed to update wallet:', updateError);
      return redirectWithError(frontendUrl, 'Failed to update wallet');
    }

    // Create transaction record
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        wallet_id: wallet.id,
        type: 'topup',
        amount: pendingPayment.amount,
        fee: pendingPayment.fee,
        description: `Wallet top-up via iyzico (${paymentId})`,
        reference_id: null
      });

    if (txError) {
      console.error('Failed to create transaction:', txError);
    }

    // Update pending payment as completed
    await supabase
      .from('pending_payments')
      .update({ 
        status: 'completed', 
        payment_id: paymentId,
        completed_at: new Date().toISOString()
      })
      .eq('conversation_id', conversationId);

    console.log('Payment completed successfully!');

    // Redirect to wallet page with success
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${frontendUrl}/wallet?payment=success&amount=${pendingPayment.amount}`
      }
    });

  } catch (error) {
    console.error('Error in iyzico-callback:', error);
    return redirectWithError(frontendUrl, 'An error occurred');
  }
});

function redirectWithError(baseUrl: string, error: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      'Location': `${baseUrl}/wallet?payment=failed&error=${encodeURIComponent(error)}`
    }
  });
}
