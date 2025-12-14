import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const JUSTTCG_API_KEY = Deno.env.get('JUSTTCG_API_KEY');
const JUSTTCG_BASE_URL = 'https://api.justtcg.com/v1';

// Map our categories to JustTCG game identifiers
const categoryToGame: Record<string, string> = {
  'pokemon': 'pokemon',
  'mtg': 'magic',
  'yugioh': 'yugioh',
  'lorcana': 'lorcana',
  'onepiece': 'onepiece',
  'digimon': 'digimon',
};

interface PriceStats {
  avgPrice?: number;
  priceChange?: number;
  minPrice?: number;
  maxPrice?: number;
  volatility?: number;
  trendSlope?: number;
}

interface CardPriceData {
  price: number | null;
  stats7d: PriceStats | null;
  stats30d: PriceStats | null;
  stats90d: PriceStats | null;
  stats1y: PriceStats | null;
  cardName: string | null;
  setName: string | null;
}

async function fetchJustTCGPrice(game: string, query: string): Promise<CardPriceData | null> {
  if (!JUSTTCG_API_KEY) {
    console.error('[sync-justtcg] Missing JUSTTCG_API_KEY');
    return null;
  }

  try {
    const url = `${JUSTTCG_BASE_URL}/cards?game=${game}&q=${encodeURIComponent(query)}&limit=1`;
    console.log(`[sync-justtcg] Fetching: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'x-api-key': JUSTTCG_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[sync-justtcg] API error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error(`[sync-justtcg] Response: ${text}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.cards || data.cards.length === 0) {
      console.log(`[sync-justtcg] No cards found for: ${query}`);
      return null;
    }

    const card = data.cards[0];
    console.log(`[sync-justtcg] Found card: ${card.name} from set ${card.setName || 'unknown'}`);
    
    // Get price from variants - prefer Near Mint condition
    let price: number | null = null;
    let stats7d: PriceStats | null = null;
    let stats30d: PriceStats | null = null;
    let stats90d: PriceStats | null = null;
    let stats1y: PriceStats | null = null;

    if (card.variants && card.variants.length > 0) {
      // Find Near Mint variant or use first available
      const nmVariant = card.variants.find((v: any) => 
        v.condition?.toLowerCase().includes('near mint') || 
        v.condition?.toLowerCase() === 'nm'
      ) || card.variants[0];

      price = nmVariant.price || null;
      
      // Extract statistical data for each timeframe
      if (nmVariant.stats) {
        if (nmVariant.stats['7d']) {
          stats7d = {
            avgPrice: nmVariant.stats['7d'].avgPrice,
            priceChange: nmVariant.stats['7d'].priceChange,
            minPrice: nmVariant.stats['7d'].minPrice,
            maxPrice: nmVariant.stats['7d'].maxPrice,
            volatility: nmVariant.stats['7d'].stddevPopPrice,
            trendSlope: nmVariant.stats['7d'].trendSlope,
          };
        }
        if (nmVariant.stats['30d']) {
          stats30d = {
            avgPrice: nmVariant.stats['30d'].avgPrice,
            priceChange: nmVariant.stats['30d'].priceChange,
            minPrice: nmVariant.stats['30d'].minPrice,
            maxPrice: nmVariant.stats['30d'].maxPrice,
            volatility: nmVariant.stats['30d'].stddevPopPrice,
            trendSlope: nmVariant.stats['30d'].trendSlope,
          };
        }
        if (nmVariant.stats['90d']) {
          stats90d = {
            avgPrice: nmVariant.stats['90d'].avgPrice,
            priceChange: nmVariant.stats['90d'].priceChange,
            minPrice: nmVariant.stats['90d'].minPrice,
            maxPrice: nmVariant.stats['90d'].maxPrice,
            volatility: nmVariant.stats['90d'].stddevPopPrice,
            trendSlope: nmVariant.stats['90d'].trendSlope,
          };
        }
        if (nmVariant.stats['1y']) {
          stats1y = {
            avgPrice: nmVariant.stats['1y'].avgPrice,
            priceChange: nmVariant.stats['1y'].priceChange,
            minPrice: nmVariant.stats['1y'].minPrice,
            maxPrice: nmVariant.stats['1y'].maxPrice,
            volatility: nmVariant.stats['1y'].stddevPopPrice,
            trendSlope: nmVariant.stats['1y'].trendSlope,
          };
        }
      }
    }

    console.log(`[sync-justtcg] Price for ${query}: $${price}, 7d change: ${stats7d?.priceChange}%, 30d change: ${stats30d?.priceChange}%`);
    
    return { 
      price, 
      stats7d, 
      stats30d, 
      stats90d, 
      stats1y,
      cardName: card.name,
      setName: card.setName,
    };
  } catch (error) {
    console.error(`[sync-justtcg] Error fetching ${query}:`, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[sync-justtcg] Starting price sync with historical data...');

    // Fetch market items for supported categories
    const supportedCategories = Object.keys(categoryToGame);
    const { data: marketItems, error: fetchError } = await supabase
      .from('market_items')
      .select('id, name, category, current_price, change_7d, change_30d, set_name')
      .in('category', supportedCategories);

    if (fetchError) {
      console.error('[sync-justtcg] Error fetching market items:', fetchError);
      throw fetchError;
    }

    console.log(`[sync-justtcg] Found ${marketItems?.length || 0} items to process`);

    const results = {
      updated: 0,
      skipped: 0,
      errors: 0,
      historyRecords: 0,
      items: [] as { name: string; oldPrice: number; newPrice: number | null; status: string; hasHistory: boolean }[],
    };

    for (const item of marketItems || []) {
      const game = categoryToGame[item.category];
      if (!game) {
        results.skipped++;
        continue;
      }

      // Build search query from item name
      const searchQuery = item.name.toLowerCase().replace(/[^\w\s]/g, '');
      
      const priceData = await fetchJustTCGPrice(game, searchQuery);
      
      if (priceData && priceData.price) {
        // Update market_items with current price and change percentages
        const updateData: Record<string, any> = {
          current_price: priceData.price,
          data_source: 'justtcg',
          updated_at: new Date().toISOString(),
        };

        // Add percentage changes if available
        if (priceData.stats7d?.priceChange !== undefined) {
          updateData.change_7d = priceData.stats7d.priceChange;
        }
        if (priceData.stats30d?.priceChange !== undefined) {
          updateData.change_30d = priceData.stats30d.priceChange;
        }
        if (priceData.setName) {
          updateData.set_name = priceData.setName;
        }

        const { error: updateError } = await supabase
          .from('market_items')
          .update(updateData)
          .eq('id', item.id);

        if (updateError) {
          console.error(`[sync-justtcg] Error updating ${item.name}:`, updateError);
          results.errors++;
          results.items.push({ name: item.name, oldPrice: item.current_price, newPrice: null, status: 'error', hasHistory: false });
        } else {
          console.log(`[sync-justtcg] Updated ${item.name}: $${item.current_price} -> $${priceData.price}`);
          results.updated++;

          // Store current price in history
          await supabase.from('price_history').insert({
            product_id: item.id,
            price: priceData.price,
            source: 'justtcg',
          });
          results.historyRecords++;

          // Store historical avg prices for charting (create synthetic history points)
          const now = new Date();
          const historyPoints = [];

          if (priceData.stats7d?.avgPrice) {
            const date7d = new Date(now);
            date7d.setDate(date7d.getDate() - 7);
            historyPoints.push({
              product_id: item.id,
              price: priceData.stats7d.avgPrice,
              source: 'justtcg-7d-avg',
              recorded_at: date7d.toISOString(),
            });
          }

          if (priceData.stats30d?.avgPrice) {
            const date30d = new Date(now);
            date30d.setDate(date30d.getDate() - 30);
            historyPoints.push({
              product_id: item.id,
              price: priceData.stats30d.avgPrice,
              source: 'justtcg-30d-avg',
              recorded_at: date30d.toISOString(),
            });
          }

          if (priceData.stats90d?.avgPrice) {
            const date90d = new Date(now);
            date90d.setDate(date90d.getDate() - 90);
            historyPoints.push({
              product_id: item.id,
              price: priceData.stats90d.avgPrice,
              source: 'justtcg-90d-avg',
              recorded_at: date90d.toISOString(),
            });
          }

          if (priceData.stats1y?.avgPrice) {
            const date1y = new Date(now);
            date1y.setFullYear(date1y.getFullYear() - 1);
            historyPoints.push({
              product_id: item.id,
              price: priceData.stats1y.avgPrice,
              source: 'justtcg-1y-avg',
              recorded_at: date1y.toISOString(),
            });
          }

          if (historyPoints.length > 0) {
            const { error: historyError } = await supabase
              .from('price_history')
              .insert(historyPoints);

            if (historyError) {
              console.error(`[sync-justtcg] Error inserting history for ${item.name}:`, historyError);
            } else {
              results.historyRecords += historyPoints.length;
              console.log(`[sync-justtcg] Added ${historyPoints.length} history points for ${item.name}`);
            }
          }

          results.items.push({ 
            name: item.name, 
            oldPrice: item.current_price, 
            newPrice: priceData.price, 
            status: 'updated',
            hasHistory: historyPoints.length > 0,
          });
        }
      } else {
        console.log(`[sync-justtcg] No price found for: ${item.name}`);
        results.skipped++;
        results.items.push({ name: item.name, oldPrice: item.current_price, newPrice: null, status: 'not_found', hasHistory: false });
      }

      // Rate limiting - 10 requests/min on free plan = 6.5 seconds between requests
      await new Promise(resolve => setTimeout(resolve, 6500));
    }

    console.log(`[sync-justtcg] Sync complete. Updated: ${results.updated}, History records: ${results.historyRecords}, Skipped: ${results.skipped}, Errors: ${results.errors}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Synced ${results.updated} prices with ${results.historyRecords} history records from JustTCG`,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[sync-justtcg] Fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
