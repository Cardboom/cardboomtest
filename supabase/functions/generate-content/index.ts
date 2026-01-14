import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Content categories with SEO/AEO optimization
const CONTENT_TYPES = {
  education: {
    label: 'Education',
    topics: [
      'How to grade Pokemon cards at home before PSA submission',
      'Understanding card centering: the complete guide for collectors',
      'Spotting fake Pokemon cards: 10 red flags to watch for',
      'Card grading scale explained: PSA vs BGS vs CGC comparison',
      'How to preserve your trading cards for maximum value',
      'Understanding card surface quality and grading impact',
      'Edge wear on cards: what graders look for',
      'Corner damage assessment guide for card collectors',
    ],
    keywords: ['card grading guide', 'how to grade cards', 'card authentication', 'card condition assessment'],
  },
  'market-analysis': {
    label: 'Market Analysis',
    topics: [
      'Pokemon card market trends: what\'s hot in 2025',
      'One Piece TCG price surge: analyzing the Japanese market impact',
      'MTG Reserved List cards: investment analysis for 2025',
      'Sports card market recovery: key indicators to watch',
      'Vintage vs modern cards: where to invest in 2025',
      'Graded card premiums: understanding the PSA 10 multiplier',
      'TCG market volatility: how to protect your collection value',
      'Card market cycles: timing your buys and sells',
    ],
    keywords: ['card market analysis', 'TCG investing', 'card price trends', 'collectibles market'],
  },
  platform: {
    label: 'Platform Updates',
    topics: [
      'CardBoom AI grading: how our technology works',
      'New portfolio tracking features for serious collectors',
      'Understanding CardBoom\'s price discovery algorithm',
      'CardBoom verified sellers: our authentication process',
      'Mobile app updates: grade cards from your phone',
      'CardBoom rewards program: earning while collecting',
      'How CardBoom prevents price manipulation',
      'CardBoom subscription tiers: which is right for you',
    ],
    keywords: ['CardBoom features', 'AI card grading', 'card marketplace', 'portfolio tracker'],
  },
};

// Game verticals for rotation
const GAME_VERTICALS = ['pokemon', 'one-piece', 'mtg', 'sports'];

// Secondary keywords for all articles
const SECONDARY_KEYWORDS = [
  'AI card grading', 'card value estimation', 'PSA BGS CGC',
  'CardBoom grading index', 'AI pre-grading', 'card authentication',
];

// Generate FAQ schema for AEO
function generateFAQs(topic: string, vertical: string): Array<{ question: string; answer: string }> {
  const faqs = [
    {
      question: `What is the best way to grade ${vertical} cards?`,
      answer: `The best approach combines AI pre-grading tools like CardBoom with professional services like PSA or BGS. AI grading provides instant estimates, helping you decide which cards are worth professional submission.`,
    },
    {
      question: `How much does ${vertical} card grading cost?`,
      answer: `Professional grading costs $15-150+ per card depending on service level. CardBoom's AI grading is included with subscription tiers, offering instant preliminary grades before professional submission.`,
    },
    {
      question: `How long does card grading take?`,
      answer: `PSA standard service takes 30-60 days. Express services can be 5-10 days but cost more. CardBoom AI grading is instant, giving you immediate grade estimates to prioritize submissions.`,
    },
  ];
  return faqs;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request body
    let contentType = 'education';
    let count = 3;
    try {
      const body = await req.text();
      if (body && body.trim()) {
        const parsed = JSON.parse(body);
        contentType = parsed.contentType || 'education';
        count = parsed.count || 3;
      }
    } catch {
      // Use defaults
    }

    // Get the day of year for rotation
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const verticalIndex = dayOfYear % GAME_VERTICALS.length;
    const currentVertical = GAME_VERTICALS[verticalIndex];

    // Check recently used keywords
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentLogs } = await supabase
      .from('content_engine_log')
      .select('primary_keyword')
      .gte('published_date', thirtyDaysAgo);
    
    const usedKeywords = new Set(recentLogs?.map(l => l.primary_keyword) || []);

    // Select content configuration
    const contentConfig = CONTENT_TYPES[contentType as keyof typeof CONTENT_TYPES] || CONTENT_TYPES.education;
    
    // Filter out recently used topics
    const availableTopics = contentConfig.topics.filter(t => !usedKeywords.has(t));
    const selectedTopics = availableTopics.slice(0, count);

    if (selectedTopics.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'All topics have been used recently. Try again tomorrow.',
        generated: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const generatedArticles = [];

    for (const topic of selectedTopics) {
      // Generate FAQs for this topic
      const faqs = generateFAQs(topic, currentVertical);
      
      // Build the SEO-optimized prompt
      const systemPrompt = `You are an expert TCG content writer for CardBoom, a premier trading card marketplace with AI grading technology. 

Write SEO and AEO (Answer Engine Optimization) optimized content that:
1. Targets the primary keyword naturally (2-3% density)
2. Includes secondary keywords: ${SECONDARY_KEYWORDS.join(', ')}
3. Uses proper heading hierarchy (H2, H3) with keywords
4. Includes a "Key Takeaways" section at the start
5. Uses comparison tables where appropriate
6. Answers common questions directly and concisely
7. Links concepts to CardBoom's AI grading features naturally
8. Focuses on ${currentVertical.toUpperCase()} vertical today`;

      const userPrompt = `Write a comprehensive article about: "${topic}"

Target these secondary keywords naturally: ${contentConfig.keywords.join(', ')}

Structure the article with:
1. **Key Takeaways** (3-4 bullet points at the start)
2. **Introduction** (hook + value proposition)
3. **Main Content** with 3-4 H2 sections, each with 2-3 H3 subsections
4. **Expert Tips** section
5. **Conclusion** with CTA to CardBoom

Include these FAQ answers inline or in a dedicated section:
${faqs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}

Format as JSON:
{
  "title": "SEO-optimized title under 60 chars",
  "summary": "Meta description under 160 chars with primary keyword",
  "content": "Full markdown article with ## and ### headings",
  "tags": ["5-7 relevant tags"],
  "category": "${contentType}",
  "faqs": [{"question": "...", "answer": "..."}]
}`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI API error:', response.status, errorText);
        continue;
      }

      const data = await response.json();
      const articleText = data.choices[0]?.message?.content;

      try {
        // Extract JSON from response
        const jsonMatch = articleText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const article = JSON.parse(jsonMatch[0]);
          
          // Create SEO-friendly slug
          const slug = article.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
            .slice(0, 80);

          // Generate image using Lovable AI
          let imageUrl = null;
          try {
            const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash-image-preview',
                messages: [
                  {
                    role: 'user',
                    content: `Generate a professional, clean blog header image for an article about "${topic}". 
Style: Modern, minimal, professional trading card theme.
Aspect ratio: 16:9 landscape for blog header.
Include subtle visual elements related to ${currentVertical} trading cards.
Colors: Use rich, premium colors with good contrast.
NO text in the image.`
                  }
                ],
                modalities: ['image', 'text']
              }),
            });

            if (imageResponse.ok) {
              const imageData = await imageResponse.json();
              const generatedImage = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
              if (generatedImage) {
                // Store image in Supabase storage
                const imageBuffer = Uint8Array.from(atob(generatedImage.split(',')[1]), c => c.charCodeAt(0));
                const imagePath = `articles/${slug}-${Date.now()}.png`;
                
                const { error: uploadError } = await supabase.storage
                  .from('content-images')
                  .upload(imagePath, imageBuffer, {
                    contentType: 'image/png',
                    upsert: true
                  });

                if (!uploadError) {
                  const { data: urlData } = supabase.storage
                    .from('content-images')
                    .getPublicUrl(imagePath);
                  imageUrl = urlData.publicUrl;
                }
              }
            }
          } catch (imgError) {
            console.error('Image generation error:', imgError);
            // Use fallback image based on category - TCG-themed images only
            const fallbackImages: Record<string, string> = {
              pokemon: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=1200&h=630&fit=crop',
              'one-piece': 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=1200&h=630&fit=crop',
              mtg: 'https://images.unsplash.com/photo-1606503825008-909a67e63c3d?w=1200&h=630&fit=crop',
              yugioh: 'https://images.unsplash.com/photo-1606503825008-909a67e63c3d?w=1200&h=630&fit=crop',
              sports: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&h=630&fit=crop',
              education: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=1200&h=630&fit=crop',
              grading: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=1200&h=630&fit=crop',
              'market-analysis': 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&h=630&fit=crop',
              platform: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=1200&h=630&fit=crop',
            };
            imageUrl = fallbackImages[contentType] || fallbackImages.pokemon;
          }

          const finalSlug = `${slug}-${Date.now().toString(36)}`;

          // Insert article
          const { data: inserted, error: insertError } = await supabase
            .from('cardboom_news')
            .insert({
              title: article.title,
              slug: finalSlug,
              content: article.content,
              summary: article.summary,
              category: article.category || contentType,
              tags: article.tags || [],
              source_name: 'CardBoom AI',
              is_published: true,
              image_url: imageUrl,
            })
            .select()
            .single();

          if (insertError) {
            console.error('Insert error:', insertError);
            continue;
          }

          // Log to content engine for deduplication
          await supabase.from('content_engine_log').insert({
            article_slug: finalSlug,
            primary_keyword: topic,
            secondary_keywords: contentConfig.keywords,
            game_vertical: currentVertical,
            faq_schema: article.faqs || faqs,
          });

          generatedArticles.push(inserted);
        }
      } catch (parseError) {
        console.error('Parse error:', parseError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Generated ${generatedArticles.length} articles`,
      articles: generatedArticles,
      vertical: currentVertical
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-content:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
