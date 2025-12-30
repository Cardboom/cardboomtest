import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Ximilar Card Recognition API
const XIMILAR_RECOGNITION_URL = "https://api.ximilar.com/recognition/v2/classify";
const XIMILAR_OCR_URL = "https://api.ximilar.com/ocr/v2/detect";

interface CardAnalysisResult {
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
        JSON.stringify({ error: 'Image analysis service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Analyzing card image...');

    // Prepare image for Ximilar
    const imagePayload = imageBase64 
      ? { _base64: imageBase64 }
      : { _url: imageUrl };

    // Step 1: OCR to extract text from card
    let ocrText: string[] = [];
    try {
      const ocrResponse = await fetch(XIMILAR_OCR_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${ximilarToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: [imagePayload]
        })
      });

      const ocrData = await ocrResponse.json();
      console.log('OCR response received');

      if (ocrData.records && ocrData.records[0]) {
        const texts = ocrData.records[0]._objects || [];
        ocrText = texts.map((obj: any) => obj.text || obj._text || '').filter((t: string) => t.length > 0);
      }
    } catch (ocrError) {
      console.error('OCR failed, continuing with recognition:', ocrError);
    }

    // Step 2: Try to extract card info from OCR text
    let extractedCardName = '';
    let extractedSetName = '';
    let extractedCardNumber = '';

    // Common patterns for card numbers: "123/456", "#123", "No. 123"
    const cardNumberPattern = /(\d{1,4})\s*\/\s*\d{1,4}|#\s*(\d+)|No\.?\s*(\d+)/i;
    
    for (const text of ocrText) {
      const match = text.match(cardNumberPattern);
      if (match) {
        extractedCardNumber = match[1] || match[2] || match[3];
      }
      
      // Look for set indicators (common TCG set patterns)
      if (text.match(/\b(base|jungle|fossil|team rocket|neo|gym|legendary|e-series|ex|diamond|pearl|platinum|heartgold|soulsilver|black|white|xy|sun|moon|sword|shield|scarlet|violet|151|obsidian|paldea|prismatic|surging)\b/i)) {
        extractedSetName = text;
      }
    }

    // The longest text is likely the card name
    if (ocrText.length > 0) {
      const sortedByLength = [...ocrText].sort((a, b) => b.length - a.length);
      // Filter out numbers and very short strings
      const potentialNames = sortedByLength.filter(t => 
        t.length > 3 && 
        !t.match(/^\d+/) && 
        !t.match(/^(HP|ATK|DEF|\d+\/\d+)$/i)
      );
      if (potentialNames.length > 0) {
        extractedCardName = potentialNames[0];
      }
    }

    console.log('Extracted:', { extractedCardName, extractedSetName, extractedCardNumber });

    // Step 3: Search for matching market items
    let matchedItem = null;
    let pricing = null;

    if (extractedCardName) {
      // Clean up the card name for search
      const searchName = extractedCardName
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

      // Search market_items for matching cards
      let query = supabase
        .from('market_items')
        .select('*')
        .gt('current_price', 0);

      // Try exact match first, then fuzzy
      const { data: exactMatch } = await supabase
        .from('market_items')
        .select('*')
        .ilike('name', `%${searchName}%`)
        .gt('current_price', 0)
        .order('current_price', { ascending: false })
        .limit(10);

      if (exactMatch && exactMatch.length > 0) {
        matchedItem = exactMatch[0];

        // Calculate pricing intelligence
        const prices = exactMatch.map(item => item.current_price).filter(p => p > 0);
        const sortedPrices = [...prices].sort((a, b) => a - b);
        
        const lowestActive = sortedPrices[0];
        const medianSold = sortedPrices[Math.floor(sortedPrices.length / 2)];
        
        // Get 7-day trend from the first item (it has change_7d)
        const trend7d = matchedItem.change_7d || 0;
        
        // Calculate quick sell (85% of median) and max profit (110% of median)
        const quickSellPrice = Math.round(medianSold * 0.85 * 100) / 100;
        const maxProfitPrice = Math.round(medianSold * 1.10 * 100) / 100;

        // Determine price confidence based on sample size
        let priceConfidence: 'high' | 'medium' | 'low' = 'low';
        if (exactMatch.length >= 5) priceConfidence = 'high';
        else if (exactMatch.length >= 3) priceConfidence = 'medium';
        
        // Determine trend direction with proper typing
        const trendDirection: 'up' | 'down' | 'stable' = trend7d > 2 ? 'up' : trend7d < -2 ? 'down' : 'stable';

        pricing = {
          lowestActive,
          medianSold,
          trend7d,
          trendDirection,
          quickSellPrice,
          maxProfitPrice,
          priceConfidence,
          salesCount: exactMatch.length,
          listingsCount: exactMatch.length,
        };
      }
    }

    // Estimate condition from OCR (look for condition keywords)
    let estimatedCondition = 'Near Mint';
    const conditionKeywords = ocrText.join(' ').toLowerCase();
    if (conditionKeywords.includes('mint') || conditionKeywords.includes('gem')) {
      estimatedCondition = 'Mint';
    } else if (conditionKeywords.includes('excellent') || conditionKeywords.includes('ex')) {
      estimatedCondition = 'Excellent';
    } else if (conditionKeywords.includes('good') || conditionKeywords.includes('gd')) {
      estimatedCondition = 'Good';
    }

    // Determine category from matched item or OCR clues
    let category = matchedItem?.category || null;
    if (!category) {
      const textLower = ocrText.join(' ').toLowerCase();
      if (textLower.includes('pokémon') || textLower.includes('pokemon')) category = 'pokemon';
      else if (textLower.includes('magic') || textLower.includes('mtg')) category = 'mtg';
      else if (textLower.includes('yu-gi-oh') || textLower.includes('yugioh')) category = 'yugioh';
      else if (textLower.includes('one piece')) category = 'onepiece';
      else if (textLower.includes('lorcana')) category = 'lorcana';
      else if (textLower.includes('nba') || textLower.includes('basketball')) category = 'nba';
      else if (textLower.includes('nfl') || textLower.includes('football')) category = 'football';
    }

    const result: CardAnalysisResult = {
      detected: extractedCardName.length > 0 || (matchedItem !== null),
      cardName: matchedItem?.name || extractedCardName || null,
      setName: matchedItem?.set_name || extractedSetName || null,
      cardNumber: extractedCardNumber || null,
      estimatedCondition,
      category,
      confidence: matchedItem ? 0.85 : (extractedCardName ? 0.6 : 0.3),
      ocrText,
      pricing,
      matchedMarketItem: matchedItem ? {
        id: matchedItem.id,
        name: matchedItem.name,
        category: matchedItem.category,
        image_url: matchedItem.image_url,
      } : null,
    };

    console.log('Analysis complete:', { 
      detected: result.detected, 
      cardName: result.cardName,
      confidence: result.confidence,
      hasPricing: !!result.pricing 
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
