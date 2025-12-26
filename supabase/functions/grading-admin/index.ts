import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GRADING_PRICE_USD = 20;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from auth header
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, orderId, status } = await req.json();

    if (action === 'list') {
      // List all orders with user info
      const { data: orders, error } = await supabase
        .from('grading_orders')
        .select('*, profiles:user_id(display_name, email)')
        .order('created_at', { ascending: false });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ orders }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update_status' && orderId && status) {
      const validStatuses = ['queued', 'in_review', 'completed', 'failed'];
      if (!validStatuses.includes(status)) {
        return new Response(
          JSON.stringify({ error: 'Invalid status' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const updateData: any = { status };
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { data: order, error } = await supabase
        .from('grading_orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, order }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'refund' && orderId) {
      // Get the order
      const { data: order, error: orderError } = await supabase
        .from('grading_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        return new Response(
          JSON.stringify({ error: 'Order not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (order.status === 'refunded') {
        return new Response(
          JSON.stringify({ error: 'Order already refunded' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user wallet
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', order.user_id)
        .single();

      if (walletError || !wallet) {
        return new Response(
          JSON.stringify({ error: 'User wallet not found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Refund to wallet
      const { error: refundError } = await supabase
        .from('wallets')
        .update({ 
          balance: wallet.balance + GRADING_PRICE_USD,
          updated_at: new Date().toISOString()
        })
        .eq('id', wallet.id);

      if (refundError) {
        return new Response(
          JSON.stringify({ error: 'Failed to process refund' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create refund transaction
      await supabase
        .from('transactions')
        .insert({
          wallet_id: wallet.id,
          type: 'refund',
          amount: GRADING_PRICE_USD,
          currency: 'USD',
          description: `Grading refund - Order ${orderId}`,
          reference_id: orderId
        });

      // Update order status
      const { data: updatedOrder, error: updateError } = await supabase
        .from('grading_orders')
        .update({ status: 'refunded' })
        .eq('id', orderId)
        .select()
        .single();

      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'Failed to update order status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Order ${orderId} refunded by admin ${user.id}`);

      return new Response(
        JSON.stringify({ success: true, order: updatedOrder }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin grading error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
