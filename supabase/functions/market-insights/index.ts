import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { itemName, category, currentPrice, priceHistory, recentSales } = await req.json();

    if (!itemName) {
      return new Response(
        JSON.stringify({ error: 'itemName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating market insights for: ${itemName}`);

    const systemPrompt = `You are a collectibles market analyst specializing in trading cards, sports cards, and collectible figures. Provide concise, actionable insights based on market data. Focus on:
- Current market sentiment (bullish/bearish/neutral)
- Price trend analysis
- Buy/sell/hold recommendation with reasoning
- Key factors affecting price
Keep responses under 200 words and use bullet points.`;

    const userPrompt = `Analyze this collectible:
Item: ${itemName}
Category: ${category || 'Unknown'}
Current Price: $${currentPrice || 'Unknown'}
${priceHistory ? `Recent Price History: ${JSON.stringify(priceHistory)}` : ''}
${recentSales ? `Recent Sales Data: ${JSON.stringify(recentSales.slice(0, 5))}` : ''}

Provide market insights including sentiment, trend analysis, and recommendation.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI analysis failed', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const insight = data.choices[0]?.message?.content || 'Unable to generate insights';

    console.log(`Generated insights for: ${itemName}`);

    return new Response(
      JSON.stringify({
        insight,
        itemName,
        generatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in market-insights:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
