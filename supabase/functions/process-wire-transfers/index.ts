import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Tightened CORS - only allows cardboom.com and Lovable preview URLs
const corsHeaders = getCorsHeaders();

// This function is designed to run as a scheduled cron job
// It processes verified wire transfers that are due for credit (1 day after verification)
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[process-wire-transfers] Starting scheduled processing...');

    // Get all verified transfers that are due for credit
    const { data: pendingTransfers, error: fetchError } = await supabase
      .from('wire_transfers')
      .select('*')
      .eq('status', 'verified')
      .not('scheduled_credit_at', 'is', null)
      .lte('scheduled_credit_at', new Date().toISOString())
      .is('credited_at', null);

    if (fetchError) {
      throw new Error(`Failed to fetch pending transfers: ${fetchError.message}`);
    }

    console.log(`[process-wire-transfers] Found ${pendingTransfers?.length || 0} transfers to process`);

    let processedCount = 0;
    const results: any[] = [];

    for (const transfer of pendingTransfers || []) {
      try {
        // Get current wallet balance
        const { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select('id, balance')
          .eq('user_id', transfer.user_id)
          .single();

        let newBalance: number;
        
        if (walletError || !wallet) {
          // Create wallet if it doesn't exist
          const { error: createError } = await supabase
            .from('wallets')
            .insert({
              user_id: transfer.user_id,
              balance: transfer.net_amount
            });

          if (createError) {
            throw new Error(`Failed to create wallet: ${createError.message}`);
          }
          newBalance = transfer.net_amount;
        } else {
          // Update existing wallet
          newBalance = (wallet.balance || 0) + transfer.net_amount;
          const { error: updateError } = await supabase
            .from('wallets')
            .update({ 
              balance: newBalance,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', transfer.user_id);

          if (updateError) {
            throw new Error(`Failed to update wallet: ${updateError.message}`);
          }
        }

        // Mark transfer as credited
        const { error: creditError } = await supabase
          .from('wire_transfers')
          .update({
            status: 'credited',
            credited_at: new Date().toISOString()
          })
          .eq('id', transfer.id);

        if (creditError) {
          throw new Error(`Failed to mark as credited: ${creditError.message}`);
        }

        // Log the wallet transaction
        await supabase.from('wallet_audit_log').insert({
          user_id: transfer.user_id,
          amount: transfer.net_amount,
          action: 'wire_transfer_credit',
          details: {
            transfer_id: transfer.id,
            amount_try: transfer.amount,
            net_amount_usd: transfer.net_amount,
            national_id: transfer.national_id_match
          }
        });

        // Send notification to user
        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              user_id: transfer.user_id,
              title: 'Wire Transfer Credited!',
              body: `$${transfer.net_amount.toFixed(2)} has been added to your wallet from your wire transfer.`,
              type: 'wallet',
              data: { transfer_id: transfer.id }
            }
          });
        } catch (notifError) {
          console.error('[process-wire-transfers] Notification error:', notifError);
        }

        processedCount++;
        results.push({
          transfer_id: transfer.id,
          user_id: transfer.user_id,
          amount: transfer.net_amount,
          status: 'credited',
          new_balance: newBalance
        });

        console.log(`[process-wire-transfers] Credited transfer ${transfer.id}: $${transfer.net_amount}`);

      } catch (transferError: any) {
        console.error(`[process-wire-transfers] Error processing transfer ${transfer.id}:`, transferError.message);
        results.push({
          transfer_id: transfer.id,
          status: 'error',
          error: transferError.message
        });
      }
    }

    console.log(`[process-wire-transfers] Completed. Processed ${processedCount} transfers.`);

    return new Response(JSON.stringify({
      success: true,
      processed_count: processedCount,
      total_pending: pendingTransfers?.length || 0,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[process-wire-transfers] Error:', errorMessage);
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
