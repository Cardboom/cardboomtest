import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GRADING_PRICE_USD = 10;
const XIMILAR_API_URL = "https://api.ximilar.com/card-grader/v2/grade";
const GEM_RATE = 0.002; // 0.2% in gems (or 0.25% for Pro)

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

    // Award Cardboom Gems (0.2% of transaction, or 0.25% for Pro)
    try {
      // Check user subscription for Pro rate
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('tier')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const isPro = subscription?.tier === 'pro' || subscription?.tier === 'enterprise';
      const gemRate = isPro ? 0.0025 : 0.002;
      const gemsEarned = Math.floor(GRADING_PRICE_USD * gemRate * 100); // Convert to gems (1 gem = $0.01)
      
      if (gemsEarned > 0) {
        // Get or create cardboom_points record
        const { data: existingPoints } = await supabase
          .from('cardboom_points')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (existingPoints) {
          await supabase
            .from('cardboom_points')
            .update({
              balance: existingPoints.balance + gemsEarned,
              total_earned: existingPoints.total_earned + gemsEarned,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);
        } else {
          await supabase
            .from('cardboom_points')
            .insert({
              user_id: user.id,
              balance: gemsEarned,
              total_earned: gemsEarned,
            });
        }
        
        // Log the gems transaction
        await supabase.from('cardboom_points_history').insert({
          user_id: user.id,
          amount: gemsEarned,
          transaction_type: 'earn',
          source: 'grading_payment',
          description: `Earned ${gemsEarned} gems from grading order`,
          reference_id: orderId
        });
        
        console.log(`Awarded ${gemsEarned} gems to user ${user.id} for grading payment`);
      }
    } catch (gemsError) {
      console.error('Error awarding gems:', gemsError);
      // Non-critical, continue
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
      
      // Build records array - Ximilar expects _url field
      // Send front and back as separate records with Side specified
      const records: any[] = [];
      
      if (existingOrder.front_image_url) {
        records.push({
          _url: existingOrder.front_image_url,
          Side: 'Front'
        });
      }
      
      if (existingOrder.back_image_url) {
        records.push({
          _url: existingOrder.back_image_url,
          Side: 'Back'
        });
      }
      
      if (records.length === 0) {
        throw new Error('No images available for grading');
      }

      console.log('Sending records to Ximilar:', JSON.stringify(records));

      const ximilarResponse = await fetch(XIMILAR_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${ximilarToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ records })
      });

      const ximilarData = await ximilarResponse.json();
      console.log('Ximilar full response:', JSON.stringify(ximilarData));
      console.log('Ximilar response status:', ximilarData.status);
      console.log('Ximilar records count:', ximilarData.records?.length);
      
      if (ximilarData.records && ximilarData.records.length > 0) {
        // Get the first successful record (typically front side)
        // Find a record with valid grades
        let gradeRecord = ximilarData.records.find((r: any) => r.grades && r._status?.code === 200);
        
        // If no record with grades found, use first record
        if (!gradeRecord) {
          gradeRecord = ximilarData.records[0];
        }
        
        console.log('Using record for grades:', JSON.stringify(gradeRecord?.grades));
        console.log('Record _status:', JSON.stringify(gradeRecord?._status));
        
        // Check if record has an error status
        if (gradeRecord._status?.code !== 200) {
          console.error('Ximilar grading failed for record:', gradeRecord._status?.text);
          // Don't throw - mark as in_review so admin can handle
          await supabase
            .from('grading_orders')
            .update({
              status: 'in_review',
              submitted_at: new Date().toISOString(),
              grading_notes: `Ximilar error: ${gradeRecord._status?.text || 'Unknown error'}`,
              external_request_id: ximilarData.status?.request_id || null
            })
            .eq('id', orderId);
            
          console.log(`Order ${orderId} marked for manual review due to Ximilar error`);
          
          // Fetch and return updated order
          const { data: updatedOrder } = await supabase
            .from('grading_orders')
            .select('*')
            .eq('id', orderId)
            .single();

          return new Response(
            JSON.stringify({ success: true, order: updatedOrder, status: 'in_review' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Extract grades from the correct location per Ximilar API docs
        const grades = gradeRecord.grades || {};
        
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
        const overlayUrl = gradeRecord._full_url_card || null;
        const exactUrl = gradeRecord._exact_url_card || null;

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
            overlay_coordinates: gradeRecord._objects || null,
            confidence: null,
            external_request_id: ximilarData.status?.request_id || null
          })
          .eq('id', orderId);

        if (updateGradeError) {
          console.error('Failed to update grading order with results:', updateGradeError);
        } else {
          // Create a card_instance to add to user's collection
          const { error: instanceError } = await supabase
            .from('card_instances')
            .insert({
              owner_user_id: user.id,
              title: existingOrder.card_name || 'Graded Card',
              category: existingOrder.category || 'other',
              condition: getGradeLabel(cardboomFinalGrade),
              grade: cardboomFinalGrade?.toFixed(1) || null,
              grading_company: 'CardBoom',
              image_url: existingOrder.front_image_url,
              current_value: 0,
              acquisition_price: GRADING_PRICE_USD,
              acquisition_date: new Date().toISOString(),
              location: 'owner',
              status: 'available',
              source_grading_order_id: orderId,
              market_item_id: existingOrder.market_item_id || null,
            });
          
          if (instanceError) {
            console.error('Failed to create card_instance:', instanceError);
          } else {
            console.log(`Card instance created for user ${user.id} from grading order ${orderId}`);
          }
        }

        console.log(`Order ${orderId} completed - Ximilar Final: ${ximilarFinalGrade}, CardBoom Index: ${cardboomFinalGrade}`);
      } else {
        // Mark as in_review if API didn't return results
        await supabase
          .from('grading_orders')
          .update({
            status: 'in_review',
            submitted_at: new Date().toISOString(),
            external_request_id: ximilarData.status?.request_id || null,
            grading_notes: 'No grading results returned from Ximilar API'
          })
          .eq('id', orderId);

        console.log(`Order ${orderId} submitted, awaiting results`);
      }
    } catch (apiError) {
      console.error('Ximilar API error:', apiError);
      // Mark as in_review - will be processed by polling or manually
      await supabase
        .from('grading_orders')
        .update({
          status: 'in_review',
          submitted_at: new Date().toISOString(),
          grading_notes: `API Error: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`
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
