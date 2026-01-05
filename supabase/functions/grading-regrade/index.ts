import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || roleData.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { orderIds } = await req.json();

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid orderIds array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin ${user.id} regrading ${orderIds.length} orders`);

    const results: { orderId: string; success: boolean; grade?: number; error?: string }[] = [];

    for (const orderId of orderIds) {
      try {
        // Fetch the order
        const { data: order, error: fetchError } = await supabase
          .from('grading_orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (fetchError || !order) {
          results.push({ orderId, success: false, error: 'Order not found' });
          continue;
        }

        if (!order.front_image_url) {
          results.push({ orderId, success: false, error: 'No front image' });
          continue;
        }

        console.log(`Regrading order ${orderId}...`);
        console.log('Front image:', order.front_image_url);
        console.log('Back image:', order.back_image_url);

        // Build records array for Ximilar
        const records: any[] = [];
        
        if (order.front_image_url) {
          records.push({
            _url: order.front_image_url,
            Side: 'front'
          });
        }
        
        if (order.back_image_url) {
          records.push({
            _url: order.back_image_url,
            Side: 'back'
          });
        }

        // Call Ximilar API
        const ximilarResponse = await fetch(XIMILAR_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${ximilarToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ records })
        });

        const ximilarData = await ximilarResponse.json();
        console.log(`Ximilar response for ${orderId}:`, JSON.stringify(ximilarData.status));

        if (ximilarData.records && ximilarData.records.length > 0) {
          const record = ximilarData.records[0];
          
          if (record._status?.code !== 200) {
            console.error(`Ximilar grading failed for ${orderId}:`, record._status?.text);
            results.push({ orderId, success: false, error: record._status?.text || 'Grading failed' });
            continue;
          }

          const grades = record.grades || {};
          const ximilarFinalGrade = grades.final || null;
          const ximilarCorners = grades.corners || null;
          const ximilarEdges = grades.edges || null;
          const ximilarSurface = grades.surface || null;
          const ximilarCentering = grades.centering || null;
          const condition = grades.condition || null;

          console.log(`Grades for ${orderId} - Final: ${ximilarFinalGrade}, Corners: ${ximilarCorners}, Edges: ${ximilarEdges}`);

          // Apply 5% conservative adjustment
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

          const overlayUrl = record._full_url_card || null;
          const exactUrl = record._exact_url_card || null;

          // Update order with results
          const { error: updateError } = await supabase
            .from('grading_orders')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              final_grade: cardboomFinalGrade,
              grade_label: getGradeLabel(cardboomFinalGrade),
              corners_grade: cardboomCorners,
              edges_grade: cardboomEdges,
              surface_grade: cardboomSurface,
              centering_grade: cardboomCentering,
              ximilar_final_grade: ximilarFinalGrade,
              ximilar_corners_grade: ximilarCorners,
              ximilar_edges_grade: ximilarEdges,
              ximilar_surface_grade: ximilarSurface,
              ximilar_centering_grade: ximilarCentering,
              overlay_url: overlayUrl,
              exact_url: exactUrl,
              overlay_coordinates: record._objects || null,
              external_request_id: ximilarData.status?.request_id || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', orderId);

          if (updateError) {
            console.error(`Failed to update order ${orderId}:`, updateError);
            results.push({ orderId, success: false, error: 'Failed to save results' });
          } else {
            console.log(`Order ${orderId} regraded successfully - Grade: ${cardboomFinalGrade}`);
            results.push({ orderId, success: true, grade: cardboomFinalGrade || undefined });
          }
        } else {
          console.error(`No records returned for ${orderId}`);
          results.push({ orderId, success: false, error: 'No grading results returned' });
        }
      } catch (orderError) {
        console.error(`Error processing order ${orderId}:`, orderError);
        results.push({ orderId, success: false, error: String(orderError) });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Regrade complete: ${successCount}/${orderIds.length} successful`);

    return new Response(
      JSON.stringify({ success: true, results, successCount, totalCount: orderIds.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Regrade error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
