import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

// Tightened CORS - only allows cardboom.com and Lovable preview URLs
const corsHeaders = getCorsHeaders();

interface PayoutItem {
  itemExternalId: string;
  recipientType: string;
  recipientInfo: string;
  amount: {
    value: number;
    currency: string;
  };
  description: string;
  recipientName: string;
}

interface UserIban {
  iban: string;
  holder_name: string;
}

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  scheduled_payout_at: string;
  is_enterprise_user: boolean;
  user_ibans: UserIban | null;
}

// Generate iyzico IYZWSv2 authorization header (HMAC-SHA256)
// According to iyzico docs: https://docs.iyzico.com/en/getting-started/preliminaries/authentication/hmacsha256-auth
async function generateAuthHeader(apiKey: string, secretKey: string, uriPath: string, requestBody: string): Promise<string> {
  const randomKey = Date.now().toString() + Math.random().toString(36).substring(2, 10);
  
  // PKI String: randomKey + uriPath + requestBody
  const pkiString = randomKey + uriPath + requestBody;
  
  // Create HMAC-SHA256 signature using Web Crypto API
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(pkiString));
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Auth string format: apiKey:{apiKey}&randomKey:{randomKey}&signature:{signature}
  const authorizationString = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`;
  return base64Encode(authorizationString);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const iyzicoApiKey = Deno.env.get('IYZICO_API_KEY')!;
    const iyzicoSecretKey = Deno.env.get('IYZICO_SECRET_KEY')!;
    // Remove trailing slash from base URL to avoid double slashes
    const iyzicoBaseUrl = (Deno.env.get('IYZICO_BASE_URL') || 'https://api.iyzipay.com').replace(/\/+$/, '');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[process-mass-payout] Starting scheduled payout processing...');

    // Get all approved withdrawals that are due for payout (join with user_ibans)
    const now = new Date().toISOString();
    const { data: pendingPayouts, error: fetchError } = await supabase
      .from('withdrawal_requests')
      .select(`
        id, 
        user_id, 
        amount, 
        scheduled_payout_at, 
        is_enterprise_user,
        user_ibans (
          iban,
          holder_name
        )
      `)
      .eq('status', 'approved')
      .not('scheduled_payout_at', 'is', null)
      .lte('scheduled_payout_at', now)
      .is('payout_transaction_id', null)
      .order('is_enterprise_user', { ascending: false }) // Enterprise first
      .order('scheduled_payout_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch pending payouts: ${fetchError.message}`);
    }

    console.log(`[process-mass-payout] Found ${pendingPayouts?.length || 0} payouts to process`);

    if (!pendingPayouts || pendingPayouts.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No payouts to process',
        processed_count: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filter out payouts without valid IBAN data and transform to typed objects
    const validPayouts: WithdrawalRequest[] = pendingPayouts
      .filter((p: any) => p.user_ibans && p.user_ibans.iban && p.user_ibans.holder_name)
      .map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        amount: p.amount,
        scheduled_payout_at: p.scheduled_payout_at,
        is_enterprise_user: p.is_enterprise_user,
        user_ibans: p.user_ibans as UserIban
      }));

    if (validPayouts.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No payouts with valid IBAN data to process',
        processed_count: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare iyzico mass payout request
    const payoutItems: PayoutItem[] = validPayouts.map((payout) => ({
      itemExternalId: payout.id,
      recipientType: 'IBAN',
      recipientInfo: payout.user_ibans!.iban,
      amount: {
        value: Math.round(payout.amount * 100), // Convert to kuruş (cents)
        currency: 'TRY'
      },
      description: `CardBoom Withdrawal - ${payout.id.substring(0, 8)}`,
      recipientName: payout.user_ibans!.holder_name
    }));

    const batchId = `PAYOUT-${Date.now()}`;
    const payoutRequest = {
      externalId: batchId,
      conversationId: `conv-${batchId}`,
      purpose: 'GOODS', // iyzico purpose type for payouts (GOODS, BONUS, or REFUND)
      items: payoutItems
    };

    const payloadString = JSON.stringify(payoutRequest);
    
    // Correct endpoint: /v1/mass/payout/init (not /v2/masspayout)
    const uriPath = '/v1/mass/payout/init';
    const authorization = await generateAuthHeader(iyzicoApiKey, iyzicoSecretKey, uriPath, payloadString);

    console.log('[process-mass-payout] Sending mass payout request to iyzico...');
    console.log('[process-mass-payout] Endpoint:', `${iyzicoBaseUrl}${uriPath}`);

    // Call iyzico Mass Payout API
    const iyzicoResponse = await fetch(`${iyzicoBaseUrl}${uriPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `IYZWSv2 ${authorization}`,
      },
      body: payloadString
    });

    // Check for non-JSON responses (HTML error pages, etc.)
    const responseText = await iyzicoResponse.text();
    console.log('[process-mass-payout] iyzico HTTP status:', iyzicoResponse.status);
    
    let iyzicoResult: any;
    try {
      iyzicoResult = JSON.parse(responseText);
    } catch (parseError) {
      // Log first 500 chars of response for debugging
      console.error('[process-mass-payout] Non-JSON response from iyzico:', responseText.substring(0, 500));
      
      // Check if it's a common error
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
        throw new Error(`iyzico returned HTML error page (HTTP ${iyzicoResponse.status}). This may indicate invalid API credentials or endpoint.`);
      }
      throw new Error(`Invalid response from iyzico: ${responseText.substring(0, 200)}`);
    }
    
    console.log('[process-mass-payout] iyzico response:', JSON.stringify(iyzicoResult));

    const results: any[] = [];

    if (iyzicoResult.status === 'success') {
      // Mark all as processing with transaction ID
      for (const payout of validPayouts) {
        const ibanValue = payout.user_ibans?.iban || '';
        
        const { error: updateError } = await supabase
          .from('withdrawal_requests')
          .update({
            status: 'processing',
            payout_transaction_id: iyzicoResult.payoutBatchReferenceCode || batchId,
            batch_id: batchId
          })
          .eq('id', payout.id);

        if (updateError) {
          console.error(`[process-mass-payout] Failed to update ${payout.id}:`, updateError);
          results.push({ id: payout.id, status: 'update_failed', error: updateError.message });
        } else {
          results.push({ id: payout.id, status: 'processing', amount: payout.amount });

          // Deduct from wallet
          const { data: wallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', payout.user_id)
            .single();

          if (wallet) {
            await supabase
              .from('wallets')
              .update({ 
                balance: Math.max(0, (wallet.balance || 0) - payout.amount),
                updated_at: new Date().toISOString()
              })
              .eq('user_id', payout.user_id);

            // Log wallet transaction
            await supabase.from('wallet_audit_log').insert({
              user_id: payout.user_id,
              amount: -payout.amount,
              action: 'withdrawal_processed',
              details: {
                withdrawal_id: payout.id,
                batch_id: batchId,
                iban: ibanValue ? ibanValue.substring(0, 4) + '****' + ibanValue.slice(-4) : 'N/A'
              }
            });
          }

          // Send notification (TRY currency)
          try {
            await supabase.functions.invoke('send-notification', {
              body: {
                user_id: payout.user_id,
                title: 'Withdrawal Processing',
                body: `Your withdrawal of ₺${payout.amount.toFixed(2)} is being processed and will arrive in your bank account shortly.`,
                type: 'wallet',
                data: { withdrawal_id: payout.id }
              }
            });
          } catch (notifError) {
            console.error('[process-mass-payout] Notification error:', notifError);
          }
        }
      }

      console.log(`[process-mass-payout] Successfully initiated ${results.length} payouts`);

      return new Response(JSON.stringify({
        success: true,
        batch_id: batchId,
        iyzico_reference: iyzicoResult.payoutBatchReferenceCode,
        processed_count: results.length,
        results
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      // iyzico error - mark payouts with error
      const errorMessage = iyzicoResult.errorMessage || 'iyzico payout failed';
      
      for (const payout of validPayouts) {
        await supabase
          .from('withdrawal_requests')
          .update({
            payout_error: errorMessage
          })
          .eq('id', payout.id);

        results.push({ id: payout.id, status: 'failed', error: errorMessage });
      }

      console.error('[process-mass-payout] iyzico error:', errorMessage);

      return new Response(JSON.stringify({
        success: false,
        error: errorMessage,
        iyzico_error_code: iyzicoResult.errorCode,
        results
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[process-mass-payout] Error:', errorMessage);
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
