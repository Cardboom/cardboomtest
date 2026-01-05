import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Ximilar APIs
const XIMILAR_OCR_URL = "https://api.ximilar.com/ocr/v2/detect";
const XIMILAR_DETECT_URL = "https://api.ximilar.com/detection/v2/detect";

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

interface BatchAnalysisResult {
  totalDetected: number;
  cards: SingleCardResult[];
}

async function analyzeCardRegion(
  supabase: any,
  ocrText: string[],
  ximilarToken: string,
  hasImageContent: boolean = true // Flag indicating if an image with content was provided
): Promise<Omit<SingleCardResult, 'boundingBox'>> {
  // Extract card info from OCR text
  let extractedCardName = '';
  let extractedSetName = '';
  let extractedCardNumber = '';

  const cardNumberPattern = /(\d{1,4})\s*\/\s*\d{1,4}|#\s*(\d+)|No\.?\s*(\d+)/i;
  
  for (const text of ocrText) {
    const match = text.match(cardNumberPattern);
    if (match) {
      extractedCardNumber = match[1] || match[2] || match[3];
    }
    
    if (text.match(/\b(base|jungle|fossil|team rocket|neo|gym|legendary|e-series|ex|diamond|pearl|platinum|heartgold|soulsilver|black|white|xy|sun|moon|sword|shield|scarlet|violet|151|obsidian|paldea|prismatic|surging|op01|op02|op03|op04|op05|op06|op07|op08|op09)\b/i)) {
      extractedSetName = text;
    }
  }

  if (ocrText.length > 0) {
    const sortedByLength = [...ocrText].sort((a, b) => b.length - a.length);
    const potentialNames = sortedByLength.filter(t => 
      t.length > 3 && 
      !t.match(/^\d+/) && 
      !t.match(/^(HP|ATK|DEF|\d+\/\d+)$/i)
    );
    if (potentialNames.length > 0) {
      extractedCardName = potentialNames[0];
    }
  }

  // Determine if a card-like object was detected
  // If we have ANY OCR text, we likely have a card (even if we can't identify it)
  const hasCardLikeContent = ocrText.length > 0 || hasImageContent;

  // Search for matching market items
  let matchedItem = null;
  let pricing = null;

  if (extractedCardName) {
    const searchName = extractedCardName
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    const { data: exactMatch } = await supabase
      .from('market_items')
      .select('*')
      .ilike('name', `%${searchName}%`)
      .order('current_price', { ascending: false })
      .limit(10);

    if (exactMatch && exactMatch.length > 0) {
      matchedItem = exactMatch[0];

      const prices = exactMatch.map((item: any) => item.current_price).filter((p: number) => p > 0);
      const sortedPrices = [...prices].sort((a, b) => a - b);
      
      if (sortedPrices.length > 0) {
        const lowestActive = sortedPrices[0];
        const medianSold = sortedPrices[Math.floor(sortedPrices.length / 2)];
        const trend7d = matchedItem.change_7d || 0;
        const quickSellPrice = Math.round(medianSold * 0.85 * 100) / 100;
        const maxProfitPrice = Math.round(medianSold * 1.10 * 100) / 100;

        let priceConfidence: 'high' | 'medium' | 'low' = 'low';
        if (exactMatch.length >= 5) priceConfidence = 'high';
        else if (exactMatch.length >= 3) priceConfidence = 'medium';
        
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
  }

  let estimatedCondition = 'Near Mint';
  const conditionKeywords = ocrText.join(' ').toLowerCase();
  if (conditionKeywords.includes('mint') || conditionKeywords.includes('gem')) {
    estimatedCondition = 'Mint';
  } else if (conditionKeywords.includes('excellent') || conditionKeywords.includes('ex')) {
    estimatedCondition = 'Excellent';
  } else if (conditionKeywords.includes('good') || conditionKeywords.includes('gd')) {
    estimatedCondition = 'Good';
  }

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

  // Card is "detected" if we have OCR text OR image content that looks like a card
  // This enables the three-tier detection model:
  // - detected=true + high confidence + match = "detected_confirmed"
  // - detected=true + low confidence or no match = "detected_needs_confirmation"
  // - detected=false = "not_detected" (only for blank/invalid images)
  const detected = hasCardLikeContent;
  
  // Confidence scoring:
  // - 0.85+ if we have a market item match
  // - 0.6 if we extracted a card name
  // - 0.4 if we have OCR text but no name (still a card, just can't identify)
  // - 0.2 if no OCR but image provided (possible card, needs confirmation)
  let confidence = 0.2;
  if (matchedItem) {
    confidence = 0.85;
  } else if (extractedCardName) {
    confidence = 0.6;
  } else if (ocrText.length > 0) {
    confidence = 0.4;
  }

  return {
    detected,
    cardName: matchedItem?.name || extractedCardName || null,
    setName: matchedItem?.set_name || extractedSetName || null,
    cardNumber: extractedCardNumber || null,
    estimatedCondition,
    category,
    confidence,
    ocrText,
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
    const { imageUrl, imageBase64, batchMode } = await req.json();

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

    const imagePayload = imageBase64 
      ? { _base64: imageBase64 }
      : { _url: imageUrl };

    // For batch mode: Use object detection to find multiple cards
    if (batchMode) {
      console.log('Batch mode: Detecting multiple cards in image...');

      // First, run OCR on the full image to get all text regions with positions
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
      console.log('Batch OCR response received');

      // Group OCR text by spatial regions (cards)
      const allObjects = ocrData.records?.[0]?._objects || [];
      
      // If no OCR objects, try to detect cards using object detection
      if (allObjects.length === 0) {
        console.log('No OCR text found, returning empty batch');
        return new Response(
          JSON.stringify({ totalDetected: 0, cards: [] } as BatchAnalysisResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Group text objects by their vertical position to identify separate cards
      // Assuming cards are laid out in a grid or row
      const cardGroups: { texts: string[]; bounds: { x: number; y: number; w: number; h: number } }[] = [];
      
      // Sort objects by position and group nearby ones
      const sortedObjects = allObjects.sort((a: any, b: any) => {
        const aY = a.bound_box?.[1] || 0;
        const bY = b.bound_box?.[1] || 0;
        return aY - bY;
      });

      // Simple clustering: group text that's close together
      const CLUSTER_THRESHOLD = 200; // pixels - adjust based on typical card size
      
      for (const obj of sortedObjects) {
        const text = obj.text || obj._text || '';
        if (!text || text.length < 2) continue;
        
        const bounds = obj.bound_box || [0, 0, 100, 100];
        const objCenter = {
          x: (bounds[0] + bounds[2]) / 2,
          y: (bounds[1] + bounds[3]) / 2
        };
        
        // Find if this belongs to an existing card group
        let foundGroup = false;
        for (const group of cardGroups) {
          const groupCenterX = (group.bounds.x + group.bounds.w) / 2;
          const groupCenterY = (group.bounds.y + group.bounds.h) / 2;
          
          const distance = Math.sqrt(
            Math.pow(objCenter.x - groupCenterX, 2) + 
            Math.pow(objCenter.y - groupCenterY, 2)
          );
          
          if (distance < CLUSTER_THRESHOLD) {
            group.texts.push(text);
            // Expand bounds
            group.bounds.x = Math.min(group.bounds.x, bounds[0]);
            group.bounds.y = Math.min(group.bounds.y, bounds[1]);
            group.bounds.w = Math.max(group.bounds.w, bounds[2]);
            group.bounds.h = Math.max(group.bounds.h, bounds[3]);
            foundGroup = true;
            break;
          }
        }
        
        if (!foundGroup) {
          cardGroups.push({
            texts: [text],
            bounds: { x: bounds[0], y: bounds[1], w: bounds[2], h: bounds[3] }
          });
        }
      }

      console.log(`Found ${cardGroups.length} potential card regions`);

      // Analyze each card group
      const cardResults: SingleCardResult[] = [];
      
      for (const group of cardGroups) {
        if (group.texts.length < 1) continue;
        
        const result = await analyzeCardRegion(supabase, group.texts, ximilarToken);
        
        if (result.detected) {
          cardResults.push({
            ...result,
            boundingBox: {
              x: group.bounds.x,
              y: group.bounds.y,
              width: group.bounds.w - group.bounds.x,
              height: group.bounds.h - group.bounds.y
            }
          });
        }
      }

      // If clustering didn't find cards, try treating all OCR as one card
      if (cardResults.length === 0 && allObjects.length > 0) {
        const allTexts = allObjects
          .map((obj: any) => obj.text || obj._text || '')
          .filter((t: string) => t.length > 0);
        
        const singleResult = await analyzeCardRegion(supabase, allTexts, ximilarToken);
        if (singleResult.detected) {
          cardResults.push(singleResult);
        }
      }

      const batchResult: BatchAnalysisResult = {
        totalDetected: cardResults.length,
        cards: cardResults
      };

      console.log(`Batch analysis complete: ${batchResult.totalDetected} cards detected`);

      return new Response(
        JSON.stringify(batchResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Single card mode (original behavior)
    console.log('Single card mode: Analyzing image...');

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
      console.error('OCR failed:', ocrError);
    }

    // Pass true for hasImageContent since we received an image
    const result = await analyzeCardRegion(supabase, ocrText, ximilarToken, true);

    console.log('Single card analysis complete:', { 
      detected: result.detected, 
      cardName: result.cardName,
      confidence: result.confidence,
      ocrTextCount: ocrText.length
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