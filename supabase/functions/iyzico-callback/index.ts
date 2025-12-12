import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const IYZICO_API_KEY = Deno.env.get('IYZICO_API_KEY')!;
const IYZICO_SECRET_KEY = Deno.env.get('IYZICO_SECRET_KEY')!;
const IYZICO_BASE_URL = 'https://api.iyzipay.com';

// Generate iyzico authorization header
function generateAuthorizationHeader(
  apiKey: string,
  secretKey: string,
  randomString: string,
  request: string
): string {
  const encoder = new TextEncoder();
  const hashInput = randomString + request;
  
  let hash = 0;
  const data = encoder.encode(hashInput);
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data[i];
    hash = hash & hash;
  }
  
  const hashString = Math.abs(hash).toString(16);
  const authString = apiKey + randomString + secretKey + hashString;
  
  const base64 = btoa(authString);
  return `IYZWS ${apiKey}:${base64}`;
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

    // Get pending payment
    const { data: pendingPayment, error: fetchError } = await supabase
      .from('pending_payments')
      .select('*')
      .eq('conversation_id', conversationId)
      .single();

    if (fetchError || !pendingPayment) {
      console.error('Pending payment not found:', conversationId);
      return redirectWithError(frontendUrl, 'Payment record not found');
    }

    // Check if 3DS was successful (mdStatus = 1 means success)
    if (status !== 'success' || mdStatus !== '1') {
      console.log('3DS verification failed:', { status, mdStatus });
      
      await supabase
        .from('pending_payments')
        .update({ status: 'failed' })
        .eq('conversation_id', conversationId);

      return redirectWithError(frontendUrl, '3DS verification failed');
    }

    // Complete the 3DS payment
    const completeRequest = {
      locale: 'en',
      conversationId,
      paymentId
    };

    const randomString = Date.now().toString();
    const requestBody = JSON.stringify(completeRequest);

    console.log('Completing 3DS payment...');

    const response = await fetch(`${IYZICO_BASE_URL}/payment/3dsecure/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': generateAuthorizationHeader(IYZICO_API_KEY, IYZICO_SECRET_KEY, randomString, requestBody),
        'x-iyzi-rnd': randomString
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
