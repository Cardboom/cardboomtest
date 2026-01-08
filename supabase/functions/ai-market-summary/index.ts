import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch CardBoom platform data for context
    // 1. Get trending cards (price movers)
    const { data: trendingCards } = await supabase
      .from('market_items')
      .select('name, category, current_price, change_7d, change_30d')
      .not('change_7d', 'is', null)
      .order('change_7d', { ascending: false })
      .limit(10);

    // 2. Get recent grading orders for platform grading average
    const { data: gradingOrders } = await supabase
      .from('grading_orders')
      .select('final_grade, created_at')
      .eq('status', 'completed')
      .not('final_grade', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    // Calculate platform grading average
    let platformGradingAvg = 0;
    if (gradingOrders && gradingOrders.length > 0) {
      const validGrades = gradingOrders
        .map(g => parseFloat(String(g.final_grade || '0')))
        .filter(g => !isNaN(g) && g > 0);
      if (validGrades.length > 0) {
        platformGradingAvg = validGrades.reduce((sum, g) => sum + g, 0) / validGrades.length;
      }
    }

    // 3. Calculate CardBoom Index (average 7d change across market)
    const { data: indexData } = await supabase
      .from('market_items')
      .select('change_7d')
      .not('change_7d', 'is', null)
      .limit(200);

    let cardBoomIndex = 0;
    if (indexData && indexData.length > 0) {
      cardBoomIndex = indexData.reduce((sum, i) => sum + (i.change_7d || 0), 0) / indexData.length;
    }

    // 4. Get recent activity volume
    const { count: recentSales } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    // 5. Get AI trending cards
    const { data: aiTrending } = await supabase
      .from('ai_trending_cards')
      .select('card_name, category, trend_reason, predicted_direction')
      .eq('is_active', true)
      .limit(5);

    // Build context for GPT
    const topGainers = trendingCards?.filter(c => (c.change_7d || 0) > 0).slice(0, 5) || [];
    const topLosers = trendingCards?.filter(c => (c.change_7d || 0) < 0).slice(0, 3) || [];
    const categories = [...new Set(trendingCards?.map(c => c.category) || [])];

    // Generate AI summary using Lovable AI
    const systemPrompt = `You are a TCG market analyst for CardBoom. Generate brief, insightful market summaries as if synthesizing community discussions and market sentiment. 

Rules:
- Sound natural, like summarizing what collectors are buzzing about
- Reference specific cards/categories when relevant
- Mix bullish and bearish takes for balance
- Keep each insight under 40 words
- DO NOT mention sources like "Reddit" or "TCGPlayer" explicitly
- Write in present tense, market-speak style
- Include sentiment indicators naturally

Output JSON with this structure:
{
  "communityBuzz": "String - What collectors are excited/worried about right now",
  "hotTake": "String - A bold market prediction or observation",
  "sleeper": "String - An undervalued card/category people should watch",
  "sentiment": "bullish" | "bearish" | "mixed"
}`;

    const userPrompt = `Generate market insights based on this CardBoom data:

TOP MOVERS (7d):
${topGainers.map(c => `+${(c.change_7d || 0).toFixed(1)}% ${c.name} (${c.category})`).join('\n')}

DECLINING:
${topLosers.map(c => `${(c.change_7d || 0).toFixed(1)}% ${c.name}`).join('\n')}

PLATFORM METRICS:
- CardBoom Index: ${cardBoomIndex >= 0 ? '+' : ''}${cardBoomIndex.toFixed(2)}%
- Platform Grading Avg: ${platformGradingAvg.toFixed(1)}/10
- Weekly Sales Volume: ${recentSales || 0} transactions
- Active Categories: ${categories.join(', ')}

${aiTrending && aiTrending.length > 0 ? `TRENDING SIGNALS:\n${aiTrending.map(t => `${t.card_name}: ${t.trend_reason}`).join('\n')}` : ''}

Generate fresh, engaging insights that sound like you're summarizing what the community is talking about.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      // Return fallback data
      return new Response(
        JSON.stringify({
          communityBuzz: 'Market showing mixed signals this week. Vintage cards holding steady while modern sets see rotation.',
          hotTake: 'Graded cards under $50 may be the play for Q1.',
          sleeper: 'Keep an eye on underpriced Japanese promos.',
          sentiment: 'mixed',
          cardBoomIndex: cardBoomIndex,
          platformGradingAvg: platformGradingAvg,
          weeklyVolume: recentSales || 0,
          generatedAt: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    // Parse JSON from response
    let aiInsights = {
      communityBuzz: 'Collectors are tracking market momentum closely this week.',
      hotTake: 'Quality over quantity seems to be the prevailing strategy.',
      sleeper: 'Watch for undervalued vintage cards in good condition.',
      sentiment: 'mixed' as 'bullish' | 'bearish' | 'mixed',
    };

    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        aiInsights = JSON.parse(jsonStr);
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
    }

    console.log('Generated AI market summary');

    return new Response(
      JSON.stringify({
        ...aiInsights,
        cardBoomIndex: cardBoomIndex,
        platformGradingAvg: platformGradingAvg,
        weeklyVolume: recentSales || 0,
        topMovers: topGainers.slice(0, 3).map(c => ({ name: c.name, change: c.change_7d })),
        generatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-market-summary:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
