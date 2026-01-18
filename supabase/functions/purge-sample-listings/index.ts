import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PurgeRequest {
  sample_batch_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { sample_batch_id }: PurgeRequest = await req.json().catch(() => ({}))

    console.log(`[purge-sample-listings] Starting purge. batch_id=${sample_batch_id || 'ALL'}`)

    // Build the delete query
    let query = supabase
      .from('listings')
      .delete()
      .eq('is_sample', true)

    if (sample_batch_id) {
      query = query.eq('sample_batch_id', sample_batch_id)
    }

    // First count what we're about to delete
    const countQuery = supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('is_sample', true)

    if (sample_batch_id) {
      countQuery.eq('sample_batch_id', sample_batch_id)
    }

    const { count: beforeCount } = await countQuery

    // Execute delete
    const { error: deleteError } = await query

    if (deleteError) {
      console.error('[purge-sample-listings] Delete error:', deleteError)
      throw new Error(`Failed to delete listings: ${deleteError.message}`)
    }

    // If batch_id provided, also delete the batch record
    if (sample_batch_id) {
      await supabase
        .from('sample_listing_batches')
        .delete()
        .eq('id', sample_batch_id)
    } else {
      // Delete all batch records
      await supabase
        .from('sample_listing_batches')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
    }

    console.log(`[purge-sample-listings] Deleted ${beforeCount || 0} sample listings`)

    return new Response(JSON.stringify({
      success: true,
      deleted_count: beforeCount || 0,
      batch_id: sample_batch_id || null,
      message: sample_batch_id 
        ? `Deleted ${beforeCount} listings from batch ${sample_batch_id}`
        : `Deleted all ${beforeCount} sample listings`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[purge-sample-listings] Error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
