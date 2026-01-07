import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GradeListingRequest {
  listing_ids: string[];
  speed_tier?: 'standard' | 'express' | 'priority';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin for instant grading
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    
    const isAdmin = !!adminRole;

    const { listing_ids, speed_tier = 'standard' }: GradeListingRequest = await req.json();

    if (!listing_ids || !Array.isArray(listing_ids) || listing_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'listing_ids array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the listings to verify ownership and get images
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('id, title, image_url, category, seller_id, certification_status, grading_order_id')
      .in('id', listing_ids)
      .eq('seller_id', user.id);

    if (listingsError) {
      console.error('Error fetching listings:', listingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch listings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!listings || listings.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid listings found for grading' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter out listings already graded or in progress
    const eligibleListings = listings.filter(l => 
      !l.grading_order_id && 
      l.certification_status !== 'completed' && 
      l.certification_status !== 'pending' &&
      l.image_url
    );

    if (eligibleListings.length === 0) {
      return new Response(
        JSON.stringify({ error: 'All selected listings are already graded or in progress' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate pricing
    const tierPrices = { standard: 10, express: 15, priority: 25 };
    const pricePerCard = tierPrices[speed_tier] || 10;
    
    // Check user wallet balance
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    const totalCost = pricePerCard * eligibleListings.length;
    const walletBalance = wallet?.balance || 0;

    if (walletBalance < totalCost) {
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient balance', 
          required: totalCost,
          available: walletBalance 
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create grading orders for each listing
    const createdOrders = [];
    const errors = [];

    for (const listing of eligibleListings) {
      try {
        // Create grading order with EXACT listing title for database consistency
        // e.g., "Nami ONE PIECE Heroines Edition EB03-053" stored as-is
        const { data: order, error: orderError } = await supabase
          .from('grading_orders')
          .insert({
            user_id: user.id,
            category: listing.category || 'other',
            front_image_url: listing.image_url,
            back_image_url: listing.image_url, // Use same image if no back
            price_usd: pricePerCard,
            price_cents: pricePerCard * 100,
            status: 'queued',
            card_name: listing.title, // Store EXACT title for matching
            listing_created_id: listing.id,
            speed_tier: speed_tier,
          })
          .select()
          .single();

        if (orderError) {
          errors.push({ listing_id: listing.id, error: orderError.message });
          continue;
        }

        // Update listing with grading order reference and pending status
        await supabase
          .from('listings')
          .update({ 
            grading_order_id: order.id,
            certification_status: 'pending'
          })
          .eq('id', listing.id);

        createdOrders.push(order);

        // Trigger the grading process ONLY for admins (instant grading)
        // Normal users will wait for the countdown timer, then grading triggers via cron/manual
        if (isAdmin) {
          fetch(`${supabaseUrl}/functions/v1/cbgi-grade`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ orderId: order.id }), // Use orderId to match cbgi-grade
          }).catch(err => {
            console.error('Failed to trigger grading for order:', order.id, err);
          });
        }
        // For non-admins, grading will be triggered after countdown expires

      } catch (err) {
        errors.push({ listing_id: listing.id, error: String(err) });
      }
    }

    // Deduct from wallet
    if (createdOrders.length > 0) {
      const totalDeduction = pricePerCard * createdOrders.length;
      
      await supabase
        .from('wallets')
        .update({ balance: walletBalance - totalDeduction })
        .eq('user_id', user.id);

      // Log the transaction
      await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user.id,
          type: 'debit',
          amount: totalDeduction,
          description: `CardBoom Grading: ${createdOrders.length} card(s) - ${speed_tier}`,
          reference_type: 'grading_order',
        });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        orders_created: createdOrders.length,
        total_cost: pricePerCard * createdOrders.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in grade-listing:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
