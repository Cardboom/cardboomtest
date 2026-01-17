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

    const url = new URL(req.url)
    const type = url.searchParams.get('type') || 'index'
    const page = parseInt(url.searchParams.get('page') || '1')
    const baseUrl = 'https://www.cardboom.com'
    const today = new Date().toISOString().split('T')[0]

    // Sitemap Index
    if (type === 'index') {
      // Count total market items
      const { count } = await supabase
        .from('market_items')
        .select('id', { count: 'exact', head: true })

      const totalItems = count || 0
      const itemsPerSitemap = 5000
      const totalSitemaps = Math.ceil(totalItems / itemsPerSitemap)

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static pages sitemap -->
  <sitemap>
    <loc>${baseUrl}/sitemap-static.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
`
      // Add card sitemaps
      for (let i = 1; i <= totalSitemaps; i++) {
        xml += `  <sitemap>
    <loc>${baseUrl}/api/sitemap?type=cards&amp;page=${i}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
`
      }

      xml += `</sitemapindex>`

      return new Response(xml, {
        headers: { ...corsHeaders, 'Content-Type': 'application/xml' }
      })
    }

    // Cards sitemap pages
    if (type === 'cards') {
      const itemsPerPage = 5000
      const offset = (page - 1) * itemsPerPage

      const { data: items, error } = await supabase
        .from('market_items')
        .select('id, name, category, current_price, updated_at, image_url, change_24h, change_7d')
        .order('current_price', { ascending: false })
        .range(offset, offset + itemsPerPage - 1)

      if (error) throw error

      const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`
      for (const item of items || []) {
        const slug = slugify(item.name)
        const lastmod = item.updated_at?.split('T')[0] || today
        const priority = item.current_price > 10000 ? '0.9' : item.current_price > 1000 ? '0.8' : '0.7'
        
        // Determine change frequency based on price volatility
        const changeFreq = Math.abs(item.change_24h || 0) > 5 ? 'hourly' : 
                          Math.abs(item.change_7d || 0) > 10 ? 'daily' : 'weekly'

        xml += `  <url>
    <loc>${baseUrl}/${item.category}/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changeFreq}</changefreq>
    <priority>${priority}</priority>`
        
        if (item.image_url) {
          xml += `
    <image:image>
      <image:loc>${item.image_url}</image:loc>
      <image:title>${item.name} - Price Chart and Market Data</image:title>
      <image:caption>${item.name} trading card from ${item.category} category. Current price: $${item.current_price}</image:caption>
    </image:image>`
        }
        
        xml += `
  </url>
`
        // Add grade-specific URLs for high-value items
        if (item.current_price > 100) {
          const grades = ['psa10', 'psa9', 'raw']
          for (const grade of grades) {
            xml += `  <url>
    <loc>${baseUrl}/${item.category}/${slug}/${grade}</loc>
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

    // Category-specific sitemaps
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

      const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`
      for (const item of items || []) {
        const slug = slugify(item.name)
        const lastmod = item.updated_at?.split('T')[0] || today
        xml += `  <url>
    <loc>${baseUrl}/${item.category}/${slug}</loc>
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
