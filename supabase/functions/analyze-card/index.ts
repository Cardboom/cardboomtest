import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SingleCardResult {
  detected: boolean;
  cardName: string | null;
  setName: string | null;
  cardNumber: string | null;
  estimatedCondition: string | null;
  category: string | null;
  confidence: number;
  ocrText: string[];
  pricing: {
    lowestActive: number | null;
    medianSold: number | null;
    trend7d: number | null;
    trendDirection: 'up' | 'down' | 'stable';
    quickSellPrice: number | null;
    maxProfitPrice: number | null;
    priceConfidence: 'high' | 'medium' | 'low';
    salesCount: number;
    listingsCount: number;
  } | null;
  matchedMarketItem: {
    id: string;
    name: string;
    category: string;
    image_url: string | null;
  } | null;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

interface GPTCardAnalysis {
  detected: boolean;
  cardName: string | null;
  setName: string | null;
  cardNumber: string | null;
  category: string | null;
  estimatedCondition: string | null;
  confidence: number;
  notes: string | null;
}

async function analyzeWithGPT(imageBase64: string, openaiKey: string): Promise<GPTCardAnalysis> {
  const systemPrompt = `You are CardBoom's AI Card Recognition system. Analyze the uploaded image and extract trading card information.

STRICT RULES:
1. If you see a trading card (Pokemon, Magic: The Gathering, Yu-Gi-Oh!, One Piece, Lorcana, sports cards, etc.), set detected=true
2. Extract the card name, set name, card number, and category
3. Estimate the condition based on visible wear (Mint, Near Mint, Excellent, Good, Poor)
4. Confidence should be 0.9+ if you can clearly read the card name, 0.7-0.9 if partially visible, 0.5-0.7 if guessing

CATEGORY VALUES (use exactly):
- "pokemon" for Pokemon cards
- "mtg" for Magic: The Gathering
- "yugioh" for Yu-Gi-Oh! cards
- "onepiece" for One Piece TCG
- "lorcana" for Disney Lorcana
- "nba" for basketball cards
- "football" for NFL/football cards
- "baseball" for baseball cards
- "soccer" for soccer/football cards
- "figures" for collectible figures
- "gaming" for gaming items

Return ONLY valid JSON with this exact structure:
{
  "detected": boolean,
  "cardName": string or null,
  "setName": string or null,
  "cardNumber": string or null,
  "category": string or null,
  "estimatedCondition": string or null,
  "confidence": number (0-1),
  "notes": string or null
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this trading card image and extract all visible information.' },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = content;
    if (content.includes('```json')) {
      jsonStr = content.split('```json')[1].split('```')[0].trim();
    } else if (content.includes('```')) {
      jsonStr = content.split('```')[1].split('```')[0].trim();
    }
    
    const parsed = JSON.parse(jsonStr);
    return {
      detected: parsed.detected ?? false,
      cardName: parsed.cardName || null,
      setName: parsed.setName || null,
      cardNumber: parsed.cardNumber || null,
      category: parsed.category || null,
      estimatedCondition: parsed.estimatedCondition || 'Near Mint',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      notes: parsed.notes || null,
    };
  } catch (error) {
    console.error('GPT analysis error:', error);
    return {
      detected: false,
      cardName: null,
      setName: null,
      cardNumber: null,
      category: null,
      estimatedCondition: null,
      confidence: 0,
      notes: null,
    };
  }
}

async function enrichWithMarketData(
  supabase: any,
  gptAnalysis: GPTCardAnalysis
): Promise<SingleCardResult> {
  let matchedItem = null;
  let pricing = null;

  if (gptAnalysis.cardName) {
    const searchName = gptAnalysis.cardName
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    // Search for matching market items
    let query = supabase
      .from('market_items')
      .select('*')
      .ilike('name', `%${searchName}%`);
    
    // Filter by category if detected
    if (gptAnalysis.category) {
      query = query.eq('category', gptAnalysis.category);
    }

    const { data: matches } = await query
      .order('current_price', { ascending: false })
      .limit(10);

    if (matches && matches.length > 0) {
      matchedItem = matches[0];

      const prices = matches.map((item: any) => item.current_price).filter((p: number) => p > 0);
      const sortedPrices = [...prices].sort((a, b) => a - b);
      
      if (sortedPrices.length > 0) {
        const lowestActive = sortedPrices[0];
        const medianSold = sortedPrices[Math.floor(sortedPrices.length / 2)];
        const trend7d = matchedItem.change_7d || 0;
        const quickSellPrice = Math.round(medianSold * 0.85 * 100) / 100;
        const maxProfitPrice = Math.round(medianSold * 1.10 * 100) / 100;

        let priceConfidence: 'high' | 'medium' | 'low' = 'low';
        if (matches.length >= 5) priceConfidence = 'high';
        else if (matches.length >= 3) priceConfidence = 'medium';
        
        const trendDirection: 'up' | 'down' | 'stable' = trend7d > 2 ? 'up' : trend7d < -2 ? 'down' : 'stable';

        pricing = {
          lowestActive,
          medianSold,
          trend7d,
          trendDirection,
          quickSellPrice,
          maxProfitPrice,
          priceConfidence,
          salesCount: matches.length,
          listingsCount: matches.length,
        };
      }
    }
  }

  // Boost confidence if we found a market match
  let finalConfidence = gptAnalysis.confidence;
  if (matchedItem && finalConfidence < 0.85) {
    finalConfidence = Math.min(0.9, finalConfidence + 0.15);
  }

  return {
    detected: gptAnalysis.detected,
    cardName: matchedItem?.name || gptAnalysis.cardName,
    setName: matchedItem?.set_name || gptAnalysis.setName,
    cardNumber: gptAnalysis.cardNumber,
    estimatedCondition: gptAnalysis.estimatedCondition || 'Near Mint',
    category: matchedItem?.category || gptAnalysis.category,
    confidence: finalConfidence,
    ocrText: [], // GPT doesn't return raw OCR
    pricing,
    matchedMarketItem: matchedItem ? {
      id: matchedItem.id,
      name: matchedItem.name,
      category: matchedItem.category,
      image_url: matchedItem.image_url,
    } : null,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, imageBase64 } = await req.json();

    if (!imageUrl && !imageBase64) {
      return new Response(
        JSON.stringify({ error: 'imageUrl or imageBase64 is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Convert URL to base64 if needed
    let base64Image = imageBase64;
    if (imageUrl && !imageBase64) {
      try {
        const imgResponse = await fetch(imageUrl);
        const arrayBuffer = await imgResponse.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        base64Image = btoa(String.fromCharCode(...uint8Array));
      } catch (e) {
        console.error('Failed to fetch image URL:', e);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch image' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Analyzing card with GPT Vision...');
    
    // Analyze with GPT Vision
    const gptAnalysis = await analyzeWithGPT(base64Image, openaiKey);
    console.log('GPT analysis result:', gptAnalysis);

    // Enrich with market data
    const result = await enrichWithMarketData(supabase, gptAnalysis);

    console.log('Final analysis result:', { 
      detected: result.detected, 
      cardName: result.cardName,
      category: result.category,
      confidence: result.confidence,
      hasMatch: !!result.matchedMarketItem
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-card:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
