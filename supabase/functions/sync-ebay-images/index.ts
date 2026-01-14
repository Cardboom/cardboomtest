import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EBAY_RAPIDAPI_KEY = Deno.env.get("EBAY_RAPIDAPI_KEY");

interface EbayProduct {
  title: string;
  image?: string;
  images?: string[];
  price?: {
    value: string;
    currency: string;
  };
  condition?: string;
  itemId?: string;
  itemWebUrl?: string;
  soldDate?: string;
  isSold?: boolean;
  soldPrice?: string;
}

interface EbaySearchResponse {
  products?: EbayProduct[];
  soldProducts?: EbayProduct[];
  total?: number;
}

interface GradeInfo {
  company: string | null;
  grade: string | null;
  numericGrade: number | null;
}

interface VariantInfo {
  isFirstEdition: boolean;
  isHolo: boolean;
  isReverseHolo: boolean;
  isUnlimited: boolean;
  variant: string | null;
}

// Parse grading info from title
function parseGradingInfo(title: string): GradeInfo {
  const gradePatterns = [
    { regex: /PSA\s*(\d+(?:\.\d+)?)/i, company: 'PSA' },
    { regex: /BGS\s*(\d+(?:\.\d+)?)/i, company: 'BGS' },
    { regex: /CGC\s*(\d+(?:\.\d+)?)/i, company: 'CGC' },
    { regex: /SGC\s*(\d+(?:\.\d+)?)/i, company: 'SGC' },
  ];

  for (const { regex, company } of gradePatterns) {
    const match = title.match(regex);
    if (match) {
      const numericGrade = parseFloat(match[1]);
      return {
        company,
        grade: `${company} ${match[1]}`,
        numericGrade,
      };
    }
  }

  return { company: null, grade: null, numericGrade: null };
}

// Parse variant info from title
function parseVariantInfo(title: string): VariantInfo {
  const lowerTitle = title.toLowerCase();
  
  return {
    isFirstEdition: /1st\s*edition|first\s*edition/i.test(title),
    isHolo: /\bholo\b|holofoil/i.test(title) && !/reverse\s*holo/i.test(title),
    isReverseHolo: /reverse\s*holo/i.test(title),
    isUnlimited: /\bunlimited\b/i.test(title),
    variant: lowerTitle.includes('shadowless') ? 'shadowless' 
           : lowerTitle.includes('secret rare') ? 'secret_rare'
           : lowerTitle.includes('full art') ? 'full_art'
           : lowerTitle.includes('alt art') ? 'alt_art'
           : null,
  };
}

// Map eBay condition to internal condition
function mapCondition(ebayCondition: string | undefined): string {
  if (!ebayCondition) return 'unknown';
  
  const lower = ebayCondition.toLowerCase();
  if (lower.includes('mint') || lower.includes('gem')) return 'near_mint';
  if (lower.includes('excellent') || lower.includes('lightly')) return 'excellent';
  if (lower.includes('good') || lower.includes('moderately')) return 'good';
  if (lower.includes('fair') || lower.includes('heavily')) return 'fair';
  if (lower.includes('poor') || lower.includes('damaged')) return 'poor';
  if (lower.includes('new') || lower.includes('sealed')) return 'mint';
  return 'good';
}

// Calculate fuzzy match score between item name and eBay title
function calculateMatchScore(itemName: string, ebayTitle: string): number {
  const normalizedItem = itemName.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const normalizedTitle = ebayTitle.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  
  const itemWords = normalizedItem.split(/\s+/).filter(w => w.length > 2);
  const titleWords = normalizedTitle.split(/\s+/);
  
  let matchCount = 0;
  for (const word of itemWords) {
    if (titleWords.some(tw => tw.includes(word) || word.includes(tw))) {
      matchCount++;
    }
  }
  
  return itemWords.length > 0 ? matchCount / itemWords.length : 0;
}

// Apply outlier detection using Median Absolute Deviation (MAD)
function filterOutliers(prices: number[]): number[] {
  if (prices.length < 5) return prices;
  
  const sorted = [...prices].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  
  // Calculate MAD
  const deviations = sorted.map(p => Math.abs(p - median));
  deviations.sort((a, b) => a - b);
  const mad = deviations[Math.floor(deviations.length / 2)] * 1.4826; // Scale factor for normal distribution
  
  // Filter outliers (within 3 MAD)
  const threshold = 3 * mad;
  return prices.filter(p => Math.abs(p - median) <= threshold);
}

// Calculate robust price from multiple listings
function calculateRobustPrice(prices: number[]): { price: number; confidence: string; sampleSize: number } {
  if (prices.length === 0) return { price: 0, confidence: 'none', sampleSize: 0 };
  
  const filtered = filterOutliers(prices);
  
  if (filtered.length < 3) {
    return { 
      price: prices.length === 1 ? prices[0] : prices.reduce((a, b) => a + b, 0) / prices.length,
      confidence: 'low',
      sampleSize: prices.length 
    };
  }
  
  // Trimmed mean (drop bottom/top 10%)
  const trimCount = Math.floor(filtered.length * 0.1);
  const trimmed = filtered.slice(trimCount, filtered.length - trimCount);
  const price = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
  
  const confidence = filtered.length >= 10 ? 'high' : filtered.length >= 5 ? 'medium' : 'low';
  
  return { price, confidence, sampleSize: filtered.length };
}

// Clean card name for better eBay search
function cleanSearchQuery(name: string): string {
  return name
    .replace(/\s*[-–]\s*(PSA|BGS|CGC|SGC)\s*\d+(\.\d+)?/gi, '')
    .replace(/\s*(1st Edition|First Edition|Unlimited|Holo|Holofoil|Reverse Holo)/gi, '')
    .replace(/\s*#\d+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Map internal categories to eBay search terms with category IDs
function getCategoryConfig(category: string): { searchTerm: string; categoryId?: string } {
  const categoryMap: Record<string, { searchTerm: string; categoryId?: string }> = {
    'pokemon': { searchTerm: 'pokemon card', categoryId: '183454' },
    'yugioh': { searchTerm: 'yugioh card', categoryId: '183452' },
    'mtg': { searchTerm: 'magic the gathering card', categoryId: '183454' },
    'one-piece': { searchTerm: 'one piece card game', categoryId: '183454' },
    'lorcana': { searchTerm: 'disney lorcana card', categoryId: '183454' },
    'sports': { searchTerm: 'sports trading card', categoryId: '212' },
    'sports-nba': { searchTerm: 'nba basketball card', categoryId: '214' },
    'sports-nfl': { searchTerm: 'nfl football card', categoryId: '215' },
    'sports-mlb': { searchTerm: 'mlb baseball card', categoryId: '213' },
    'figures': { searchTerm: 'collectible figure', categoryId: '246' },
    'lol-riftbound': { searchTerm: 'league of legends riftbound card', categoryId: '183454' },
  };
  return categoryMap[category] || { searchTerm: 'trading card' };
}

// Search eBay for SOLD/completed listings (best for pricing) or active listings (for images)
async function searchEbaySold(query: string, category: string): Promise<EbayProduct[]> {
  if (!EBAY_RAPIDAPI_KEY) {
    console.log('eBay RapidAPI key not configured');
    return [];
  }

  try {
    const config = getCategoryConfig(category);
    const searchQuery = `${query} ${config.searchTerm}`;
    
    // Use the sold items endpoint for accurate market pricing
    const url = `https://ebay-search-result.p.rapidapi.com/search/${encodeURIComponent(searchQuery)}?page=1&type=sold`;
    
    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': EBAY_RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'ebay-search-result.p.rapidapi.com',
      },
    });

    if (!response.ok) {
      console.error(`eBay Sold API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    // Map the sold results to our EbayProduct interface
    const soldProducts: EbayProduct[] = (data.results || []).map((item: any) => ({
      title: item.title || '',
      image: item.image || item.thumbnail,
      images: item.images || [item.image].filter(Boolean),
      price: { value: String(item.price || item.sold_price || 0), currency: 'USD' },
      condition: item.condition,
      itemId: item.item_id || item.id,
      isSold: true,
      soldDate: item.sold_date || item.date,
      soldPrice: String(item.price || item.sold_price || 0),
    }));
    
    console.log(`[eBay Sold] Found ${soldProducts.length} completed sales for: ${query}`);
    return soldProducts;
  } catch (error) {
    console.error('Error searching eBay sold:', error);
    return [];
  }
}

// Fallback to active listings (useful for images when sold data is sparse)
async function searchEbayActive(query: string, category: string): Promise<EbayProduct[]> {
  if (!EBAY_RAPIDAPI_KEY) {
    return [];
  }

  try {
    const config = getCategoryConfig(category);
    const searchQuery = `${query} ${config.searchTerm}`;
    
    let url = `https://api-for-ebay.p.rapidapi.com/searchProducts?query=${encodeURIComponent(searchQuery)}&page=1`;
    if (config.categoryId) {
      url += `&category=${config.categoryId}`;
    }
    
    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': EBAY_RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'api-for-ebay.p.rapidapi.com',
      },
    });

    if (!response.ok) {
      return [];
    }

    const data: EbaySearchResponse = await response.json();
    return data.products || [];
  } catch (error) {
    console.error('Error searching eBay active:', error);
    return [];
  }
}

// Combined search: prioritize SOLD listings for pricing, active for images
async function searchEbay(query: string, category: string, options: { soldOnly?: boolean } = {}): Promise<{ sold: EbayProduct[]; active: EbayProduct[] }> {
  // Always try to get sold listings first (best for pricing)
  const soldProducts = await searchEbaySold(query, category);
  
  // If soldOnly requested or we have enough sold data, skip active listings
  if (options.soldOnly || soldProducts.length >= 5) {
    return { sold: soldProducts, active: [] };
  }
  
  // Also fetch active listings for images if sold data is sparse
  const activeProducts = await searchEbayActive(query, category);
  
  return { sold: soldProducts, active: activeProducts };
}

function parsePrice(priceStr: string | undefined): number | null {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/[^0-9.]/g, '');
  const price = parseFloat(cleaned);
  return isNaN(price) || price <= 0 ? null : price;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { 
      limit = 50, 
      offset = 0, 
      category = null, 
      updatePrices = true,
      soldListingsOnly = false,
      minMatchScore = 0.6 
    } = await req.json().catch(() => ({}));

    // Build query for items needing data
    let query = supabase
      .from('market_items')
      .select('id, name, category, current_price, image_url, data_source, price_confidence')
      .order('current_price', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    // Get items missing images or with low-confidence prices
    query = query.or('image_url.is.null,image_url.eq.,image_url.ilike.%placeholder%,data_source.is.null,data_source.eq.internal,price_confidence.eq.low');

    const { data: items, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch items: ${fetchError.message}`);
    }

    console.log(`Processing ${items?.length || 0} items with enhanced eBay sync`);

    const results = {
      processed: 0,
      imagesUpdated: 0,
      pricesUpdated: 0,
      gradedDetected: 0,
      variantsDetected: 0,
      notFound: 0,
      lowMatch: 0,
      errors: 0,
    };

    for (const item of items || []) {
      try {
        const searchQuery = cleanSearchQuery(item.name);
        console.log(`Searching eBay for: ${searchQuery} (${item.category})`);

        const { sold: soldProducts, active: activeProducts } = await searchEbay(searchQuery, item.category, { soldOnly: soldListingsOnly });
        results.processed++;

        // Combine sold and active - prioritize sold for pricing
        const allProducts = [...soldProducts, ...activeProducts];
        
        if (allProducts.length === 0) {
          results.notFound++;
          console.log(`No eBay results for: ${item.name}`);
          continue;
        }

        // Score all products for matching
        interface ScoredProduct {
          product: EbayProduct;
          score: number;
          gradeInfo: GradeInfo;
          variantInfo: VariantInfo;
          isSold: boolean;
        }
        
        const scoredProducts: ScoredProduct[] = allProducts
          .map((p: EbayProduct) => ({
            product: p,
            score: calculateMatchScore(item.name, p.title),
            gradeInfo: parseGradingInfo(p.title),
            variantInfo: parseVariantInfo(p.title),
            isSold: p.isSold || false,
          }))
          .filter((sp: ScoredProduct) => sp.score >= minMatchScore)
          .sort((a: ScoredProduct, b: ScoredProduct) => b.score - a.score);

        if (scoredProducts.length === 0) {
          results.lowMatch++;
          console.log(`No good match for: ${item.name} (best score < ${minMatchScore})`);
          continue;
        }

        const updates: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };

        // Best match for image (prefer any with good image)
        const bestMatch = scoredProducts[0];
        
        // Update image if found and current is missing/placeholder
        if (bestMatch.product.image && (!item.image_url || item.image_url === '' || item.image_url.includes('placeholder'))) {
          updates.image_url = bestMatch.product.image;
          results.imagesUpdated++;
        }

        // Store additional images if available
        if (bestMatch.product.images && bestMatch.product.images.length > 1) {
          updates.additional_images = bestMatch.product.images.slice(0, 5);
        }

        // Detect graded cards
        if (bestMatch.gradeInfo.company) {
          updates.detected_grade = bestMatch.gradeInfo.grade;
          updates.grading_company = bestMatch.gradeInfo.company;
          results.gradedDetected++;
        }

        // Detect variants
        if (bestMatch.variantInfo.isFirstEdition || bestMatch.variantInfo.isHolo || bestMatch.variantInfo.variant) {
          const variants: string[] = [];
          if (bestMatch.variantInfo.isFirstEdition) variants.push('1st_edition');
          if (bestMatch.variantInfo.isHolo) variants.push('holo');
          if (bestMatch.variantInfo.isReverseHolo) variants.push('reverse_holo');
          if (bestMatch.variantInfo.variant) variants.push(bestMatch.variantInfo.variant);
          updates.detected_variants = variants;
          results.variantsDetected++;
        }

        // Calculate robust price - PRIORITIZE SOLD LISTINGS for accurate market value
        if (updatePrices) {
          // Separate sold vs active prices
          const soldPrices = scoredProducts
            .filter((sp: ScoredProduct) => sp.isSold)
            .map((sp: ScoredProduct) => parsePrice(sp.product.soldPrice || sp.product.price?.value))
            .filter((p): p is number => p !== null && p > 0);
          
          const activePrices = scoredProducts
            .filter((sp: ScoredProduct) => !sp.isSold)
            .map((sp: ScoredProduct) => parsePrice(sp.product.price?.value))
            .filter((p): p is number => p !== null && p > 0);
          
          // Use sold prices if we have enough (better market accuracy), otherwise fall back to active
          const pricesToUse = soldPrices.length >= 3 ? soldPrices : [...soldPrices, ...activePrices];
          const priceSource = soldPrices.length >= 3 ? 'ebay_sold' : 'ebay';
          
          console.log(`[eBay] ${item.name}: ${soldPrices.length} sold prices, ${activePrices.length} active prices`);

          if (pricesToUse.length > 0) {
            const { price: robustPrice, confidence, sampleSize } = calculateRobustPrice(pricesToUse);
            
            // Only update if we don't have a trusted source or current price is very different
            const shouldUpdate = !item.data_source || 
                                 item.data_source === 'internal' || 
                                 item.price_confidence === 'low' ||
                                 !item.current_price || 
                                 item.current_price <= 0;

            if (shouldUpdate && robustPrice > 0) {
              updates.current_price = Math.round(robustPrice * 100) / 100;
              updates.data_source = priceSource; // 'ebay_sold' or 'ebay'
              updates.price_confidence = confidence;
              updates.ebay_sample_size = sampleSize;
              updates.ebay_sold_count = soldPrices.length;
              updates.ebay_last_sync = new Date().toISOString();
              results.pricesUpdated++;

              // Record in price history with detailed metadata
              await supabase.from('price_history').insert({
                product_id: item.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 100) || item.id,
                market_item_id: item.id,
                price: robustPrice,
                source: priceSource,
                sample_size: sampleSize,
                recorded_at: new Date().toISOString(),
              });
              
              console.log(`[sync-ebay] ${priceSource === 'ebay_sold' ? '💰 SOLD' : '📋 Active'} price for ${item.name}: $${robustPrice} (${soldPrices.length} sold, ${sampleSize} total samples, ${confidence} confidence)`);
            }
          }
        }

        // Update the market item
        if (Object.keys(updates).length > 1) {
          const { error: updateError } = await supabase
            .from('market_items')
            .update(updates)
            .eq('id', item.id);

          if (updateError) {
            console.error(`Error updating ${item.name}:`, updateError);
            results.errors++;
          }
        }

        // Rate limiting: 200ms between requests
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`Error processing ${item.name}:`, error);
        results.errors++;
      }
    }

    console.log('Enhanced eBay sync completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
        hasMore: (items?.length || 0) === limit,
        nextOffset: offset + limit,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("eBay sync error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
