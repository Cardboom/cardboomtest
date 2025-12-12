import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RewardPayload {
  user_id: string;
  event_type: 'deposit' | 'trade';
  amount: number;
}

const TIER_RATES: Record<string, number> = {
  bronze: 0.05,
  silver: 0.075,
  gold: 0.10,
  platinum: 0.125,
  diamond: 0.15
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: RewardPayload = await req.json();
    console.log('Processing referral reward:', payload);

    // Check if user was referred
    const { data: profile } = await supabase
      .from('profiles')
      .select('referred_by')
      .eq('id', payload.user_id)
      .single();

    if (!profile?.referred_by) {
      console.log('User was not referred');
      return new Response(JSON.stringify({ success: false, reason: 'not_referred' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the referral record
    const { data: referral } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', profile.referred_by)
      .eq('referred_id', payload.user_id)
      .single();

    if (!referral) {
      console.log('No referral record found');
      return new Response(JSON.stringify({ success: false, reason: 'no_referral' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get referrer's tier
    const tier = referral.tier || 'bronze';
    const commissionRate = TIER_RATES[tier] || 0.05;
    const commissionAmount = payload.amount * commissionRate;

    console.log(`Calculating commission: ${payload.amount} * ${commissionRate} = ${commissionAmount}`);

    // Create commission record
    const { error: commissionError } = await supabase
      .from('referral_commissions')
      .insert({
        referrer_id: profile.referred_by,
        referred_id: payload.user_id,
        referral_id: referral.id,
        event_type: payload.event_type,
        source_amount: payload.amount,
        commission_rate: commissionRate,
        commission_amount: commissionAmount
      });

    if (commissionError) {
      console.error('Error creating commission record:', commissionError);
      throw commissionError;
    }

    // Update referral totals
    const updateField = payload.event_type === 'deposit' 
      ? 'referred_deposit_total' 
      : 'referred_trade_volume';
    
    const currentValue = Number(referral[updateField]) || 0;
    const currentCommission = Number(referral.commission_earned) || 0;

    const { error: updateError } = await supabase
      .from('referrals')
      .update({
        [updateField]: currentValue + payload.amount,
        commission_earned: currentCommission + commissionAmount,
        status: 'completed'
      })
      .eq('id', referral.id);

    if (updateError) {
      console.error('Error updating referral:', updateError);
    }

    // Credit commission to referrer's wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', profile.referred_by)
      .single();

    if (wallet) {
      const newBalance = Number(wallet.balance) + commissionAmount;
      
      await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('id', wallet.id);

      // Create transaction record
      await supabase
        .from('transactions')
        .insert({
          wallet_id: wallet.id,
          type: 'topup',
          amount: commissionAmount,
          fee: 0,
          description: `Referral commission from ${payload.event_type}`
        });
    }

    // Award XP to referrer
    await supabase
      .from('xp_history')
      .insert({
        user_id: profile.referred_by,
        action: 'referral',
        xp_earned: Math.floor(commissionAmount),
        description: `Commission from referral ${payload.event_type}`
      });

    // Update referrer's XP
    const { data: referrerProfile } = await supabase
      .from('profiles')
      .select('xp')
      .eq('id', profile.referred_by)
      .single();

    const newXP = (referrerProfile?.xp || 0) + Math.floor(commissionAmount);
    await supabase
      .from('profiles')
      .update({ xp: newXP })
      .eq('id', profile.referred_by);

    // Send notification to referrer
    await supabase
      .from('notifications')
      .insert({
        user_id: profile.referred_by,
        type: 'referral',
        title: '💰 Commission Earned!',
        body: `You earned ${commissionAmount.toFixed(2)} from a referral ${payload.event_type}!`,
        data: { 
          commission_amount: commissionAmount,
          event_type: payload.event_type,
          referral_id: referral.id 
        }
      });

    console.log('Referral reward processed successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      commission_amount: commissionAmount,
      tier,
      commission_rate: commissionRate
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in process-referral-reward:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
