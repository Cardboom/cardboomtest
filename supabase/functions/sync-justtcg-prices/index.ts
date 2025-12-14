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
  'one-piece': 'onepiece',
  'digimon': 'digimon',
};

interface HistoryPoint {
  p: number; // price
  t: number; // unix timestamp
}

interface CardPriceData {
  price: number | null;
  avgPrice7d: number | null;
  avgPrice30d: number | null;
  avgPrice90d: number | null;
  priceChange7d: number | null;
  priceChange30d: number | null;
  priceHistory: HistoryPoint[];
  priceHistory30d: HistoryPoint[];
  priceHistory90d: HistoryPoint[];
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

    const responseData = await response.json();
    console.log(`[sync-justtcg] Response keys: ${Object.keys(responseData).join(', ')}`);
    
    // JustTCG returns { data: Card[], meta: ... }
    const cards = responseData.data || responseData.cards || [];
    
    if (!cards || cards.length === 0) {
      console.log(`[sync-justtcg] No cards found for: ${query}`);
      return null;
    }

    const card = cards[0];
    console.log(`[sync-justtcg] Found card: ${card.name} from set ${card.setName || card.set?.name || 'unknown'}`);
    
    // Get price from variants - prefer Near Mint condition
    let price: number | null = null;
    let avgPrice7d: number | null = null;
    let avgPrice30d: number | null = null;
    let avgPrice90d: number | null = null;
    let priceChange7d: number | null = null;
    let priceChange30d: number | null = null;
    let priceHistory: HistoryPoint[] = [];
    let priceHistory30d: HistoryPoint[] = [];
    let priceHistory90d: HistoryPoint[] = [];

    if (card.variants && card.variants.length > 0) {
      // Find Near Mint variant or use first available
      const nmVariant = card.variants.find((v: any) => 
        v.condition?.toLowerCase().includes('near mint') || 
        v.condition?.toLowerCase() === 'nm'
      ) || card.variants[0];

      console.log(`[sync-justtcg] Using variant: ${nmVariant.condition} - ${nmVariant.printing}`);
      console.log(`[sync-justtcg] Variant keys: ${Object.keys(nmVariant).join(', ')}`);

      // Price is at top level of variant
      price = nmVariant.price || null;
      
      // Stats are at top level of variant (not nested)
      avgPrice7d = nmVariant.avgPrice7d || nmVariant.avgPrice || null;
      avgPrice30d = nmVariant.avgPrice30d || null;
      avgPrice90d = nmVariant.avgPrice90d || null;
      priceChange7d = nmVariant.priceChange7d || null;
      priceChange30d = nmVariant.priceChange30d || null;
      
      // Price history arrays
      priceHistory = nmVariant.priceHistory || [];
      priceHistory30d = nmVariant.priceHistory30d || [];
      priceHistory90d = nmVariant.priceHistory90d || [];
    }

    console.log(`[sync-justtcg] Price for ${query}: $${price}, 7d avg: $${avgPrice7d}, 30d avg: $${avgPrice30d}, history points: ${priceHistory.length + priceHistory30d.length + priceHistory90d.length}`);
    
    return { 
      price, 
      avgPrice7d,
      avgPrice30d,
      avgPrice90d,
      priceChange7d,
      priceChange30d,
      priceHistory,
      priceHistory30d,
      priceHistory90d,
      cardName: card.name,
      setName: card.setName || card.set?.name,
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
      items: [] as { name: string; oldPrice: number; newPrice: number | null; status: string; historyCount: number }[],
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
        if (priceData.priceChange7d !== null) {
          updateData.change_7d = priceData.priceChange7d;
        }
        if (priceData.priceChange30d !== null) {
          updateData.change_30d = priceData.priceChange30d;
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
          results.items.push({ name: item.name, oldPrice: item.current_price, newPrice: null, status: 'error', historyCount: 0 });
        } else {
          console.log(`[sync-justtcg] Updated ${item.name}: $${item.current_price} -> $${priceData.price}`);
          results.updated++;

          // Store all price history from API
          const historyPoints = [];

          // Add current price
          historyPoints.push({
            product_id: item.id,
            price: priceData.price,
            source: 'justtcg',
          });

          // Add 7-day history points
          for (const point of priceData.priceHistory) {
            historyPoints.push({
              product_id: item.id,
              price: point.p,
              source: 'justtcg-history',
              recorded_at: new Date(point.t * 1000).toISOString(),
            });
          }

          // Add 30-day history points
          for (const point of priceData.priceHistory30d) {
            historyPoints.push({
              product_id: item.id,
              price: point.p,
              source: 'justtcg-history-30d',
              recorded_at: new Date(point.t * 1000).toISOString(),
            });
          }

          // Add 90-day history points
          for (const point of priceData.priceHistory90d) {
            historyPoints.push({
              product_id: item.id,
              price: point.p,
              source: 'justtcg-history-90d',
              recorded_at: new Date(point.t * 1000).toISOString(),
            });
          }

          // Also store avg price points for charting fallback
          const now = new Date();
          if (priceData.avgPrice7d) {
            const date7d = new Date(now);
            date7d.setDate(date7d.getDate() - 7);
            historyPoints.push({
              product_id: item.id,
              price: priceData.avgPrice7d,
              source: 'justtcg-7d-avg',
              recorded_at: date7d.toISOString(),
            });
          }

          if (priceData.avgPrice30d) {
            const date30d = new Date(now);
            date30d.setDate(date30d.getDate() - 30);
            historyPoints.push({
              product_id: item.id,
              price: priceData.avgPrice30d,
              source: 'justtcg-30d-avg',
              recorded_at: date30d.toISOString(),
            });
          }

          if (priceData.avgPrice90d) {
            const date90d = new Date(now);
            date90d.setDate(date90d.getDate() - 90);
            historyPoints.push({
              product_id: item.id,
              price: priceData.avgPrice90d,
              source: 'justtcg-90d-avg',
              recorded_at: date90d.toISOString(),
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
            historyCount: historyPoints.length,
          });
        }
      } else {
        console.log(`[sync-justtcg] No price found for: ${item.name}`);
        results.skipped++;
        results.items.push({ name: item.name, oldPrice: item.current_price, newPrice: null, status: 'not_found', historyCount: 0 });
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
