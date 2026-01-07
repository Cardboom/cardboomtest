import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Speed tier configurations (in hours)
const SPEED_TIER_HOURS: Record<string, number> = {
  'priority': 48,   // 2 days
  'express': 120,   // 5 days  
  'standard': 168,  // 7 days
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Processing pending grading orders...');

    // Find orders that are queued and past their countdown time
    const { data: pendingOrders, error: fetchError } = await supabase
      .from('grading_orders')
      .select('id, user_id, speed_tier, paid_at, created_at')
      .eq('status', 'queued')
      .not('paid_at', 'is', null);

    if (fetchError) {
      console.error('Error fetching pending orders:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending orders' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending orders to process', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const ordersToGrade: string[] = [];

    for (const order of pendingOrders) {
      const paidAt = new Date(order.paid_at);
      const speedTier = order.speed_tier || 'standard';
      const waitHours = SPEED_TIER_HOURS[speedTier] || 168;
      
      // Calculate when grading should trigger (countdown expired)
      const gradeAfter = new Date(paidAt.getTime() + waitHours * 60 * 60 * 1000);
      
      if (now >= gradeAfter) {
        ordersToGrade.push(order.id);
      }
    }

    console.log(`Found ${ordersToGrade.length} orders ready for grading`);

    // Trigger grading for each order
    const results = await Promise.allSettled(
      ordersToGrade.map(async (orderId) => {
        const response = await fetch(`${supabaseUrl}/functions/v1/cbgi-grade`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ orderId }),
        });

        if (!response.ok) {
          throw new Error(`Failed to grade order ${orderId}: ${response.status}`);
        }

        return { orderId, success: true };
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Processed ${successful} successfully, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        message: 'Pending grades processed',
        processed: successful,
        failed: failed,
        total_pending: pendingOrders.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing pending grades:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
