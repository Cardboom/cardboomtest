import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRICECHARTING_API_KEY = Deno.env.get('PRICECHARTING_API_KEY');

const CSV_URLS: Record<string, string> = {
  'video-games': `https://www.pricecharting.com/price-guide/download-custom?t=${PRICECHARTING_API_KEY}`,
  'pokemon-cards': `https://www.pricecharting.com/price-guide/download-custom?t=${PRICECHARTING_API_KEY}&category=pokemon-cards`,
  'magic-cards': `https://www.pricecharting.com/price-guide/download-custom?t=${PRICECHARTING_API_KEY}&category=magic-cards`,
  'yugioh-cards': `https://www.pricecharting.com/price-guide/download-custom?t=${PRICECHARTING_API_KEY}&category=yugioh-cards`,
};

const CATEGORY_MAP: Record<string, string> = {
  'video-games': 'gaming',
  'pokemon-cards': 'pokemon',
  'magic-cards': 'mtg',
  'yugioh-cards': 'yugioh',
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
}

function parsePrice(priceStr: string): number {
  if (!priceStr || priceStr === 'N/A' || priceStr === '') return 0;
  const cleaned = priceStr.replace(/[$,]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

async function fetchAndParseCSV(url: string): Promise<any[]> {
  console.log(`Fetching CSV from: ${url.substring(0, 80)}...`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
  }
  
  const text = await response.text();
  const lines = text.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    console.log('CSV has no data rows');
    return [];
  }
  
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, '_'));
  console.log(`CSV headers: ${headers.join(', ')}`);
  
  const records: any[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const record: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });
    
    records.push(record);
  }
  
  console.log(`Parsed ${records.length} records from CSV`);
  return records;
}

function mapToMarketItem(record: Record<string, string>, category: string): any {
  // PriceCharting CSV columns vary by category but typically include:
  // id, product-name, console-name, loose-price, cib-price, new-price, graded-price
  
  const name = record.product_name || record.name || record.title || '';
  const consoleName = record.console_name || record.set || record.set_name || '';
  const externalId = record.id || record.product_id || '';
  
  // Parse different price tiers
  const loosePrice = parsePrice(record.loose_price || record.price || '0');
  const cibPrice = parsePrice(record.cib_price || '0');
  const newPrice = parsePrice(record.new_price || '0');
  const gradedPrice = parsePrice(record.graded_price || '0');
  
  // Use the most relevant price as current_price
  const currentPrice = gradedPrice || newPrice || cibPrice || loosePrice || 0;
  
  if (!name || currentPrice === 0) {
    return null;
  }
  
  return {
    name: name.substring(0, 500),
    category,
    set_name: consoleName.substring(0, 200) || null,
    external_id: externalId ? `pricecharting_${externalId}` : null,
    current_price: currentPrice,
    base_price: loosePrice || currentPrice,
    data_source: 'pricecharting',
    rarity: record.rarity || null,
    series: record.series || record.console_name || null,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { category, limit = 1000 } = await req.json().catch(() => ({}));
    
    const categoriesToProcess = category ? [category] : Object.keys(CSV_URLS);
    
    const results: Record<string, { imported: number; errors: number }> = {};
    
    for (const cat of categoriesToProcess) {
      const csvUrl = CSV_URLS[cat];
      if (!csvUrl) {
        console.log(`Unknown category: ${cat}`);
        continue;
      }
      
      const marketCategory = CATEGORY_MAP[cat];
      console.log(`Processing category: ${cat} -> ${marketCategory}`);
      
      try {
        const records = await fetchAndParseCSV(csvUrl);
        const limitedRecords = records.slice(0, limit);
        
        let imported = 0;
        let errors = 0;
        
        // Process in batches of 100
        const batchSize = 100;
        for (let i = 0; i < limitedRecords.length; i += batchSize) {
          const batch = limitedRecords.slice(i, i + batchSize);
          const marketItems = batch
            .map(r => mapToMarketItem(r, marketCategory))
            .filter(item => item !== null);
          
          if (marketItems.length === 0) continue;
          
          const { data, error } = await supabase
            .from('market_items')
            .upsert(marketItems, { 
              onConflict: 'external_id',
              ignoreDuplicates: false 
            })
            .select('id');
          
          if (error) {
            console.error(`Batch error for ${cat}:`, error.message);
            errors += batch.length;
          } else {
            imported += data?.length || 0;
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        results[cat] = { imported, errors };
        console.log(`Category ${cat}: imported ${imported}, errors ${errors}`);
        
      } catch (err) {
        console.error(`Failed to process ${cat}:`, err);
        results[cat] = { imported: 0, errors: 1 };
      }
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      results,
      message: 'CSV import completed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error: unknown) {
    console.error('Import error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
