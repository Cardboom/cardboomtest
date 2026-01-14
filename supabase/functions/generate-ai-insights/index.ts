import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIInsight {
  id: string;
  type: 'bullish' | 'bearish' | 'neutral' | 'opportunity';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  relatedItems?: string[];
  action?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch real market data for context
    const today = new Date().toISOString().split('T')[0];
    
    // Get recent market activity
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('total_amount, category, created_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .eq('status', 'completed')
      .limit(100);

    // Get trending items
    const { data: trendingItems } = await supabase
      .from('market_items')
      .select('name, category, current_price, price_change_24h')
      .order('volume_24h', { ascending: false })
      .limit(20);

    // Get recent listings
    const { data: recentListings } = await supabase
      .from('listings')
      .select('title, category, price, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50);

    // Calculate market stats
    const categoryVolume: Record<string, number> = {};
    const categoryPriceChanges: Record<string, number[]> = {};
    
    recentOrders?.forEach(order => {
      const cat = order.category || 'other';
      categoryVolume[cat] = (categoryVolume[cat] || 0) + (order.total_amount || 0);
    });

    trendingItems?.forEach(item => {
      const cat = item.category || 'other';
      if (!categoryPriceChanges[cat]) categoryPriceChanges[cat] = [];
      if (item.price_change_24h) categoryPriceChanges[cat].push(item.price_change_24h);
    });

    const marketContext = {
      date: today,
      topCategories: Object.entries(categoryVolume)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, vol]) => ({ category: cat, volume: vol })),
      trendingCards: trendingItems?.slice(0, 10).map(i => ({
        name: i.name,
        category: i.category,
        priceChange: i.price_change_24h
      })) || [],
      avgPriceChanges: Object.entries(categoryPriceChanges).map(([cat, changes]) => ({
        category: cat,
        avgChange: changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : 0
      })),
      recentListingsCount: recentListings?.length || 0,
    };

    if (!LOVABLE_API_KEY) {
      // Return fallback insights based on real data
      return new Response(
        JSON.stringify({ 
          insights: generateFallbackInsights(marketContext),
          source: 'fallback'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a TCG and collectibles market analyst for CardBoom. Today is ${today}. Generate 3-4 actionable market insights based on real data. Be specific about cards, sets, and price movements. Focus on Pokemon, One Piece, Yu-Gi-Oh, MTG, NBA, and NFL cards.`
          },
          {
            role: "user",
            content: `Based on this market data, generate insights:\n${JSON.stringify(marketContext, null, 2)}\n\nProvide bullish/bearish/opportunity signals with specific card recommendations.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_insights",
              description: "Generate market insights for TCG and collectibles",
              parameters: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        type: { type: "string", enum: ["bullish", "bearish", "neutral", "opportunity"] },
                        title: { type: "string", description: "Short title under 50 chars" },
                        description: { type: "string", description: "Insight description under 150 chars" },
                        confidence: { type: "number", minimum: 50, maximum: 95 },
                        impact: { type: "string", enum: ["high", "medium", "low"] },
                        relatedItems: { type: "array", items: { type: "string" } },
                        action: { type: "string", description: "Recommended action" }
                      },
                      required: ["id", "type", "title", "description", "confidence", "impact"]
                    }
                  }
                },
                required: ["insights"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_insights" } }
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      
      if (toolCall?.function?.arguments) {
        const parsed = JSON.parse(toolCall.function.arguments);
        if (parsed.insights && Array.isArray(parsed.insights)) {
          return new Response(
            JSON.stringify({ insights: parsed.insights, source: 'ai' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Fallback if AI fails
    return new Response(
      JSON.stringify({ 
        insights: generateFallbackInsights(marketContext),
        source: 'fallback'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('AI insights error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateFallbackInsights(context: any): AIInsight[] {
  const insights: AIInsight[] = [];
  
  // Generate insights based on real data
  if (context.topCategories.length > 0) {
    const topCat = context.topCategories[0];
    insights.push({
      id: '1',
      type: 'bullish',
      title: `${formatCategory(topCat.category)} Leading Volume`,
      description: `${formatCategory(topCat.category)} cards showing strong trading activity this week. Consider positions in popular sets.`,
      confidence: 72,
      impact: 'high',
      action: 'Monitor top performers in this category'
    });
  }

  if (context.trendingCards.length > 0) {
    const gainers = context.trendingCards.filter((c: any) => c.priceChange > 5);
    if (gainers.length > 0) {
      insights.push({
        id: '2',
        type: 'opportunity',
        title: 'Price Momentum Detected',
        description: `${gainers.length} cards showing 5%+ gains. Early movers may signal broader trend.`,
        confidence: 68,
        impact: 'medium',
        relatedItems: gainers.slice(0, 3).map((c: any) => c.name),
        action: 'Review trending cards for entry points'
      });
    }
  }

  if (context.avgPriceChanges.length > 0) {
    const bearish = context.avgPriceChanges.find((c: any) => c.avgChange < -3);
    if (bearish) {
      insights.push({
        id: '3',
        type: 'bearish',
        title: `${formatCategory(bearish.category)} Cooling Off`,
        description: `Average prices down ${Math.abs(bearish.avgChange).toFixed(1)}%. May present buying opportunity for patient collectors.`,
        confidence: 65,
        impact: 'medium',
        action: 'Watch for support levels before buying'
      });
    }
  }

  // Always include at least one insight
  if (insights.length === 0) {
    insights.push({
      id: '1',
      type: 'neutral',
      title: 'Market Consolidating',
      description: 'Trading activity steady across categories. Good time to research and build watchlists.',
      confidence: 60,
      impact: 'low',
      action: 'Set price alerts on target cards'
    });
  }

  return insights;
}

function formatCategory(cat: string): string {
  const map: Record<string, string> = {
    'pokemon': 'Pokémon',
    'one-piece': 'One Piece',
    'yugioh': 'Yu-Gi-Oh!',
    'magic': 'MTG',
    'nba': 'NBA',
    'nfl': 'NFL',
    'soccer': 'Soccer',
    'figures': 'Figures'
  };
  return map[cat?.toLowerCase()] || cat;
}
