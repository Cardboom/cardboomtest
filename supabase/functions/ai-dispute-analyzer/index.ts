import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { disputeId, disputeType, description, orderAmount, buyerEvidence, sellerResponse, sellerEvidence } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const systemPrompt = `You are an AI dispute resolution assistant for CardBoom, a TCG card and collectibles marketplace.
Your role is to analyze order disputes and provide fair, balanced recommendations.

Dispute Types:
- item_not_received: Buyer claims item never arrived
- item_not_as_described: Item differs from listing description
- counterfeit: Buyer suspects the item is fake
- damaged: Item arrived damaged
- wrong_item: Received different item than ordered
- other: Other issues

Analysis Guidelines:
1. Consider both buyer and seller perspectives fairly
2. Look for evidence supporting each party's claims
3. Consider marketplace policies and TCG industry standards
4. For counterfeit claims, recommend professional authentication
5. Consider order value in resolution recommendations

Respond in JSON format:
{
  "summary": "Brief objective summary of the dispute",
  "buyerPosition": "Summary of buyer's claims and evidence",
  "sellerPosition": "Summary of seller's response and evidence",
  "keyFactors": ["factor1", "factor2"],
  "recommendation": "full_refund|partial_refund|favor_seller|require_return|need_more_info",
  "recommendedRefundPercent": 0-100,
  "confidenceScore": 0-100,
  "reasoning": "Detailed explanation of the recommendation",
  "suggestedNextSteps": ["step1", "step2"]
}`;

    const userPrompt = `Dispute Analysis Request:

Dispute Type: ${disputeType}
Order Amount: $${orderAmount}

Buyer's Description:
${description}

${buyerEvidence ? `Buyer's Evidence: ${JSON.stringify(buyerEvidence)}` : 'No buyer evidence provided'}

${sellerResponse ? `Seller's Response: ${sellerResponse}` : 'Seller has not responded yet'}

${sellerEvidence ? `Seller's Evidence: ${JSON.stringify(sellerEvidence)}` : 'No seller evidence provided'}

Analyze this dispute and provide your recommendation.`;

    console.log('Calling OpenAI for dispute analysis...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.5,
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response
    let analysis;
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      analysis = {
        summary: content,
        recommendation: 'need_more_info',
        confidenceScore: 50,
        reasoning: 'AI analysis completed but requires manual review',
        suggestedNextSteps: ['Review dispute details manually']
      };
    }

    // If disputeId provided, update the dispute in database
    if (disputeId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase
        .from('order_disputes')
        .update({
          ai_analysis: analysis,
          ai_summary: analysis.summary,
          ai_recommendation: analysis.recommendation,
          ai_confidence_score: analysis.confidenceScore,
        })
        .eq('id', disputeId);

      console.log('Updated dispute with AI analysis:', disputeId);
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-dispute-analyzer:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
