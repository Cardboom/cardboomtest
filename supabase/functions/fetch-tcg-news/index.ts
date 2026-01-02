import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TCG News sources to scrape headlines from
const NEWS_SOURCES = [
  { name: 'Pokemon News', query: 'Pokemon TCG news 2025' },
  { name: 'Yu-Gi-Oh News', query: 'Yu-Gi-Oh TCG news 2025' },
  { name: 'Magic The Gathering', query: 'MTG Magic The Gathering news 2025' },
  { name: 'Sports Cards', query: 'sports cards collectibles news 2025' },
  { name: 'One Piece TCG', query: 'One Piece TCG card game news' },
  { name: 'Card Grading', query: 'PSA BGS card grading news' },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Category-based royalty-free image URLs from Unsplash
    const CATEGORY_IMAGES: Record<string, string> = {
      pokemon: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=1200&h=630&fit=crop',
      yugioh: 'https://images.unsplash.com/photo-1606503825008-909a67e63c3d?w=1200&h=630&fit=crop',
      mtg: 'https://images.unsplash.com/photo-1606503825008-909a67e63c3d?w=1200&h=630&fit=crop',
      sports: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&h=630&fit=crop',
      onepiece: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&h=630&fit=crop',
      lorcana: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&h=630&fit=crop',
      grading: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&h=630&fit=crop',
      market: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&h=630&fit=crop',
      general: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=1200&h=630&fit=crop',
    };

    // Generate news articles using AI - alternate between Turkish and English
    const newsTopics = [
      { topic: "Pokemon Scarlet & Violet 151 set prices surge as nostalgia drives demand", lang: "en" },
      { topic: "PSA yeni grading fiyatlarını ve süreçlerini 2025 için açıkladı", lang: "tr" },
      { topic: "Yu-Gi-Oh! 25th Anniversary Rarity Collection sells out globally", lang: "en" },
      { topic: "NBA Panini Prizm basketbol kartları işlem hacminde artış gösteriyor", lang: "tr" },
      { topic: "One Piece TCG English release breaks sales records", lang: "en" },
      { topic: "Magic The Gathering yeni Modern Horizons setini duyurdu", lang: "tr" },
      { topic: "Sports card market shows signs of stabilization after 2024 volatility", lang: "en" },
      { topic: "CGC ve BGS grading hizmetlerini birleştirdi", lang: "tr" },
      { topic: "Vintage Pokemon cards reach all-time highs at auction", lang: "en" },
      { topic: "Disney Lorcana genişleme paketi yeni oyun mekaniklerini tanıtıyor", lang: "tr" },
    ];

    const generatedArticles = [];

    for (const { topic, lang } of newsTopics.slice(0, 5)) {
      const languageInstruction = lang === 'tr' 
        ? 'Write the article in Turkish (Türkçe). Use natural Turkish language and proper Turkish grammar.'
        : 'Write the article in English.';

      // Generate article content using OpenAI
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a professional TCG and collectibles news writer for Cardboom, a premier trading card marketplace. Write engaging, SEO-optimized news articles about trading cards, collectibles, and the hobby market. Keep articles informative, balanced, and professional. Include relevant keywords naturally. Write in a style that appeals to collectors and traders. ${languageInstruction}`
            },
            {
              role: 'user',
              content: `Write a news article about: "${topic}". ${languageInstruction}

Include:
1. An engaging headline (different from the topic)
2. A 2-sentence summary
3. A full article (300-400 words) - SEO optimized with proper headings using ## markdown
4. 3-5 relevant tags (in the same language as the article)
5. A category (one of: pokemon, yugioh, mtg, sports, onepiece, lorcana, grading, market)

Format your response as JSON:
{
  "title": "headline",
  "summary": "2 sentence summary",
  "content": "full article with markdown formatting including ## headings for SEO",
  "tags": ["tag1", "tag2"],
  "category": "category"
}`
            }
          ],
          max_tokens: 1200,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        console.error('OpenAI error:', await response.text());
        continue;
      }

      const data = await response.json();
      const articleText = data.choices[0]?.message?.content;

      try {
        // Extract JSON from the response
        const jsonMatch = articleText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const article = JSON.parse(jsonMatch[0]);
          
          // Create slug from title - handle Turkish characters
          const slug = article.title
            .toLowerCase()
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
            .slice(0, 80);

          // Get category-specific image
          const categoryImage = CATEGORY_IMAGES[article.category] || CATEGORY_IMAGES.general;

          generatedArticles.push({
            title: article.title,
            slug: `${slug}-${Date.now().toString(36)}`,
            content: article.content,
            summary: article.summary,
            category: article.category || 'general',
            tags: article.tags || [],
            source_name: 'Cardboom News',
            is_published: true,
            image_url: categoryImage,
          });
        }
      } catch (parseError) {
        console.error('Error parsing article:', parseError);
      }
    }

    // Insert articles into database
    if (generatedArticles.length > 0) {
      const { data: inserted, error } = await supabase
        .from('cardboom_news')
        .insert(generatedArticles)
        .select();

      if (error) {
        console.error('Error inserting articles:', error);
        throw error;
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Generated ${inserted?.length || 0} news articles`,
        articles: inserted 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'No new articles generated' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-tcg-news:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
