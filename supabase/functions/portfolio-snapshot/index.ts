import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const now = new Date().toISOString()
    
    // Get all users with portfolio items
    const { data: usersWithPortfolios, error: usersError } = await supabase
      .from('portfolio_items')
      .select('user_id')
      .not('user_id', 'is', null)
    
    if (usersError) {
      throw usersError
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(usersWithPortfolios?.map(p => p.user_id).filter(Boolean) || [])]
    
    if (uniqueUserIds.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No portfolios to snapshot',
        recorded: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`[portfolio-snapshot] Processing ${uniqueUserIds.length} users`)

    let recordedCount = 0
    const errors: string[] = []

    for (const userId of uniqueUserIds) {
      try {
        // Get portfolio items
        const { data: portfolioItems, error: portfolioError } = await supabase
          .from('portfolio_items')
          .select('id, quantity, purchase_price, market_item_id')
          .eq('user_id', userId)

        if (portfolioError) {
          errors.push(`User ${userId}: ${portfolioError.message}`)
          continue
        }

        // Calculate total portfolio value
        let totalValue = 0
        let totalCost = 0
        let itemCount = 0

        for (const item of portfolioItems || []) {
          const quantity = Number(item.quantity) || 1
          const purchasePrice = Number(item.purchase_price) || 0
          
          // Fetch current price from market_items
          let currentPrice = purchasePrice
          if (item.market_item_id) {
            const { data: marketItem } = await supabase
              .from('market_items')
              .select('current_price')
              .eq('id', item.market_item_id)
              .single()
            
            if (marketItem?.current_price) {
              currentPrice = Number(marketItem.current_price)
            }
          }

          totalValue += currentPrice * quantity
          totalCost += purchasePrice * quantity
          itemCount++
        }

        // Add wallet balance if available
        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_balance_cents')
          .eq('id', userId)
          .single()

        const walletBalance = profile?.wallet_balance_cents 
          ? Number(profile.wallet_balance_cents) / 100 
          : 0

        // Add vault items value
        const { data: vaultItems } = await supabase
          .from('vault_items')
          .select('current_value')
          .eq('user_id', userId)
          .eq('is_active', true)

        const vaultValue = vaultItems?.reduce((sum, v) => sum + (Number(v.current_value) || 0), 0) || 0

        // Add card instances value
        const { data: cardInstances } = await supabase
          .from('card_instances')
          .select('current_value')
          .eq('owner_user_id', userId)
          .eq('is_active', true)

        const cardsValue = cardInstances?.reduce((sum, c) => sum + (Number(c.current_value) || 0), 0) || 0

        const netWorth = totalValue + walletBalance + vaultValue + cardsValue

        // Insert snapshot
        const { error: insertError } = await supabase
          .from('portfolio_snapshots')
          .insert({
            user_id: userId,
            total_value: netWorth,
            total_cost: totalCost,
            item_count: itemCount,
            recorded_at: now
          })

        if (insertError) {
          errors.push(`User ${userId} insert: ${insertError.message}`)
        } else {
          recordedCount++
        }
      } catch (err) {
        errors.push(`User ${userId}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    console.log(`[portfolio-snapshot] Recorded: ${recordedCount}/${uniqueUserIds.length}, Errors: ${errors.length}`)

    return new Response(JSON.stringify({
      success: true,
      recorded: recordedCount,
      total_users: uniqueUserIds.length,
      errors: errors.slice(0, 10)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[portfolio-snapshot] Error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
