import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// deno-lint-ignore no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

interface BackfillRequest {
  tableType?: 'market_items' | 'catalog_cards' | 'listings' | 'card_instances' | 'vault_items' | 'all';
  batchSize?: number;
  dryRun?: boolean;
}

interface TableConfig {
  name: string;
  imageColumn: string;
  statusColumn: string;
}

const TABLES: TableConfig[] = [
  { name: 'market_items', imageColumn: 'image_url', statusColumn: 'normalization_status' },
  { name: 'catalog_cards', imageColumn: 'image_url', statusColumn: 'normalization_status' },
  { name: 'listings', imageColumn: 'image_url', statusColumn: 'normalization_status' },
  { name: 'card_instances', imageColumn: 'image_url', statusColumn: 'normalization_status' },
  { name: 'vault_items', imageColumn: 'image_url', statusColumn: 'normalization_status' },
  { name: 'swap_listings', imageColumn: 'image_url', statusColumn: 'normalization_status' },
  { name: 'boom_pack_cards', imageColumn: 'card_image_url', statusColumn: 'normalization_status' },
];

async function getStats(supabase: AnySupabaseClient) {
  const stats: Record<string, { pending: number; done: number; failed: number; noImage: number }> = {};
  
  for (const table of TABLES) {
    // Get counts for each status
    const { count: pending } = await supabase
      .from(table.name)
      .select('*', { count: 'exact', head: true })
      .eq('normalization_status', 'PENDING')
      .not(table.imageColumn, 'is', null);

    const { count: done } = await supabase
      .from(table.name)
      .select('*', { count: 'exact', head: true })
      .eq('normalization_status', 'DONE');

    const { count: failed } = await supabase
      .from(table.name)
      .select('*', { count: 'exact', head: true })
      .eq('normalization_status', 'FAILED');

    const { count: noImage } = await supabase
      .from(table.name)
      .select('*', { count: 'exact', head: true })
      .is(table.imageColumn, null);

    stats[table.name] = {
      pending: pending || 0,
      done: done || 0,
      failed: failed || 0,
      noImage: noImage || 0,
    };
  }

  return stats;
}

async function processTable(
  supabase: AnySupabaseClient,
  table: TableConfig,
  batchSize: number,
  dryRun: boolean
): Promise<{ processed: number; errors: number }> {
  // Get pending records
  const { data: records, error } = await supabase
    .from(table.name)
    .select(`id, ${table.imageColumn}`)
    .eq('normalization_status', 'PENDING')
    .not(table.imageColumn, 'is', null)
    .limit(batchSize);

  if (error) {
    console.error(`Error fetching ${table.name}:`, error);
    return { processed: 0, errors: 1 };
  }

  if (!records || records.length === 0) {
    console.log(`No pending records in ${table.name}`);
    return { processed: 0, errors: 0 };
  }

  console.log(`Processing ${records.length} records from ${table.name}`);

  if (dryRun) {
    return { processed: records.length, errors: 0 };
  }

  let processed = 0;
  let errors = 0;

  for (const record of records as any[]) {
    try {
      const imageUrl = record[table.imageColumn];
      if (!imageUrl) continue;

      // Call the normalize function
      const response = await supabase.functions.invoke('normalize-card-image', {
        body: {
          imageUrl,
          tableType: table.name,
          recordId: record.id,
        },
      });

      if (response.error) {
        console.error(`Error processing ${table.name}/${record.id}:`, response.error);
        errors++;
      } else {
        processed++;
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (err) {
      console.error(`Exception processing ${table.name}/${record.id}:`, err);
      errors++;
    }
  }

  return { processed, errors };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin role from auth header
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check admin role
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!adminRole) {
        return new Response(
          JSON.stringify({ error: "Admin access required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const body = await req.json().catch(() => ({}));
    const { tableType = 'all', batchSize = 10, dryRun = false } = body as BackfillRequest;

    // Get current stats
    const stats = await getStats(supabase);

    // If just requesting stats
    if (req.method === "GET" || (tableType as string) === 'stats') {
      return new Response(
        JSON.stringify({ stats }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process tables
    const tablesToProcess = tableType === 'all' 
      ? TABLES 
      : TABLES.filter(t => t.name === tableType);

    const results: Record<string, { processed: number; errors: number }> = {};

    for (const table of tablesToProcess) {
      results[table.name] = await processTable(supabase, table, batchSize, dryRun);
    }

    // Get updated stats
    const updatedStats = await getStats(supabase);

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        batchSize,
        results,
        statsBefore: stats,
        statsAfter: updatedStats,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Backfill error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});