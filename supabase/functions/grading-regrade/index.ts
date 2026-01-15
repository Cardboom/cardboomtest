import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Tightened CORS - only allows cardboom.com and Lovable preview URLs
const corsHeaders = getCorsHeaders();

// CBGI Grading system prompt
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

    // Check if admin
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { orderIds } = await req.json();

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing orderIds array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`CBGI regrade requested for ${orderIds.length} orders by admin ${user.id}`);

    const results: any[] = [];
    let successCount = 0;

    for (const orderId of orderIds) {
      try {
        // Get order details
        const { data: order, error: orderError } = await supabase
          .from('grading_orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (orderError || !order) {
          results.push({ orderId, success: false, error: 'Order not found' });
          continue;
        }

        if (!order.front_image_url) {
          results.push({ orderId, success: false, error: 'No front image' });
          continue;
        }

        // Build image content
        const imageContent: any[] = [{
          type: 'image_url',
          image_url: { url: order.front_image_url, detail: 'high' }
        }];

        if (order.back_image_url) {
          imageContent.push({
            type: 'image_url',
            image_url: { url: order.back_image_url, detail: 'high' }
          });
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
          console.error(`CBGI error for ${orderId}:`, aiResponse.status, errorText);
          results.push({ orderId, success: false, error: `AI error: ${aiResponse.status}` });
          continue;
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;

        if (!content) {
          results.push({ orderId, success: false, error: 'Empty AI response' });
          continue;
        }

        // Parse JSON
        let cbgiResult: any;
        try {
          let jsonStr = content.trim();
          if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
          else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
          if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
          cbgiResult = JSON.parse(jsonStr.trim());
        } catch {
          results.push({ orderId, success: false, error: 'Failed to parse AI response' });
          continue;
        }

        // Extract grades
        const analysis = cbgiResult.analysis || {};
        const cbgiScore = cbgiResult.cardboom_index || 0;
        const finalGrade = Math.round((cbgiScore / 10) * 10) / 10;

        const getGradeLabelFromScore = (score: number): string => {
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

        // Update order
        const { error: updateError } = await supabase
          .from('grading_orders')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            cbgi_json: cbgiResult,
            cbgi_score_0_100: cbgiScore,
            estimated_psa_range: cbgiResult.estimated_psa_range,
            cbgi_confidence: cbgiResult.confidence_level?.toLowerCase() || 'medium',
            cbgi_risk_flags: cbgiResult.risk_flags || [],
            final_grade: finalGrade,
            grade_label: getGradeLabelFromScore(cbgiScore),
            centering_grade: analysis.centering?.score || null,
            corners_grade: analysis.corners?.score || null,
            edges_grade: analysis.edges?.score || null,
            surface_grade: analysis.surface?.score || null,
            eye_appeal_grade: analysis.eye_appeal?.score || null,
            card_name: cbgiResult.card_name || order.card_name,
            set_name: cbgiResult.set || order.set_name,
            error_message: null,
            grading_notes: cbgiResult.grading_disclaimer,
          })
          .eq('id', orderId);

        if (updateError) {
          results.push({ orderId, success: false, error: 'Failed to update order' });
          continue;
        }

        results.push({ 
          orderId, 
          success: true, 
          cbgiScore,
          finalGrade,
          psaRange: cbgiResult.estimated_psa_range 
        });
        successCount++;

        console.log(`Regraded order ${orderId}: CBGI ${cbgiScore}/100`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (err) {
        console.error(`Error regrading ${orderId}:`, err);
        results.push({ orderId, success: false, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        totalCount: orderIds.length,
        successCount,
        results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Regrade error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});