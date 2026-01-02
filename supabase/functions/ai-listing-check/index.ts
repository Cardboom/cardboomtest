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
    const { listingId, title, description, price, category, condition, images, reportType, reportDescription } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const systemPrompt = `You are an AI listing quality analyzer for CardBoom, a TCG card and collectibles marketplace.
Your role is to evaluate listings for quality, authenticity indicators, and potential issues.

Categories on CardBoom:
- pokemon, yugioh, mtg (Magic: The Gathering), lorcana, one-piece, sports (sports cards)
- figures (collectible figures like Funko, KAWS, etc.)
- gaming (gaming items, vouchers)

Quality Indicators to Check:
1. Title Quality: Clear, accurate, includes key details (card name, set, condition)
2. Description Quality: Detailed, honest about condition, includes relevant info
3. Price Reasonableness: Compare to typical market values
4. Authenticity Red Flags: Too-good-to-be-true prices, vague descriptions, stock photos
5. Policy Compliance: No prohibited items, proper condition ratings

Red Flags for Scams:
- Price significantly below market value (>60% discount)
- Generic or copy-pasted descriptions
- Missing key card details (set, number, edition)
- Suspicious claims without proof
- New seller with high-value items

Respond in JSON format:
{
  "qualityScore": 0-100,
  "flags": ["flag1", "flag2"],
  "flagDetails": {
    "pricing": "normal|suspicious|concerning",
    "description": "good|adequate|poor",
    "authenticity": "likely_authentic|needs_verification|suspicious"
  },
  "recommendations": ["improvement1", "improvement2"],
  "summary": "Brief assessment of the listing",
  "riskLevel": "low|medium|high|critical",
  "suggestedAction": "approve|review|flag|reject"
}`;

    let userPrompt = `Listing Analysis Request:

Title: ${title}
Category: ${category}
Condition: ${condition}
Price: $${price}

Description:
${description || 'No description provided'}

Images: ${images?.length || 0} image(s) provided`;

    if (reportType) {
      userPrompt += `

⚠️ THIS LISTING HAS BEEN REPORTED
Report Type: ${reportType}
Report Reason: ${reportDescription || 'No additional details'}`;
    }

    userPrompt += `

Analyze this listing for quality and potential issues.`;

    console.log('Calling OpenAI for listing analysis...');

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
        temperature: 0.3,
        max_tokens: 800,
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
        qualityScore: 70,
        flags: [],
        summary: content,
        riskLevel: 'medium',
        suggestedAction: 'review'
      };
    }

    // If listingId provided, update the listing in database
    if (listingId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase
        .from('listings')
        .update({
          ai_quality_score: analysis.qualityScore,
          ai_flags: analysis.flags,
          ai_analysis: analysis,
          ai_checked_at: new Date().toISOString(),
        })
        .eq('id', listingId);

      console.log('Updated listing with AI analysis:', listingId);
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-listing-check:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
