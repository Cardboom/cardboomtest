import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Ximilar TCG Identification API
const XIMILAR_TCG_ENDPOINT = 'https://api.ximilar.com/collectibles/v2/identify';

interface XimilarTCGResult {
  records: Array<{
    _status: { code: number; text: string };
    _id: string;
    best_match?: {
      name: string;
      set_name?: string;
      set_code?: string;
      card_number?: string;
      rarity?: string;
      language?: string;
      game?: string;
      _id?: string;
      prob?: number;
      image_url?: string;
    };
    matches?: Array<{
      name: string;
      set_name?: string;
      set_code?: string;
      card_number?: string;
      rarity?: string;
      language?: string;
      game?: string;
      _id?: string;
      prob?: number;
    }>;
    _width?: number;
    _height?: number;
  }>;
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
  ximilarId: string | null;
}

function mapGameToCategory(game: string | undefined): string {
  if (!game) return 'tcg';
  const gameLower = game.toLowerCase();
  
  if (gameLower.includes('pokemon') || gameLower.includes('pokémon')) return 'pokemon';
  if (gameLower.includes('one piece')) return 'onepiece';
  if (gameLower.includes('magic') || gameLower === 'mtg') return 'mtg';
  if (gameLower.includes('yu-gi-oh') || gameLower.includes('yugioh')) return 'yugioh';
  if (gameLower.includes('lorcana')) return 'lorcana';
  if (gameLower.includes('sports') || gameLower.includes('nba') || gameLower.includes('nfl') || gameLower.includes('mlb')) return 'nba';
  
  return 'tcg';
}

async function analyzeWithXimilar(imageBase64: string, ximilarToken: string): Promise<{
  cardName: string | null;
  cardNameEnglish: string | null;
  setName: string | null;
  setCode: string | null;
  cardNumber: string | null;
  rarity: string | null;
  language: string | null;
  game: string | null;
  confidence: number;
  ximilarId: string | null;
  notes: string;
}> {
  try {
    console.log('Calling Ximilar TCG Identification API...');
    
    const response = await fetch(XIMILAR_TCG_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${ximilarToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: [
          {
            _base64: imageBase64,
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ximilar API error:', response.status, errorText);
      throw new Error(`Ximilar API error: ${response.status} - ${errorText}`);
    }

    const data: XimilarTCGResult = await response.json();
    console.log('Ximilar response:', JSON.stringify(data, null, 2));

    if (!data.records || data.records.length === 0) {
      return {
        cardName: null,
        cardNameEnglish: null,
        setName: null,
        setCode: null,
        cardNumber: null,
        rarity: null,
        language: null,
        game: null,
        confidence: 0,
        ximilarId: null,
        notes: 'No card detected by Ximilar',
      };
    }

    const record = data.records[0];
    const bestMatch = record.best_match;

    if (!bestMatch) {
      return {
        cardName: null,
        cardNameEnglish: null,
        setName: null,
        setCode: null,
        cardNumber: null,
        rarity: null,
        language: null,
        game: null,
        confidence: 0,
        ximilarId: record._id || null,
        notes: 'Card detected but no match found in Ximilar database',
      };
    }

    const confidence = bestMatch.prob || 0;
    
    return {
      cardName: bestMatch.name || null,
      cardNameEnglish: bestMatch.name || null, // Ximilar returns English names
      setName: bestMatch.set_name || null,
      setCode: bestMatch.set_code || null,
      cardNumber: bestMatch.card_number || null,
      rarity: bestMatch.rarity || null,
      language: bestMatch.language || 'English',
      game: bestMatch.game || null,
      confidence,
      ximilarId: bestMatch._id || record._id || null,
      notes: `Ximilar match confidence: ${(confidence * 100).toFixed(1)}%`,
    };
  } catch (error) {
    console.error('Ximilar analysis error:', error);
    return {
      cardName: null,
      cardNameEnglish: null,
      setName: null,
      setCode: null,
      cardNumber: null,
      rarity: null,
      language: null,
      game: null,
      confidence: 0,
      ximilarId: null,
      notes: `Ximilar error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function enrichWithMarketData(
  supabase: any,
  ximilarResult: {
    cardName: string | null;
    cardNameEnglish: string | null;
    setName: string | null;
    setCode: string | null;
    cardNumber: string | null;
    rarity: string | null;
    language: string | null;
    game: string | null;
    confidence: number;
    ximilarId: string | null;
    notes: string;
  }
): Promise<SingleCardResult> {
  let matchedItem = null;
  let pricing = null;

  const category = mapGameToCategory(ximilarResult.game || undefined);
  const nameToSearch = ximilarResult.cardNameEnglish || ximilarResult.cardName;
  
  // Build cvi_key if we have enough data
  let cviKey: string | null = null;
  if (ximilarResult.setCode && ximilarResult.cardNumber && ximilarResult.game) {
    const language = ximilarResult.language || 'English';
    cviKey = `${ximilarResult.game}|${ximilarResult.setCode}|${ximilarResult.cardNumber}|${language}`;
  }

  if (nameToSearch) {
    const searchName = nameToSearch
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    console.log('Searching for card:', searchName, 'Category:', category, 'CVI Key:', cviKey);

    // First try to find by cvi_key if available
    if (cviKey) {
      const { data: cviMatch } = await supabase
        .from('market_items')
        .select('*')
        .eq('cvi_key', cviKey)
        .single();
      
      if (cviMatch) {
        matchedItem = cviMatch;
        console.log('Found exact CVI key match:', cviMatch.name);
      }
    }
    
    // Fallback: search by set_code + card_number
    if (!matchedItem && ximilarResult.setCode && ximilarResult.cardNumber) {
      const { data: setMatch } = await supabase
        .from('market_items')
        .select('*')
        .eq('set_code', ximilarResult.setCode)
        .eq('card_number', ximilarResult.cardNumber)
        .limit(1);
      
      if (setMatch && setMatch.length > 0) {
        matchedItem = setMatch[0];
        console.log('Found set+number match:', matchedItem.name);
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
        console.log('Found name match:', matchedItem.name);

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
  let finalConfidence = ximilarResult.confidence;
  if (matchedItem && finalConfidence < 0.85) {
    finalConfidence = Math.min(0.9, finalConfidence + 0.15);
  }

  // Determine if review is needed
  const needsReview = !ximilarResult.setCode || !ximilarResult.cardNumber || finalConfidence < 0.75;

  return {
    detected: !!(ximilarResult.cardName || ximilarResult.cardNameEnglish),
    cardName: ximilarResult.cardName,
    cardNameEnglish: ximilarResult.cardNameEnglish,
    setName: matchedItem?.set_name || ximilarResult.setName,
    setCode: matchedItem?.set_code || ximilarResult.setCode,
    cardNumber: matchedItem?.card_number || ximilarResult.cardNumber,
    rarity: matchedItem?.rarity || ximilarResult.rarity,
    cardType: null,
    estimatedCondition: 'Near Mint',
    category: matchedItem?.category || category,
    language: ximilarResult.language || 'English',
    cviKey,
    confidence: finalConfidence,
    needsReview,
    notes: ximilarResult.notes,
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
    ximilarId: ximilarResult.ximilarId,
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

    const ximilarToken = Deno.env.get('XIMILAR_API_TOKEN');
    if (!ximilarToken) {
      console.error('XIMILAR_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Card recognition service not configured' }),
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

    console.log('Analyzing card with Ximilar TCG Identification...');
    
    // Analyze with Ximilar TCG Identification API
    const ximilarResult = await analyzeWithXimilar(base64Image, ximilarToken);
    console.log('Ximilar result:', ximilarResult);

    // Enrich with market data
    const result = await enrichWithMarketData(supabase, ximilarResult);

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
      hasMatch: !!result.matchedMarketItem,
      ximilarId: result.ximilarId,
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
