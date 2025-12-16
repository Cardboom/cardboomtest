import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Run multiple syncs in sequence to fill images/prices
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      cardmarket_batches = 10,
      batch_size = 30,
      delay_between_batches = 5000,
      categories = ["pokemon", "yugioh", "mtg", "onepiece", "lorcana"],
      also_run_free_sources = true
    } = await req.json().catch(() => ({}));

    console.log(`[bulk-sync] Starting bulk sync: ${cardmarket_batches} batches of ${batch_size}`);

    const results = {
      cardmarket: { batches_run: 0, total_updated: 0, errors: 0 },
      tcgdex: { updated: 0 },
      ygopro: { updated: 0 },
      scryfall: { updated: 0 },
    };

    // Get count of items needing images per category
    const { data: counts } = await supabase
      .from("market_items")
      .select("category")
      .or("image_url.is.null,image_url.like.%placeholder%,image_url.eq.")
      .in("category", categories);

    const categoryCounts: Record<string, number> = {};
    for (const item of counts || []) {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    }
    console.log(`[bulk-sync] Items needing images:`, categoryCounts);

    // Run Cardmarket batches
    let offset = 0;
    for (let i = 0; i < cardmarket_batches; i++) {
      console.log(`[bulk-sync] Running Cardmarket batch ${i + 1}/${cardmarket_batches}, offset ${offset}`);
      
      try {
        const response = await supabase.functions.invoke("sync-cardmarket-images", {
          body: {
            limit: batch_size,
            offset: offset,
            delay_ms: 200, // 5 req/sec = safe under 300/min
            store_price_history: true,
            prioritize_valuable: true
          }
        });

        if (response.error) {
          console.error(`[bulk-sync] Cardmarket batch ${i + 1} error:`, response.error);
          results.cardmarket.errors++;
        } else {
          const data = response.data;
          results.cardmarket.batches_run++;
          results.cardmarket.total_updated += data?.updated || 0;
          console.log(`[bulk-sync] Batch ${i + 1} complete: ${data?.updated || 0} updated`);
        }
      } catch (batchError) {
        console.error(`[bulk-sync] Batch ${i + 1} failed:`, batchError);
        results.cardmarket.errors++;
      }

      offset += batch_size;

      // Delay between batches to spread out requests
      if (i < cardmarket_batches - 1) {
        await new Promise(resolve => setTimeout(resolve, delay_between_batches));
      }
    }

    // Run free source syncs in parallel if requested
    if (also_run_free_sources) {
      console.log(`[bulk-sync] Running free source syncs`);
      
      const freeSourcePromises = [
        supabase.functions.invoke("sync-tcgdex-images", { body: { limit: 200 } })
          .then(r => { results.tcgdex.updated = r.data?.updated || 0; })
          .catch(e => console.error("[bulk-sync] TCGdex error:", e)),
        
        supabase.functions.invoke("sync-ygopro-images", { body: { limit: 200 } })
          .then(r => { results.ygopro.updated = r.data?.updated || 0; })
          .catch(e => console.error("[bulk-sync] YGOPro error:", e)),
        
        supabase.functions.invoke("sync-scryfall-images", { body: { limit: 200 } })
          .then(r => { results.scryfall.updated = r.data?.updated || 0; })
          .catch(e => console.error("[bulk-sync] Scryfall error:", e)),
      ];

      await Promise.allSettled(freeSourcePromises);
    }

    console.log(`[bulk-sync] Complete:`, results);

    return new Response(JSON.stringify({
      success: true,
      results,
      next_offset: offset,
      message: `Processed ${results.cardmarket.batches_run} Cardmarket batches, updated ${results.cardmarket.total_updated} cards`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("[bulk-sync] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
