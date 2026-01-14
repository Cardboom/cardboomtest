import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMS_REWARD = 50; // $0.50 worth of gems

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { tweetUrl } = await req.json();
    
    if (!tweetUrl) {
      return new Response(
        JSON.stringify({ error: 'Tweet URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract tweet ID from URL
    // Formats: https://x.com/username/status/123456789 or https://twitter.com/username/status/123456789
    const tweetIdMatch = tweetUrl.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
    if (!tweetIdMatch) {
      return new Response(
        JSON.stringify({ error: 'Invalid tweet URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tweetId = tweetIdMatch[1];

    // Check if user has already claimed ANY tweet reward (one per account)
    const { data: existingUserClaim } = await supabase
      .from('tweet_reward_claims')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'awarded')
      .limit(1)
      .single();

    if (existingUserClaim) {
      return new Response(
        JSON.stringify({ error: 'You have already claimed your tweet reward. One reward per account.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this specific tweet has already been claimed by anyone
    const { data: existingTweetClaim } = await supabase
      .from('tweet_reward_claims')
      .select('id')
      .eq('tweet_id', tweetId)
      .single();

    if (existingTweetClaim) {
      return new Response(
        JSON.stringify({ error: 'This tweet has already been claimed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify tweet via X API
    const X_BEARER_TOKEN = Deno.env.get('X_BEARER_TOKEN');
    
    if (!X_BEARER_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'X API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tweetResponse = await fetch(
      `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=text,author_id&expansions=author_id&user.fields=username`,
      {
        headers: {
          'Authorization': `Bearer ${X_BEARER_TOKEN}`,
        },
      }
    );

    if (!tweetResponse.ok) {
      const errorText = await tweetResponse.text();
      console.error('X API error:', tweetResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Could not verify tweet. Please check the URL and try again.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tweetData = await tweetResponse.json();
    const tweetText = tweetData.data?.text || '';
    const authorHandle = tweetData.includes?.users?.[0]?.username || '';

    // Check if tweet mentions @cardboomcom
    if (!tweetText.toLowerCase().includes('@cardboomcom')) {
      return new Response(
        JSON.stringify({ error: 'Tweet must mention @cardboomcom to claim reward' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create claim record
    const { error: claimError } = await supabase
      .from('tweet_reward_claims')
      .insert({
        user_id: user.id,
        tweet_id: tweetId,
        tweet_url: tweetUrl,
        tweet_author_handle: `@${authorHandle}`,
        gems_awarded: GEMS_REWARD,
        status: 'awarded',
        verified_at: new Date().toISOString(),
      });

    if (claimError) {
      console.error('Claim insert error:', claimError);
      return new Response(
        JSON.stringify({ error: 'Failed to process claim' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Award gems to user
    const { data: pointsData } = await supabase
      .from('cardboom_points')
      .select('id, balance')
      .eq('user_id', user.id)
      .single();

    if (pointsData) {
      // Update existing balance
      await supabase
        .from('cardboom_points')
        .update({ 
          balance: pointsData.balance + GEMS_REWARD,
          total_earned: supabase.rpc('increment', { x: GEMS_REWARD }),
        })
        .eq('user_id', user.id);
    } else {
      // Create new points record
      await supabase
        .from('cardboom_points')
        .insert({
          user_id: user.id,
          balance: GEMS_REWARD,
          total_earned: GEMS_REWARD,
          total_spent: 0,
        });
    }

    // Add to points history
    await supabase
      .from('cardboom_points_history')
      .insert({
        user_id: user.id,
        amount: GEMS_REWARD,
        transaction_type: 'earn',
        source: 'tweet_reward',
        description: `Tweet reward for mentioning @cardboomcom`,
        reference_id: tweetId,
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        gemsAwarded: GEMS_REWARD,
        message: `You earned ${GEMS_REWARD} gems for your tweet!`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error verifying tweet:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
