import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReferralPayload {
  referral_code: string;
  referred_user_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: ReferralPayload = await req.json();
    console.log('Processing referral:', payload);

    // Find the referrer by their referral code
    const { data: referrer, error: referrerError } = await supabase
      .from('profiles')
      .select('id, display_name, referral_code')
      .eq('referral_code', payload.referral_code)
      .single();

    if (referrerError || !referrer) {
      console.error('Invalid referral code:', payload.referral_code);
      return new Response(JSON.stringify({ success: false, error: 'Invalid referral code' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Make sure user isn't referring themselves
    if (referrer.id === payload.referred_user_id) {
      return new Response(JSON.stringify({ success: false, error: 'Cannot refer yourself' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if this user was already referred
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_id', payload.referred_user_id)
      .single();

    if (existingReferral) {
      return new Response(JSON.stringify({ success: false, error: 'User already referred' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create the referral record
    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrer.id,
        referred_id: payload.referred_user_id,
        referral_code: payload.referral_code,
        status: 'pending',
        reward_amount: 0.50,
      })
      .select()
      .single();

    if (referralError) {
      console.error('Error creating referral:', referralError);
      throw referralError;
    }

    // Update the referred user's profile
    await supabase
      .from('profiles')
      .update({ referred_by: referrer.id })
      .eq('id', payload.referred_user_id);

    // Send notification to referrer
    await supabase
      .from('notifications')
      .insert({
        user_id: referrer.id,
        type: 'referral',
        title: '🎉 New Referral!',
        body: 'Someone joined using your referral code! Complete their first purchase to earn $0.50.',
        data: { referral_id: referral.id },
      });

    console.log('Referral created successfully:', referral.id);

    return new Response(JSON.stringify({ success: true, referral }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in process-referral:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
