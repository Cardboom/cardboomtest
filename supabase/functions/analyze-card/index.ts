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

  // ============================================================
  // PRIORITY 1: Check card_price_estimates for verified pricing FIRST
  // This is the most reliable source as it's been manually verified
  // ============================================================
  if (nameToSearch) {
    const searchTerms = nameToSearch.split(' ').filter((t: string) => t.length > 2);
    const primaryTerm = searchTerms[0] || nameToSearch;
    
    console.log('Checking card_price_estimates for:', primaryTerm, 'Set:', ximilarResult.setName);
    
    const { data: priceEstimates } = await supabase
      .from('card_price_estimates')
      .select('*')
      .ilike('card_name', `%${primaryTerm}%`)
      .order('updated_at', { ascending: false })
      .limit(10);
    
    if (priceEstimates && priceEstimates.length > 0) {
      // Try to find exact set match first
      const setName = ximilarResult.setName || '';
      const setCode = ximilarResult.setCode || '';
      
      let bestMatch = priceEstimates.find((pe: any) => {
        if (!pe.set_name) return false;
        const peSetLower = pe.set_name.toLowerCase();
        const setNameLower = setName.toLowerCase();
        // Match by set name or set code
        return peSetLower.includes(setNameLower.split(' ')[0]) || 
               peSetLower.includes(setCode.toLowerCase()) ||
               setNameLower.includes(peSetLower.split(' ')[0]);
      });
      
      // Fall back to first result if no set match
      if (!bestMatch) bestMatch = priceEstimates[0];
      
      if (bestMatch && (bestMatch.price_ungraded > 0 || bestMatch.price_psa_10 > 0)) {
        const ungraded = bestMatch.price_ungraded || (bestMatch.price_psa_10 ? bestMatch.price_psa_10 * 0.15 : 0);
        console.log('✓ Using VERIFIED card_price_estimates:', bestMatch.card_name, bestMatch.set_name, 'Ungraded:', ungraded);
        
        pricing = {
          lowestActive: ungraded,
          medianSold: ungraded,
          trend7d: 0,
          trendDirection: 'stable' as const,
          quickSellPrice: Math.round(ungraded * 0.85 * 100) / 100,
          maxProfitPrice: Math.round(ungraded * 1.10 * 100) / 100,
          priceConfidence: bestMatch.confidence_score >= 0.8 ? 'high' as const : 
                          bestMatch.confidence_score >= 0.5 ? 'medium' as const : 'low' as const,
          salesCount: 10,
          listingsCount: 20,
        };
      }
    }
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
        .limit(50);

      if (matches && matches.length > 0) {
        matchedItem = matches[0];
        console.log('Found name match:', matchedItem.name, 'Total matches:', matches.length);

        // Get all prices and apply MAD outlier filtering
        let prices = matches.map((item: any) => item.current_price).filter((p: number) => p > 0);
        
        if (prices.length >= 3) {
          // Calculate median
          const sortedForMedian = [...prices].sort((a, b) => a - b);
          const median = sortedForMedian[Math.floor(sortedForMedian.length / 2)];
          
          // Calculate MAD (Median Absolute Deviation)
          const deviations = prices.map((p: number) => Math.abs(p - median));
          const sortedDeviations = [...deviations].sort((a, b) => a - b);
          const mad = sortedDeviations[Math.floor(sortedDeviations.length / 2)];
          
          // Filter outliers: keep prices within median ± 3*MAD (or 50% of median if MAD is too small)
          const threshold = Math.max(mad * 3, median * 0.5);
          const filteredPrices = prices.filter((p: number) => Math.abs(p - median) <= threshold);
          
          if (filteredPrices.length >= 2) {
            prices = filteredPrices;
            console.log('MAD filtering: median=', median, 'mad=', mad, 'kept', filteredPrices.length, 'of', matches.length);
          }
        }
        
        const sortedPrices = [...prices].sort((a, b) => a - b);
        
        if (sortedPrices.length > 0) {
          const lowestActive = sortedPrices[0];
          // Use trimmed mean: exclude top/bottom 10% for more robust average
          const trimCount = Math.floor(sortedPrices.length * 0.1);
          const trimmedPrices = sortedPrices.slice(trimCount, sortedPrices.length - trimCount || sortedPrices.length);
          const medianSold = trimmedPrices.length > 0 
            ? trimmedPrices[Math.floor(trimmedPrices.length / 2)]
            : sortedPrices[Math.floor(sortedPrices.length / 2)];
          
          const trend7d = matchedItem.change_7d || 0;
          const quickSellPrice = Math.round(medianSold * 0.85 * 100) / 100;
          const maxProfitPrice = Math.round(medianSold * 1.10 * 100) / 100;

          let priceConfidence: 'high' | 'medium' | 'low' = 'low';
          if (prices.length >= 5) priceConfidence = 'high';
          else if (prices.length >= 3) priceConfidence = 'medium';
          
          const trendDirection: 'up' | 'down' | 'stable' = trend7d > 2 ? 'up' : trend7d < -2 ? 'down' : 'stable';

          pricing = {
            lowestActive,
            medianSold,
            trend7d,
            trendDirection,
            quickSellPrice,
            maxProfitPrice,
            priceConfidence,
            salesCount: prices.length,
            listingsCount: matches.length,
          };
          
          console.log('Calculated pricing:', { lowestActive, medianSold, sampleSize: prices.length });
        }
      }
    }
  }

  // NOTE: card_price_estimates is now checked FIRST at the top of this function (Priority 1)
  // This section is removed to avoid duplicate checks

  // Priority 2: If we have Ximilar pricing but no internal pricing, use Ximilar's
  // BUT filter out graded card prices and alternate art variants for ungraded cards
  if (!pricing && ximilarResult.ximilarPricing && ximilarResult.ximilarPricing.length > 0) {
    // Filter Ximilar prices: exclude graded cards if we're analyzing an ungraded card
    const filteredPricing = ximilarResult.ximilarPricing.filter((p: any) => {
      // If card is not graded, filter out PSA/BGS/CGC listings
      if (!ximilarResult.isGraded) {
        const itemName = (p.name || '').toUpperCase();
        const hasGrade = itemName.includes('PSA') || itemName.includes('BGS') || 
                        itemName.includes('CGC') || itemName.includes('SGC') ||
                        p.grade_company || p.grade;
        if (hasGrade) {
          console.log('Filtering out graded listing:', p.name, 'price:', p.price);
          return false;
        }
        
        // Filter out alternate art if not specifically detected
        if (itemName.includes('ALTERNATE ART') || itemName.includes('ALT ART')) {
          console.log('Filtering out alternate art listing:', p.name, 'price:', p.price);
          return false;
        }
      }
      return p.price > 0;
    });

    const prices = filteredPricing.map((p: any) => p.price);
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
      console.log('Using filtered Ximilar pricing:', { lowestActive, medianSold, filteredCount: prices.length });
    } else {
      console.log('All Ximilar prices filtered out - will show insufficient data');
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

// Helper function to process a single card object from Ximilar response
async function processCardObject(
  cardObject: XimilarObject,
  slabLabelObject: XimilarObject | undefined,
  recordId: string,
  supabase: any
): Promise<SingleCardResult> {
  const bestMatch = cardObject._identification?.best_match;
  
  // Extract pricing data from Ximilar
  let ximilarPricing: Array<{ price: number; currency: string; source: string; link: string }> | null = null;
  if (bestMatch?.pricing?.list && bestMatch.pricing.list.length > 0) {
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

  const alphabet = cardObject._tags?.Alphabet?.[0]?.name || 'latin';
  const isFoil = cardObject._tags_simple?.includes('Foil/Holo') || false;
  const subcategory = bestMatch?.subcategory || cardObject._tags?.Subcategory?.[0]?.name || null;
  const confidence = cardObject.prob || 0;

  const ximilarResult = {
    cardName: bestMatch?.full_name || bestMatch?.name || null,
    cardNameEnglish: bestMatch?.name || null,
    setName: bestMatch?.set || null,
    setCode: bestMatch?.set_code || null,
    cardNumber: bestMatch?.card_number || null,
    rarity: bestMatch?.rarity || null,
    language: alphabet === 'latin' ? 'English' : alphabet,
    subcategory,
    confidence,
    ximilarId: cardObject.id || recordId || null,
    notes: bestMatch ? `Ximilar match confidence: ${(confidence * 100).toFixed(1)}%` : 'Card detected but not identified',
    isGraded,
    gradingCompany,
    grade,
    certificateNumber,
    isFoil,
    year: bestMatch?.year || null,
    series: bestMatch?.series || null,
    ximilarPricing,
  };

  return await enrichWithMarketData(supabase, ximilarResult);
}

// Helper to call Ximilar and get raw response
async function callXimilarAPI(imageBase64: string, ximilarToken: string): Promise<XimilarTCGResponse | null> {
  try {
    console.log('Calling Ximilar TCG Identification API at:', XIMILAR_TCG_ENDPOINT);
    
    const requestBody = {
      records: [{ _base64: imageBase64 }],
      slab_grade: true,
      slab_id: true,
      pricing: true,
      lang: true,
    };
    
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
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Ximilar API call error:', error);
    return null;
  }
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
    console.log('Batch mode:', batchMode);
    
    // Get raw Ximilar response
    const ximilarData = await callXimilarAPI(base64Image, ximilarToken);
    
    if (!ximilarData || !ximilarData.records || ximilarData.records.length === 0) {
      const emptyResult = {
        detected: false,
        cardName: null,
        cardNameEnglish: null,
        setName: null,
        setCode: null,
        cardNumber: null,
        rarity: null,
        cardType: null,
        estimatedCondition: null,
        category: null,
        language: null,
        cviKey: null,
        confidence: 0,
        needsReview: true,
        notes: 'No card detected by Ximilar',
        ocrText: [],
        isGraded: false,
        gradingCompany: null,
        grade: null,
        certificateNumber: null,
        pricing: null,
        matchedMarketItem: null,
        ximilarId: null,
        ximilarPricing: null,
      };
      
      if (batchMode) {
        return new Response(
          JSON.stringify({ cards: [], totalDetected: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify(emptyResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const record = ximilarData.records[0];
    console.log('Number of objects detected:', record._objects?.length || 0);
    
    // Get all card objects from the image
    const cardObjects = record._objects?.filter(obj => obj.name === 'Card') || [];
    const slabLabelObject = record._objects?.find(obj => obj.name === 'Slab Label');
    
    console.log('Card objects found:', cardObjects.length);

    // BATCH MODE: Return all detected cards
    if (batchMode) {
      if (cardObjects.length === 0) {
        return new Response(
          JSON.stringify({ cards: [], totalDetected: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Process all card objects
      const results: SingleCardResult[] = [];
      for (const cardObject of cardObjects) {
        try {
          const result = await processCardObject(cardObject, slabLabelObject, record._id, supabase);
          results.push(result);
        } catch (err) {
          console.error('Error processing card object:', err);
          // Add a placeholder for failed cards
          results.push({
            detected: false,
            cardName: null,
            cardNameEnglish: null,
            setName: null,
            setCode: null,
            cardNumber: null,
            rarity: null,
            cardType: null,
            estimatedCondition: null,
            category: 'tcg',
            language: null,
            cviKey: null,
            confidence: 0,
            needsReview: true,
            notes: 'Failed to process card',
            ocrText: [],
            isGraded: false,
            gradingCompany: null,
            grade: null,
            certificateNumber: null,
            pricing: null,
            matchedMarketItem: null,
            ximilarId: null,
            ximilarPricing: null,
          });
        }
      }

      console.log(`Batch mode: Returning ${results.length} cards`);
      return new Response(
        JSON.stringify({ 
          cards: results, 
          totalDetected: results.length,
          imageWidth: record._width,
          imageHeight: record._height,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SINGLE MODE: Return first card only (original behavior)
    if (cardObjects.length === 0) {
      const emptyResult = {
        detected: false,
        cardName: null,
        cardNameEnglish: null,
        setName: null,
        setCode: null,
        cardNumber: null,
        rarity: null,
        cardType: null,
        estimatedCondition: null,
        category: null,
        language: null,
        cviKey: null,
        confidence: 0,
        needsReview: true,
        notes: 'No Card object detected',
        ocrText: [],
        isGraded: false,
        gradingCompany: null,
        grade: null,
        certificateNumber: null,
        pricing: null,
        matchedMarketItem: null,
        ximilarId: record._id || null,
        ximilarPricing: null,
      };
      return new Response(
        JSON.stringify(emptyResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process first card for single mode (backward compatible)
    const ximilarResult = await analyzeWithXimilar(base64Image, ximilarToken);
    const result = await enrichWithMarketData(supabase, ximilarResult);

    console.log('Final analysis result:', { 
      detected: result.detected, 
      cardName: result.cardName,
      category: result.category,
      confidence: result.confidence,
      needsReview: result.needsReview,
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
