import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CardBoom Indexer JSON Schema
interface CardBoomIndexResult {
  game: 'Pokemon' | 'One Piece' | 'MTG' | 'Yu-Gi-Oh' | 'Sports' | 'Lorcana' | 'Other';
  language: 'Japanese' | 'English' | 'Korean' | 'Chinese' | 'German' | 'French' | 'Other';
  card_name: { original: string | null; english: string | null };
  set: { name: string | null; code: string | null; release_year: number | null };
  card_number: string | null;
  rarity: string | null;
  card_type: string | null;
  attributes: {
    hp_or_power: string | null;
    element_or_color: string | null;
    cost: string | null;
  };
  cvi_key: string | null;
  confidence_score: number;
  needs_review: boolean;
  notes: string;
}

interface SingleCardResult {
  detected: boolean;
  cardName: string | null;
  cardNameEnglish: string | null;
  setName: string | null;
  setCode: string | null;
  cardNumber: string | null;
  rarity: string | null;
  cardType: string | null;
  estimatedCondition: string | null;
  category: string | null;
  language: string | null;
  cviKey: string | null;
  confidence: number;
  needsReview: boolean;
  notes: string | null;
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
    set_name: string | null;
    set_code: string | null;
    card_number: string | null;
    rarity: string | null;
  } | null;
}

const CARDBOOM_INDEXER_PROMPT = `You are CardBoom AI Card Indexer.

You are given an image of a trading card (Pokémon, One Piece, MTG, Yu-Gi-Oh, sports, Lorcana, or other TCG).

Your task:
1) Identify the card with maximum certainty
2) Extract ALL relevant metadata needed for a CardBoom card page + listing + grading
3) Return normalized data that can be saved to database and displayed in UI

RULES:
- NEVER return only a character name
- ALWAYS attempt to infer set using artwork, language, numbering, symbols, rarity marks, and layout
- If a field cannot be confirmed, return null and state why in notes
- Do NOT hallucinate set names, set codes, or card numbers
- Output MUST be valid JSON ONLY

RETURN THIS JSON SCHEMA:
{
  "game": "Pokemon | One Piece | MTG | Yu-Gi-Oh | Sports | Lorcana | Other",
  "language": "Japanese | English | Korean | Chinese | German | French | Other",
  "card_name": { "original": "string", "english": "string | null" },
  "set": { "name": "string | null", "code": "string | null", "release_year": "number | null" },
  "card_number": "string | null",
  "rarity": "string | null",
  "card_type": "string | null",
  "attributes": {
    "hp_or_power": "string | null",
    "element_or_color": "string | null",
    "cost": "string | null"
  },
  "cvi_key": "string | null",
  "confidence_score": 0.00,
  "needs_review": true,
  "notes": "string"
}

DERIVED FIELD RULES:
- cvi_key must be \`\${game}|\${set.code}|\${card_number}|\${language}\` IF set.code and card_number are known; else null.
- needs_review must be true if (set.code is null OR card_number is null OR confidence_score < 0.75)

CATEGORY MAPPING:
- "Pokemon" -> "pokemon"
- "One Piece" -> "onepiece"  
- "MTG" -> "mtg"
- "Yu-Gi-Oh" -> "yugioh"
- "Sports" -> "nba" (default sports, can be "football", "baseball", "soccer" based on content)
- "Lorcana" -> "lorcana"
- "Other" -> "tcg"`;

function mapGameToCategory(game: string): string {
  const mapping: Record<string, string> = {
    'Pokemon': 'pokemon',
    'One Piece': 'onepiece',
    'MTG': 'mtg',
    'Yu-Gi-Oh': 'yugioh',
    'Sports': 'nba',
    'Lorcana': 'lorcana',
    'Other': 'tcg'
  };
  return mapping[game] || 'tcg';
}

async function analyzeWithGPT(imageBase64: string, openaiKey: string): Promise<CardBoomIndexResult> {
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
          { role: 'system', content: CARDBOOM_INDEXER_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this trading card image and extract all visible information. Return only valid JSON.' },
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
        max_tokens: 800,
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
    
    // Build cvi_key if we have enough data
    let cviKey: string | null = null;
    if (parsed.set?.code && parsed.card_number) {
      cviKey = `${parsed.game}|${parsed.set.code}|${parsed.card_number}|${parsed.language}`;
    }
    
    // Determine if review is needed
    const needsReview = !parsed.set?.code || !parsed.card_number || (parsed.confidence_score || 0) < 0.75;
    
    return {
      game: parsed.game || 'Other',
      language: parsed.language || 'English',
      card_name: {
        original: parsed.card_name?.original || null,
        english: parsed.card_name?.english || parsed.card_name?.original || null,
      },
      set: {
        name: parsed.set?.name || null,
        code: parsed.set?.code || null,
        release_year: parsed.set?.release_year || null,
      },
      card_number: parsed.card_number || null,
      rarity: parsed.rarity || null,
      card_type: parsed.card_type || null,
      attributes: parsed.attributes || {
        hp_or_power: null,
        element_or_color: null,
        cost: null,
      },
      cvi_key: cviKey || parsed.cvi_key || null,
      confidence_score: typeof parsed.confidence_score === 'number' ? parsed.confidence_score : 0.5,
      needs_review: needsReview,
      notes: parsed.notes || '',
    };
  } catch (error) {
    console.error('GPT analysis error:', error);
    return {
      game: 'Other',
      language: 'English',
      card_name: { original: null, english: null },
      set: { name: null, code: null, release_year: null },
      card_number: null,
      rarity: null,
      card_type: null,
      attributes: { hp_or_power: null, element_or_color: null, cost: null },
      cvi_key: null,
      confidence_score: 0,
      needs_review: true,
      notes: 'Failed to analyze image',
    };
  }
}

async function enrichWithMarketData(
  supabase: any,
  indexResult: CardBoomIndexResult
): Promise<SingleCardResult> {
  let matchedItem = null;
  let pricing = null;

  const category = mapGameToCategory(indexResult.game);
  
  // Prefer English name for searching
  const nameToSearch = indexResult.card_name.english || indexResult.card_name.original;
  
  if (nameToSearch) {
    const searchName = nameToSearch
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    console.log('Searching for card:', searchName, 'Category:', category);

    // First try to find by cvi_key if available
    if (indexResult.cvi_key) {
      const { data: cviMatch } = await supabase
        .from('market_items')
        .select('*')
        .eq('cvi_key', indexResult.cvi_key)
        .single();
      
      if (cviMatch) {
        matchedItem = cviMatch;
      }
    }
    
    // Fallback: search by name and category
    if (!matchedItem) {
      let query = supabase
        .from('market_items')
        .select('*')
        .ilike('name', `%${searchName}%`);
      
      if (category) {
        query = query.eq('category', category);
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
  }

  // Boost confidence if we found a market match
  let finalConfidence = indexResult.confidence_score;
  if (matchedItem && finalConfidence < 0.85) {
    finalConfidence = Math.min(0.9, finalConfidence + 0.15);
  }

  // Re-evaluate needs_review with boosted confidence
  const needsReview = !indexResult.set.code || !indexResult.card_number || finalConfidence < 0.75;

  return {
    detected: !!(indexResult.card_name.original || indexResult.card_name.english),
    cardName: indexResult.card_name.original,
    cardNameEnglish: indexResult.card_name.english,
    setName: matchedItem?.set_name || indexResult.set.name,
    setCode: matchedItem?.set_code || indexResult.set.code,
    cardNumber: matchedItem?.card_number || indexResult.card_number,
    rarity: matchedItem?.rarity || indexResult.rarity,
    cardType: indexResult.card_type,
    estimatedCondition: 'Near Mint', // Default, will be refined by grading
    category: matchedItem?.category || category,
    language: indexResult.language,
    cviKey: indexResult.cvi_key,
    confidence: finalConfidence,
    needsReview,
    notes: indexResult.notes,
    ocrText: [],
    pricing,
    matchedMarketItem: matchedItem ? {
      id: matchedItem.id,
      name: matchedItem.name,
      category: matchedItem.category,
      image_url: matchedItem.image_url,
      set_name: matchedItem.set_name,
      set_code: matchedItem.set_code,
      card_number: matchedItem.card_number,
      rarity: matchedItem.rarity,
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

    console.log('Analyzing card with CardBoom AI Indexer...');
    
    // Analyze with GPT Vision using CardBoom Indexer prompt
    const indexResult = await analyzeWithGPT(base64Image, openaiKey);
    console.log('Index result:', indexResult);

    // Enrich with market data
    const result = await enrichWithMarketData(supabase, indexResult);

    console.log('Final analysis result:', { 
      detected: result.detected, 
      cardName: result.cardName,
      cardNameEnglish: result.cardNameEnglish,
      category: result.category,
      setCode: result.setCode,
      cardNumber: result.cardNumber,
      cviKey: result.cviKey,
      confidence: result.confidence,
      needsReview: result.needsReview,
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
