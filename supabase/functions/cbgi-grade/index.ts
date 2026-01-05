import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CBGI_SYSTEM_PROMPT = `You are CardBoom Grading Index (CBGI), an expert card grading AI. Analyze the provided card images and return a comprehensive grading assessment.

GRADING RUBRIC:
- Centering (20% weight): Front/back centering balance, measure left-right and top-bottom ratios
- Corners (20% weight): Sharpness, wear, whitening, bends
- Edges (20% weight): Smoothness, chips, wear, whitening
- Surface (30% weight): Scratches, print lines, holo scratches, fingerprints, creases
- Eye Appeal (10% weight): Overall visual impression, color vibrancy, presentation

SCORING RULES:
- Score each category from 1.0 to 10.0 in 0.5 increments
- Be CONSERVATIVE: if surface cannot be verified due to glare/low-res/sleeve, cap surface at 8.5
- Final CardBoom Index = weighted average converted to 0-100 scale

PSA RANGE MAPPING (approximate):
- 95-100: PSA 10 potential
- 85-94: PSA 9 range
- 75-84: PSA 8 range
- 65-74: PSA 7 range
- 55-64: PSA 6 range
- Below 55: PSA 5 or lower

RISK FLAGS (include if applicable):
- GLARE: Reflective glare obscuring surface analysis
- LOW_RES: Image resolution insufficient for detailed analysis
- SLEEVE: Card in sleeve/toploader distorting edge/corner visibility
- PRINT_LINES_RISK: Potential factory print lines detected
- CENTERING_SEVERE: Centering significantly off
- SURFACE_WEAR: Visible surface wear detected
- CORNER_DAMAGE: Notable corner damage present

OUTPUT STRICT JSON ONLY - no markdown, no explanation:`;

interface CBGIResponse {
  card_name: string;
  set: string;
  analysis: {
    centering: { score: number; notes: string };
    corners: { score: number; notes: string };
    edges: { score: number; notes: string };
    surface: { score: number; notes: string };
    eye_appeal: { score: number; notes: string };
  };
  cardboom_index: number;
  estimated_psa_range: string;
  confidence_level: 'Low' | 'Medium' | 'High';
  risk_flags: string[];
  grading_disclaimer: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI grading service not configured' }),
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

    const { orderId } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'Missing orderId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`CBGI grading for order ${orderId}`);

    // Get order details
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

    if (order.user_id !== user.id) {
      // Check if admin
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!adminRole) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Build image content for ChatGPT Vision
    const imageContent: any[] = [];
    
    if (order.front_image_url) {
      imageContent.push({
        type: 'image_url',
        image_url: { url: order.front_image_url, detail: 'high' }
      });
    }
    
    if (order.back_image_url) {
      imageContent.push({
        type: 'image_url',
        image_url: { url: order.back_image_url, detail: 'high' }
      });
    }

    if (imageContent.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No images available for grading' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userPrompt = `Analyze this trading card and provide a grading assessment. Return ONLY valid JSON matching this exact structure:
{
  "card_name": "Card Name Here",
  "set": "Set Name Here",
  "analysis": {
    "centering": {"score": 8.5, "notes": "Brief notes"},
    "corners": {"score": 8.0, "notes": "Brief notes"},
    "edges": {"score": 8.5, "notes": "Brief notes"},
    "surface": {"score": 8.0, "notes": "Brief notes"},
    "eye_appeal": {"score": 8.5, "notes": "Brief notes"}
  },
  "cardboom_index": 82,
  "estimated_psa_range": "PSA 8-9",
  "confidence_level": "Medium",
  "risk_flags": [],
  "grading_disclaimer": "AI-assisted visual pre-grade, not an official certification."
}`;

    console.log('Calling Lovable AI Gateway with ChatGPT Vision...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5',
        messages: [
          { role: 'system', content: CBGI_SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: userPrompt },
              ...imageContent
            ]
          }
        ],
        max_completion_tokens: 1500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limited. Please try again shortly.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Mark order for manual review
      await supabase
        .from('grading_orders')
        .update({
          status: 'in_review',
          error_message: `AI grading failed: ${aiResponse.status}`,
        })
        .eq('id', orderId);

      return new Response(
        JSON.stringify({ error: 'AI grading service temporarily unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response');
      await supabase
        .from('grading_orders')
        .update({
          status: 'in_review',
          error_message: 'AI returned empty response',
        })
        .eq('id', orderId);

      return new Response(
        JSON.stringify({ error: 'AI grading failed - empty response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON from response (handle potential markdown wrapping)
    let cbgiResult: CBGIResponse;
    try {
      let jsonStr = content.trim();
      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
      }
      cbgiResult = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      await supabase
        .from('grading_orders')
        .update({
          status: 'in_review',
          error_message: 'Failed to parse AI grading response',
          grading_notes: content.substring(0, 500),
        })
        .eq('id', orderId);

      return new Response(
        JSON.stringify({ error: 'Failed to parse grading response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('CBGI Result:', JSON.stringify(cbgiResult));

    // Extract subgrades (convert 1-10 to same scale)
    const analysis = cbgiResult.analysis || {};
    const centeringGrade = analysis.centering?.score || null;
    const cornersGrade = analysis.corners?.score || null;
    const edgesGrade = analysis.edges?.score || null;
    const surfaceGrade = analysis.surface?.score || null;
    const eyeAppealGrade = analysis.eye_appeal?.score || null;

    // Map CBGI score to label
    const getGradeLabel = (score: number): string => {
      if (score >= 95) return 'Gem Mint';
      if (score >= 90) return 'Mint';
      if (score >= 85) return 'Near Mint-Mint';
      if (score >= 80) return 'Near Mint';
      if (score >= 70) return 'Excellent-Near Mint';
      if (score >= 60) return 'Excellent';
      if (score >= 50) return 'Very Good-Excellent';
      if (score >= 40) return 'Very Good';
      if (score >= 30) return 'Good';
      return 'Poor';
    };

    // Convert CBGI 0-100 to 1-10 final grade
    const cbgiScore = cbgiResult.cardboom_index || 0;
    const finalGrade = Math.round((cbgiScore / 10) * 10) / 10; // Convert to 1-10 scale

    // Update order with CBGI results
    const { error: updateError } = await supabase
      .from('grading_orders')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        // CBGI specific fields
        cbgi_json: cbgiResult,
        cbgi_score_0_100: cbgiScore,
        estimated_psa_range: cbgiResult.estimated_psa_range,
        cbgi_confidence: cbgiResult.confidence_level?.toLowerCase() || 'medium',
        cbgi_risk_flags: cbgiResult.risk_flags || [],
        // Standard grade fields (for backwards compatibility)
        final_grade: finalGrade,
        grade_label: getGradeLabel(cbgiScore),
        centering_grade: centeringGrade,
        corners_grade: cornersGrade,
        edges_grade: edgesGrade,
        surface_grade: surfaceGrade,
        eye_appeal_grade: eyeAppealGrade,
        // Card identification
        card_name: cbgiResult.card_name || order.card_name,
        set_name: cbgiResult.set || order.set_name,
        // Clear error
        error_message: null,
        grading_notes: cbgiResult.grading_disclaimer,
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Failed to update order:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save grading results' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create card instance for user's collection
    const { error: instanceError } = await supabase
      .from('card_instances')
      .insert({
        owner_user_id: order.user_id,
        title: cbgiResult.card_name || order.card_name || 'Graded Card',
        category: order.category || 'other',
        condition: getGradeLabel(cbgiScore),
        grade: finalGrade.toFixed(1),
        grading_company: 'CardBoom',
        image_url: order.front_image_url,
        current_value: 0,
        acquisition_price: order.price_usd,
        acquisition_date: new Date().toISOString(),
        location: 'owner',
        status: 'available',
        source_grading_order_id: orderId,
        market_item_id: order.market_item_id || null,
      });

    if (instanceError) {
      console.error('Failed to create card instance:', instanceError);
    }

    // Fetch updated order
    const { data: updatedOrder } = await supabase
      .from('grading_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    console.log(`CBGI grading complete for order ${orderId}: Score ${cbgiScore}/100`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        order: updatedOrder,
        cbgi: cbgiResult 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('CBGI grading error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});