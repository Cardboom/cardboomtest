import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...params } = await req.json();

    console.log('[verify-wire-transfer] Action:', action, 'Params:', JSON.stringify(params));

    if (action === 'verify') {
      // Verify a wire transfer by matching national ID
      const { transfer_id, national_id, amount, sender_name, sender_iban, description } = params;

      if (!transfer_id || !national_id || !amount) {
        throw new Error('Missing required fields: transfer_id, national_id, amount');
      }

      // Call the database function to verify
      const { data, error } = await supabase.rpc('verify_wire_transfer_by_national_id', {
        p_transfer_id: transfer_id,
        p_national_id: national_id,
        p_amount: amount,
        p_sender_name: sender_name || null,
        p_sender_iban: sender_iban || null,
        p_description: description || null
      });

      if (error) {
        console.error('[verify-wire-transfer] RPC error:', error);
        throw new Error(error.message);
      }

      console.log('[verify-wire-transfer] Verification result:', data);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'process_pending') {
      // Process pending verified transfers (run as cron job)
      const { data, error } = await supabase.rpc('process_pending_wire_transfers');

      if (error) {
        console.error('[verify-wire-transfer] Process error:', error);
        throw new Error(error.message);
      }

      console.log('[verify-wire-transfer] Processed transfers:', data);

      return new Response(JSON.stringify({ 
        success: true, 
        processed_count: data 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'create_transfer') {
      // Create a new wire transfer record (can be called when bank provides transfer data)
      const { national_id, amount, sender_name, sender_iban, description } = params;

      if (!national_id || !amount) {
        throw new Error('Missing required fields: national_id, amount');
      }

      // Find user by national ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, national_id')
        .eq('national_id', national_id)
        .single();

      if (profileError || !profile) {
        return new Response(JSON.stringify({
          success: false,
          error: 'No user found with this National ID',
          national_id_searched: national_id
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get exchange rate
      const { data: rateData } = await supabase
        .from('currency_rates')
        .select('rate')
        .eq('from_currency', 'USD')
        .eq('to_currency', 'TRY')
        .single();
      
      const usdRate = rateData?.rate || 38.0;
      const commissionRate = 0.03; // 3%
      const flatFee = 0.50;
      const netAmountTry = amount * (1 - commissionRate);
      const netAmountUsd = (netAmountTry / usdRate) - flatFee;

      if (netAmountUsd <= 0) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Transfer amount too small after fees'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create wire transfer record
      const scheduledCreditAt = new Date();
      scheduledCreditAt.setDate(scheduledCreditAt.getDate() + 1); // 1 day from now

      const { data: transfer, error: insertError } = await supabase
        .from('wire_transfers')
        .insert({
          user_id: profile.id,
          amount: amount,
          currency: 'TRY',
          sender_name: sender_name || null,
          sender_iban: sender_iban || null,
          transfer_description: description || national_id,
          national_id_match: national_id,
          matched_code: profile.display_name,
          status: 'verified',
          commission_rate: commissionRate,
          net_amount: netAmountUsd,
          verified_at: new Date().toISOString(),
          auto_verified: true,
          scheduled_credit_at: scheduledCreditAt.toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('[verify-wire-transfer] Insert error:', insertError);
        throw new Error(insertError.message);
      }

      console.log('[verify-wire-transfer] Created transfer:', transfer.id);

      return new Response(JSON.stringify({
        success: true,
        transfer_id: transfer.id,
        user_id: profile.id,
        display_name: profile.display_name,
        amount_try: amount,
        net_amount_usd: netAmountUsd,
        scheduled_credit_at: scheduledCreditAt.toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'lookup_user') {
      // Lookup a user by national ID (for admin verification)
      const { national_id } = params;

      if (!national_id) {
        throw new Error('Missing required field: national_id');
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, display_name, email, national_id, created_at')
        .eq('national_id', national_id)
        .single();

      if (error || !profile) {
        return new Response(JSON.stringify({
          success: false,
          found: false,
          error: 'No user found with this National ID'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        found: true,
        user: {
          id: profile.id,
          display_name: profile.display_name,
          email: profile.email,
          created_at: profile.created_at
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      throw new Error(`Unknown action: ${action}. Valid actions: verify, process_pending, create_transfer, lookup_user`);
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[verify-wire-transfer] Error:', errorMessage);
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
