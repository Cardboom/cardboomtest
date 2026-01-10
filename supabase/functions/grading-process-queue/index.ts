import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function processes queued grading orders whose countdown has expired
// It should be called by a cron job or manually triggered by admins

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Optional: Check for admin auth for manual triggers
    const authHeader = req.headers.get('Authorization');
    let isManualTrigger = false;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        const { data: adminRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();
        
        isManualTrigger = !!adminRole;
      }
    }

    // Find queued orders where estimated_completion_at has passed
    const now = new Date().toISOString();
    
    const { data: readyOrders, error: fetchError } = await supabase
      .from('grading_orders')
      .select('id')
      .eq('status', 'queued')
      .lte('estimated_completion_at', now)
      .limit(10); // Process in batches

    if (fetchError) {
      console.error('Error fetching ready orders:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch orders' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!readyOrders || readyOrders.length === 0) {
      console.log('No orders ready for processing');
      return new Response(
        JSON.stringify({ message: 'No orders ready for processing', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${readyOrders.length} orders ready for processing`);

    // Trigger grading for each order
    const results: { orderId: string; success: boolean; error?: string }[] = [];
    
    for (const order of readyOrders) {
      try {
        // Call the cbgi-grade function for each order
        const gradeResponse = await fetch(`${supabaseUrl}/functions/v1/cbgi-grade`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ orderId: order.id }),
        });

        if (gradeResponse.ok) {
          results.push({ orderId: order.id, success: true });
          console.log(`Successfully triggered grading for order ${order.id}`);
        } else {
          const errorText = await gradeResponse.text();
          results.push({ orderId: order.id, success: false, error: errorText });
          console.error(`Failed to grade order ${order.id}:`, errorText);
        }
      } catch (err) {
        results.push({ orderId: order.id, success: false, error: String(err) });
        console.error(`Exception grading order ${order.id}:`, err);
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    return new Response(
      JSON.stringify({ 
        message: `Processed ${successCount}/${readyOrders.length} orders`,
        processed: successCount,
        total: readyOrders.length,
        results,
        isManualTrigger
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in grading-process-queue:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});