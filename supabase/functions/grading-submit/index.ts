import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GRADING_PRICE_USD = 20;
const XIMILAR_API_URL = "https://api.ximilar.com/card-grader/v2/grade";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ximilarToken = Deno.env.get('XIMILAR_API_TOKEN');

    if (!ximilarToken) {
      console.error('XIMILAR_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Grading service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create authenticated client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from auth header
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { orderId, idempotencyKey } = await req.json();

    if (!orderId || !idempotencyKey) {
      return new Response(
        JSON.stringify({ error: 'Missing orderId or idempotencyKey' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing grading order ${orderId} for user ${user.id}`);

    // Check if already processed with this idempotency key
    const { data: existingOrder, error: checkError } = await supabase
      .from('grading_orders')
      .select('*')
      .eq('id', orderId)
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (checkError) {
      console.error('Order check error:', checkError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingOrder.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If already paid/queued, return success (idempotent)
    if (existingOrder.status !== 'pending_payment') {
      console.log(`Order ${orderId} already processed, status: ${existingOrder.status}`);
      return new Response(
        JSON.stringify({ success: true, order: existingOrder, alreadyProcessed: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      console.error('Wallet error:', walletError);
      return new Response(
        JSON.stringify({ error: 'Wallet not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (wallet.balance < GRADING_PRICE_USD) {
      return new Response(
        JSON.stringify({ error: 'Insufficient balance', required: GRADING_PRICE_USD, current: wallet.balance }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atomically deduct balance
    const { error: deductError } = await supabase
      .from('wallets')
      .update({ balance: wallet.balance - GRADING_PRICE_USD, updated_at: new Date().toISOString() })
      .eq('id', wallet.id)
      .eq('balance', wallet.balance); // Optimistic lock

    if (deductError) {
      console.error('Balance deduction error:', deductError);
      return new Response(
        JSON.stringify({ error: 'Failed to process payment. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create ledger transaction
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        wallet_id: wallet.id,
        type: 'grading_fee',
        amount: -GRADING_PRICE_USD,
        currency: 'USD',
        description: `Card grading fee - Order ${orderId}`,
        reference_id: orderId
      });

    if (txError) {
      console.error('Transaction log error:', txError);
      // Continue anyway, payment was successful
    }

    // Update order to paid
    const { error: updateError } = await supabase
      .from('grading_orders')
      .update({
        status: 'queued',
        paid_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Order update error:', updateError);
      // Refund the user
      await supabase
        .from('wallets')
        .update({ balance: wallet.balance, updated_at: new Date().toISOString() })
        .eq('id', wallet.id);
      
      return new Response(
        JSON.stringify({ error: 'Failed to update order. Payment refunded.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Submit to Ximilar API
    try {
      console.log('Submitting to Ximilar API...');
      console.log('Front image:', existingOrder.front_image_url);
      console.log('Back image:', existingOrder.back_image_url);
      
      // Build records array - Ximilar expects _url field, not _url_front/_url_back
      // Can send both front and back as separate records (max 2)
      const records: any[] = [];
      
      if (existingOrder.front_image_url) {
        records.push({
          _url: existingOrder.front_image_url,
          Side: 'front'
        });
      }
      
      if (existingOrder.back_image_url) {
        records.push({
          _url: existingOrder.back_image_url,
          Side: 'back'
        });
      }
      
      if (records.length === 0) {
        throw new Error('No images available for grading');
      }

      const ximilarResponse = await fetch(XIMILAR_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${ximilarToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ records })
      });

      const ximilarData = await ximilarResponse.json();
      console.log('Ximilar response status:', ximilarData.status);
      console.log('Ximilar records count:', ximilarData.records?.length);
      
      if (ximilarData.records && ximilarData.records.length > 0) {
        // Get the first record (front side) - Ximilar returns grades in the "grades" field
        const record = ximilarData.records[0];
        console.log('Record grades:', JSON.stringify(record.grades));
        console.log('Record _status:', JSON.stringify(record._status));
        
        // Check if grading was successful
        if (record._status?.code !== 200) {
          console.error('Ximilar grading failed:', record._status?.text);
          throw new Error(record._status?.text || 'Grading failed');
        }
        
        // Extract grades from the correct location per Ximilar API docs
        const grades = record.grades || {};
        
        // Ximilar returns grades in the "grades" object
        const ximilarFinalGrade = grades.final || null;
        const ximilarCorners = grades.corners || null;
        const ximilarEdges = grades.edges || null;
        const ximilarSurface = grades.surface || null;
        const ximilarCentering = grades.centering || null;
        const condition = grades.condition || null;
        
        console.log('Extracted grades - Final:', ximilarFinalGrade, 'Corners:', ximilarCorners, 'Edges:', ximilarEdges, 'Surface:', ximilarSurface, 'Centering:', ximilarCentering);
        
        // Apply 5% conservative adjustment for CardBoom disciplined grading
        const applyConservativeAdjustment = (grade: number | null): number | null => {
          if (grade === null) return null;
          const adjusted = Math.max(1.0, grade * 0.95);
          return Math.round(adjusted * 10) / 10;
        };
        
        const cardboomFinalGrade = applyConservativeAdjustment(ximilarFinalGrade);
        const cardboomCorners = applyConservativeAdjustment(ximilarCorners);
        const cardboomEdges = applyConservativeAdjustment(ximilarEdges);
        const cardboomSurface = applyConservativeAdjustment(ximilarSurface);
        const cardboomCentering = applyConservativeAdjustment(ximilarCentering);
        
        // Map grade to label using CardBoom adjusted grade
        const getGradeLabel = (grade: number | null): string => {
          if (!grade) return condition || 'Unknown';
          if (grade >= 9.5) return 'Gem Mint';
          if (grade >= 9) return 'Mint';
          if (grade >= 8) return 'Near Mint-Mint';
          if (grade >= 7) return 'Near Mint';
          if (grade >= 6) return 'Excellent-Near Mint';
          if (grade >= 5) return 'Excellent';
          if (grade >= 4) return 'Very Good-Excellent';
          if (grade >= 3) return 'Very Good';
          if (grade >= 2) return 'Good';
          return 'Poor';
        };

        // Get overlay visualization URLs
        const overlayUrl = record._full_url_card || null;
        const exactUrl = record._exact_url_card || null;

        // Update order with results
        const { error: updateGradeError } = await supabase
          .from('grading_orders')
          .update({
            status: 'completed',
            submitted_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            // CardBoom adjusted grades
            final_grade: cardboomFinalGrade,
            grade_label: getGradeLabel(cardboomFinalGrade),
            corners_grade: cardboomCorners,
            edges_grade: cardboomEdges,
            surface_grade: cardboomSurface,
            centering_grade: cardboomCentering,
            // Original Ximilar grades
            ximilar_final_grade: ximilarFinalGrade,
            ximilar_corners_grade: ximilarCorners,
            ximilar_edges_grade: ximilarEdges,
            ximilar_surface_grade: ximilarSurface,
            ximilar_centering_grade: ximilarCentering,
            // Visualization URLs
            overlay_url: overlayUrl,
            exact_url: exactUrl,
            overlay_coordinates: record._objects || null,
            confidence: null,
            external_request_id: ximilarData.status?.request_id || null
          })
          .eq('id', orderId);

        if (updateGradeError) {
          console.error('Failed to update grading order with results:', updateGradeError);
        }

        console.log(`Order ${orderId} completed - Ximilar Final: ${ximilarFinalGrade}, CardBoom Final: ${cardboomFinalGrade}`);
      } else {
        // Mark as in_review if API didn't return results
        await supabase
          .from('grading_orders')
          .update({
            status: 'in_review',
            submitted_at: new Date().toISOString(),
            external_request_id: ximilarData.status?.request_id || null
          })
          .eq('id', orderId);

        console.log(`Order ${orderId} submitted, awaiting results`);
      }
    } catch (apiError) {
      console.error('Ximilar API error:', apiError);
      // Mark as in_review - will be processed by polling
      await supabase
        .from('grading_orders')
        .update({
          status: 'in_review',
          submitted_at: new Date().toISOString()
        })
        .eq('id', orderId);
    }

    // Fetch updated order
    const { data: updatedOrder } = await supabase
      .from('grading_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    return new Response(
      JSON.stringify({ success: true, order: updatedOrder }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Grading submit error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
