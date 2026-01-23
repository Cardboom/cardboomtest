import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// SEO Configuration - matches frontend src/lib/seo/config.ts
const VERTICAL_CONFIG: Record<string, { slug: string; displayName: string }> = {
  pokemon: { slug: 'pokemon', displayName: 'Pokémon' },
  mtg: { slug: 'mtg', displayName: 'Magic: The Gathering' },
  yugioh: { slug: 'yugioh', displayName: 'Yu-Gi-Oh!' },
  onepiece: { slug: 'one-piece', displayName: 'One Piece' },
  lorcana: { slug: 'lorcana', displayName: 'Disney Lorcana' },
  nba: { slug: 'nba', displayName: 'NBA' },
  nfl: { slug: 'nfl', displayName: 'NFL' },
  mlb: { slug: 'mlb', displayName: 'MLB' },
  figures: { slug: 'figures', displayName: 'Figures' },
  digimon: { slug: 'digimon', displayName: 'Digimon' },
  dragonball: { slug: 'dragonball', displayName: 'Dragon Ball' },
}

// Deal templates for programmatic pages
const DEAL_TEMPLATES = ['under-10', 'under-50', 'under-100', 'psa-10', 'psa-9', 'bgs-10', 'raw', 'vintage', 'japanese', 'first-edition']

// Popular cards for character-specific deal pages
const POPULAR_CARDS: Record<string, string[]> = {
  pokemon: ['charizard', 'pikachu', 'mewtwo', 'mew', 'blastoise', 'venusaur', 'gengar'],
  yugioh: ['blue-eyes-white-dragon', 'dark-magician', 'exodia', 'red-eyes-black-dragon'],
  onepiece: ['luffy', 'zoro', 'shanks', 'nami', 'sanji'],
  mtg: ['black-lotus', 'mox-sapphire', 'time-walk'],
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const url = new URL(req.url)
    const type = url.searchParams.get('type') || 'index'
    const page = parseInt(url.searchParams.get('page') || '1')
    const baseUrl = 'https://www.cardboom.com'
    const today = new Date().toISOString().split('T')[0]
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/sitemap`

    // ============= Sitemap Index =============
    if (type === 'index') {
      const { count } = await supabase
        .from('market_items')
        .select('id', { count: 'exact', head: true })

      const totalItems = count || 0
      const itemsPerSitemap = 5000
      const totalCardSitemaps = Math.ceil(totalItems / itemsPerSitemap)
      const categories = Object.keys(VERTICAL_CONFIG)

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static pages -->
  <sitemap>
    <loc>${baseUrl}/sitemap-static.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  
  <!-- Category pages -->
  <sitemap>
    <loc>${edgeFunctionUrl}?type=categories</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  
  <!-- Programmatic deal pages -->
  <sitemap>
    <loc>${edgeFunctionUrl}?type=deals</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  
  <!-- Active listings -->
  <sitemap>
    <loc>${edgeFunctionUrl}?type=listings</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
`
      // Card catalog sitemaps (paginated)
      for (let i = 1; i <= totalCardSitemaps; i++) {
        xml += `  <sitemap>
    <loc>${edgeFunctionUrl}?type=cards&amp;page=${i}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
`
      }

      // Category-specific sitemaps for better organization
      for (const category of categories) {
        xml += `  <sitemap>
    <loc>${edgeFunctionUrl}?type=category&amp;cat=${category}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
`
      }

      xml += `</sitemapindex>`

      return new Response(xml, {
        headers: { ...corsHeaders, 'Content-Type': 'application/xml' }
      })
    }

    // ============= Category Pages Sitemap =============
    if (type === 'categories') {
      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`
      for (const [dbKey, config] of Object.entries(VERTICAL_CONFIG)) {
        xml += `  <url>
    <loc>${baseUrl}/buy/${config.slug}-cards</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
`
      }
      xml += `</urlset>`

      return new Response(xml, {
        headers: { ...corsHeaders, 'Content-Type': 'application/xml' }
      })
    }

    // ============= Programmatic Deal Pages Sitemap =============
    if (type === 'deals') {
      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`
      // Generate all template + category combinations
      for (const [dbKey, config] of Object.entries(VERTICAL_CONFIG)) {
        for (const template of DEAL_TEMPLATES) {
          let dealUrl = ''
          
          if (template.startsWith('under-')) {
            dealUrl = `/deals/${config.slug}-cards-${template}`
          } else if (template.startsWith('psa-') || template.startsWith('bgs-')) {
            dealUrl = `/deals/${template}-${config.slug}-cards`
          } else {
            dealUrl = `/deals/${template}-${config.slug}-cards`
          }
          
          xml += `  <url>
    <loc>${baseUrl}${dealUrl}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`
        }
      }

      // Popular card deal pages
      for (const [category, cards] of Object.entries(POPULAR_CARDS)) {
        for (const card of cards) {
          xml += `  <url>
    <loc>${baseUrl}/deals/${card}-cards</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.75</priority>
  </url>
`
        }
      }

      xml += `</urlset>`

      return new Response(xml, {
        headers: { ...corsHeaders, 'Content-Type': 'application/xml' }
      })
    }

    // ============= Active Listings Sitemap =============
    if (type === 'listings') {
      const { data: listings, error } = await supabase
        .from('listings')
        .select('id, slug, category, title, updated_at, image_url')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10000)

      if (error) throw error

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`
      for (const listing of listings || []) {
        const lastmod = listing.updated_at?.split('T')[0] || today
        const listingUrl = listing.slug 
          ? `/listing/${listing.category}/${listing.slug}`
          : `/listing/${listing.id}`
          
        xml += `  <url>
    <loc>${baseUrl}${listingUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>`

        if (listing.image_url) {
          const title = escapeXml(listing.title || 'Listing')
          xml += `
    <image:image>
      <image:loc>${escapeXml(listing.image_url)}</image:loc>
      <image:title>${title}</image:title>
    </image:image>`
        }
        
        xml += `
  </url>
`
      }

      xml += `</urlset>`

      return new Response(xml, {
        headers: { ...corsHeaders, 'Content-Type': 'application/xml' }
      })
    }

    // ============= Cards Sitemap (Paginated) =============
    if (type === 'cards') {
      const itemsPerPage = 5000
      const offset = (page - 1) * itemsPerPage

      const { data: items, error } = await supabase
        .from('market_items')
        .select('id, name, category, current_price, updated_at, image_url, change_24h, change_7d')
        .order('current_price', { ascending: false })
        .range(offset, offset + itemsPerPage - 1)

      if (error) throw error

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`
      for (const item of items || []) {
        const slug = slugify(item.name)
        const categorySlug = VERTICAL_CONFIG[item.category]?.slug || item.category
        const lastmod = item.updated_at?.split('T')[0] || today
        const priority = item.current_price > 10000 ? '0.9' : item.current_price > 1000 ? '0.8' : '0.7'
        const changeFreq = Math.abs(item.change_24h || 0) > 5 ? 'hourly' : 
                          Math.abs(item.change_7d || 0) > 10 ? 'daily' : 'weekly'

        xml += `  <url>
    <loc>${baseUrl}/cards/${categorySlug}/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changeFreq}</changefreq>
    <priority>${priority}</priority>`
        
        if (item.image_url) {
          const title = escapeXml(item.name)
          xml += `
    <image:image>
      <image:loc>${escapeXml(item.image_url)}</image:loc>
      <image:title>${title} - Price Chart and Market Data</image:title>
      <image:caption>${title} trading card. Current price: $${item.current_price}</image:caption>
    </image:image>`
        }
        
        xml += `
  </url>
`
        // High-value items get grade-specific URLs
        if (item.current_price > 100) {
          for (const grade of ['psa10', 'psa9', 'raw']) {
            xml += `  <url>
    <loc>${baseUrl}/cards/${categorySlug}/${slug}?grade=${grade}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`
          }
        }
      }

      xml += `</urlset>`

      return new Response(xml, {
        headers: { ...corsHeaders, 'Content-Type': 'application/xml' }
      })
    }

    // ============= Category-specific Sitemap =============
    if (type === 'category') {
      const category = url.searchParams.get('cat')
      if (!category) {
        return new Response('Missing category parameter', { status: 400 })
      }

      const { data: items, error } = await supabase
        .from('market_items')
        .select('id, name, category, current_price, updated_at, image_url')
        .eq('category', category)
        .order('current_price', { ascending: false })
        .limit(10000)

      if (error) throw error

      const categorySlug = VERTICAL_CONFIG[category]?.slug || category

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`
      for (const item of items || []) {
        const slug = slugify(item.name)
        const lastmod = item.updated_at?.split('T')[0] || today
        
        xml += `  <url>
    <loc>${baseUrl}/cards/${categorySlug}/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`
      }

      xml += `</urlset>`

      return new Response(xml, {
        headers: { ...corsHeaders, 'Content-Type': 'application/xml' }
      })
    }

    return new Response('Invalid sitemap type', { status: 400 })

  } catch (error) {
    console.error('Sitemap error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// ============= Utility Functions =============
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
