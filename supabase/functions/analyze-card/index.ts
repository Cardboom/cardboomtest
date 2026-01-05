import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Ximilar TCG Identification API endpoint per documentation
const XIMILAR_TCG_ENDPOINT = 'https://api.ximilar.com/collectibles/v2/tcg_id';

interface XimilarObject {
  name: string;
  id: string;
  bound_box: number[];
  prob: number;
  area: number;
  _tags?: {
    Category?: Array<{ name: string; prob: number }>;
    Side?: Array<{ name: string; prob: number }>;
    Subcategory?: Array<{ name: string; prob: number }>;
    'Foil/Holo'?: Array<{ name: string; prob: number }>;
    Alphabet?: Array<{ name: string; prob: number }>;
    Company?: Array<{ name: string; prob: number }>;
    Grade?: Array<{ name: string; prob: number }>;
    Graded?: Array<{ name: string; prob: number }>;
  };
  _tags_simple?: string[];
  _identification?: {
    best_match?: {
      year?: number;
      full_name?: string;
      name?: string;
      set?: string;
      set_code?: string;
      series?: string;
      card_number?: string;
      rarity?: string;
      color?: string;
      type?: string;
      out_of?: string;
      subcategory?: string;
      links?: Record<string, string>;
      pricing?: {
        list?: Array<{
          item_id: string;
          item_link: string;
          name: string;
          price: number;
          currency: string;
          source: string;
          grade_company?: string;
          grade?: string;
        }>;
      };
      // Slab label fields
      brand?: string;
      verbal_grade?: string;
      grade?: string;
      certificate_number?: string;
      lang?: string;
      card_no?: string;
    };
    alternatives?: Array<{
      year?: number;
      full_name?: string;
      name?: string;
      set?: string;
      set_code?: string;
      card_number?: string;
      rarity?: string;
      subcategory?: string;
    }>;
    distances?: number[];
  };
}

interface XimilarTCGResponse {
  records: Array<{
    _url?: string;
    _status: { code: number; text: string; request_id?: string };
    _id: string;
    _width?: number;
    _height?: number;
    Category?: string;
    _objects?: XimilarObject[];
  }>;
  status: {
    code: number;
    text: string;
    request_id?: string;
  };
  statistics?: {
    'processing time': number;
  };
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
  isGraded: boolean;
  gradingCompany: string | null;
  grade: string | null;
  certificateNumber: string | null;
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
  ximilarPricing: Array<{
    price: number;
    currency: string;
    source: string;
    link: string;
  }> | null;
}

function mapSubcategoryToCategory(subcategory: string | undefined): string {
  if (!subcategory) return 'tcg';
  const sub = subcategory.toLowerCase();
  
  if (sub.includes('pokemon') || sub.includes('pokémon')) return 'pokemon';
  if (sub.includes('one piece')) return 'onepiece';
  if (sub.includes('magic') || sub === 'mtg' || sub.includes('magic the gathering')) return 'mtg';
  if (sub.includes('yu-gi-oh') || sub.includes('yugioh')) return 'yugioh';
  if (sub.includes('lorcana')) return 'lorcana';
  if (sub.includes('sports') || sub.includes('nba') || sub.includes('nfl') || sub.includes('mlb')) return 'sports';
  
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
  subcategory: string | null;
  confidence: number;
  ximilarId: string | null;
  notes: string;
  isGraded: boolean;
  gradingCompany: string | null;
  grade: string | null;
  certificateNumber: string | null;
  isFoil: boolean;
  year: number | null;
  series: string | null;
  ximilarPricing: Array<{ price: number; currency: string; source: string; link: string }> | null;
}> {
  try {
    console.log('Calling Ximilar TCG Identification API at:', XIMILAR_TCG_ENDPOINT);
    
    const requestBody = {
      records: [
        {
          _base64: imageBase64,
        }
      ],
      slab_grade: true,
      slab_id: true,
      pricing: true,
      lang: true,
    };
    
    console.log('Request body keys:', Object.keys(requestBody));
    
    const response = await fetch(XIMILAR_TCG_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${ximilarToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ximilar API error:', response.status, errorText);
      throw new Error(`Ximilar API error: ${response.status} - ${errorText}`);
    }

    const data: XimilarTCGResponse = await response.json();
    console.log('Ximilar full response:', JSON.stringify(data, null, 2));

    if (!data.records || data.records.length === 0) {
      console.log('No records in Ximilar response');
      return {
        cardName: null,
        cardNameEnglish: null,
        setName: null,
        setCode: null,
        cardNumber: null,
        rarity: null,
        language: null,
        subcategory: null,
        confidence: 0,
        ximilarId: null,
        notes: 'No card detected by Ximilar',
        isGraded: false,
        gradingCompany: null,
        grade: null,
        certificateNumber: null,
        isFoil: false,
        year: null,
        series: null,
        ximilarPricing: null,
      };
    }

    const record = data.records[0];
    console.log('Record status:', record._status);
    console.log('Number of objects detected:', record._objects?.length || 0);
    
    // Find the Card object in _objects array
    const cardObject = record._objects?.find(obj => obj.name === 'Card');
    const slabLabelObject = record._objects?.find(obj => obj.name === 'Slab Label');
    
    console.log('Card object found:', !!cardObject);
    console.log('Slab label object found:', !!slabLabelObject);

    if (!cardObject) {
      console.log('No Card object in _objects array');
      return {
        cardName: null,
        cardNameEnglish: null,
        setName: null,
        setCode: null,
        cardNumber: null,
        rarity: null,
        language: null,
        subcategory: null,
        confidence: 0,
        ximilarId: record._id || null,
        notes: 'Card detected but no identification available',
        isGraded: false,
        gradingCompany: null,
        grade: null,
        certificateNumber: null,
        isFoil: false,
        year: null,
        series: null,
        ximilarPricing: null,
      };
    }

    const bestMatch = cardObject._identification?.best_match;
    console.log('Best match:', bestMatch);
    
    if (!bestMatch) {
      console.log('No best_match in identification');
      return {
        cardName: null,
        cardNameEnglish: null,
        setName: null,
        setCode: null,
        cardNumber: null,
        rarity: null,
        language: null,
        subcategory: cardObject._tags?.Subcategory?.[0]?.name || null,
        confidence: cardObject.prob || 0,
        ximilarId: cardObject.id || record._id || null,
        notes: 'Card detected but not identified in database',
        isGraded: false,
        gradingCompany: null,
        grade: null,
        certificateNumber: null,
        isFoil: cardObject._tags_simple?.includes('Foil/Holo') || false,
        year: null,
        series: null,
        ximilarPricing: null,
      };
    }

    // Extract pricing data from Ximilar
    let ximilarPricing: Array<{ price: number; currency: string; source: string; link: string }> | null = null;
    if (bestMatch.pricing?.list && bestMatch.pricing.list.length > 0) {
      ximilarPricing = bestMatch.pricing.list.map(p => ({
        price: p.price,
        currency: p.currency,
        source: p.source,
        link: p.item_link,
      }));
    }

    // Extract slab/grading info if present
    let isGraded = false;
    let gradingCompany: string | null = null;
    let grade: string | null = null;
    let certificateNumber: string | null = null;

    if (slabLabelObject) {
      isGraded = slabLabelObject._tags?.Graded?.[0]?.name === 'yes';
      gradingCompany = slabLabelObject._tags?.Company?.[0]?.name || null;
      grade = slabLabelObject._tags?.Grade?.[0]?.name || null;
      
      if (slabLabelObject._identification?.best_match) {
        const slabMatch = slabLabelObject._identification.best_match;
        certificateNumber = slabMatch.certificate_number || null;
        if (slabMatch.grade) grade = slabMatch.grade;
      }
    }

    // Get alphabet/language from tags
    const alphabet = cardObject._tags?.Alphabet?.[0]?.name || 'latin';
    const isFoil = cardObject._tags_simple?.includes('Foil/Holo') || false;
    const subcategory = bestMatch.subcategory || cardObject._tags?.Subcategory?.[0]?.name || null;

    const confidence = cardObject.prob || 0;
    
    console.log('Extracted card data:', {
      name: bestMatch.name,
      full_name: bestMatch.full_name,
      set: bestMatch.set,
      set_code: bestMatch.set_code,
      card_number: bestMatch.card_number,
      rarity: bestMatch.rarity,
      subcategory,
      confidence,
      isGraded,
      gradingCompany,
      grade,
    });
    
    return {
      cardName: bestMatch.full_name || bestMatch.name || null,
      cardNameEnglish: bestMatch.name || null,
      setName: bestMatch.set || null,
      setCode: bestMatch.set_code || null,
      cardNumber: bestMatch.card_number || null,
      rarity: bestMatch.rarity || null,
      language: alphabet === 'latin' ? 'English' : alphabet,
      subcategory,
      confidence,
      ximilarId: cardObject.id || record._id || null,
      notes: `Ximilar match confidence: ${(confidence * 100).toFixed(1)}%`,
      isGraded,
      gradingCompany,
      grade,
      certificateNumber,
      isFoil,
      year: bestMatch.year || null,
      series: bestMatch.series || null,
      ximilarPricing,
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
      subcategory: null,
      confidence: 0,
      ximilarId: null,
      notes: `Ximilar error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      isGraded: false,
      gradingCompany: null,
      grade: null,
      certificateNumber: null,
      isFoil: false,
      year: null,
      series: null,
      ximilarPricing: null,
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
    subcategory: string | null;
    confidence: number;
    ximilarId: string | null;
    notes: string;
    isGraded: boolean;
    gradingCompany: string | null;
    grade: string | null;
    certificateNumber: string | null;
    isFoil: boolean;
    year: number | null;
    series: string | null;
    ximilarPricing: Array<{ price: number; currency: string; source: string; link: string }> | null;
  }
): Promise<SingleCardResult> {
  let matchedItem = null;
  let pricing = null;

  const category = mapSubcategoryToCategory(ximilarResult.subcategory || undefined);
  const nameToSearch = ximilarResult.cardNameEnglish || ximilarResult.cardName;
  
  // Build cvi_key if we have enough data
  let cviKey: string | null = null;
  if (ximilarResult.setCode && ximilarResult.cardNumber && ximilarResult.subcategory) {
    const language = ximilarResult.language || 'English';
    cviKey = `${ximilarResult.subcategory}|${ximilarResult.setCode}|${ximilarResult.cardNumber}|${language}`;
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

  // If we have Ximilar pricing but no internal pricing, use Ximilar's
  if (!pricing && ximilarResult.ximilarPricing && ximilarResult.ximilarPricing.length > 0) {
    const prices = ximilarResult.ximilarPricing.map(p => p.price).filter(p => p > 0);
    if (prices.length > 0) {
      const sortedPrices = [...prices].sort((a, b) => a - b);
      const lowestActive = sortedPrices[0];
      const medianSold = sortedPrices[Math.floor(sortedPrices.length / 2)];
      
      pricing = {
        lowestActive,
        medianSold,
        trend7d: 0,
        trendDirection: 'stable' as const,
        quickSellPrice: Math.round(medianSold * 0.85 * 100) / 100,
        maxProfitPrice: Math.round(medianSold * 1.10 * 100) / 100,
        priceConfidence: prices.length >= 5 ? 'high' as const : prices.length >= 3 ? 'medium' as const : 'low' as const,
        salesCount: prices.length,
        listingsCount: prices.length,
      };
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
    estimatedCondition: ximilarResult.isGraded && ximilarResult.grade ? `PSA ${ximilarResult.grade}` : 'Near Mint',
    category: matchedItem?.category || category,
    language: ximilarResult.language || 'English',
    cviKey,
    confidence: finalConfidence,
    needsReview,
    notes: ximilarResult.notes,
    ocrText: [],
    isGraded: ximilarResult.isGraded,
    gradingCompany: ximilarResult.gradingCompany,
    grade: ximilarResult.grade,
    certificateNumber: ximilarResult.certificateNumber,
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
    ximilarPricing: ximilarResult.ximilarPricing,
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
        console.log('Fetching image from URL:', imageUrl);
        const imgResponse = await fetch(imageUrl);
        const arrayBuffer = await imgResponse.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        base64Image = btoa(String.fromCharCode(...uint8Array));
        console.log('Image converted to base64, length:', base64Image.length);
      } catch (e) {
        console.error('Failed to fetch image URL:', e);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch image' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Analyzing card with Ximilar TCG Identification...');
    console.log('Base64 image length:', base64Image?.length || 0);
    
    // Analyze with Ximilar TCG Identification API
    const ximilarResult = await analyzeWithXimilar(base64Image, ximilarToken);
    console.log('Ximilar result summary:', {
      cardName: ximilarResult.cardName,
      setCode: ximilarResult.setCode,
      cardNumber: ximilarResult.cardNumber,
      confidence: ximilarResult.confidence,
      isGraded: ximilarResult.isGraded,
    });

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
      isGraded: result.isGraded,
      grade: result.grade,
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
