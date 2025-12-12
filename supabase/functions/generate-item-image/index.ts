import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { item_id, item_name, category, set_name, rarity } = await req.json();
    
    if (!item_name) {
      throw new Error('Item name is required');
    }

    console.log(`Generating image for: ${item_name}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Create a detailed prompt based on item details
    const categoryPrompts: Record<string, string> = {
      'pokemon': 'a high-quality trading card, Pokemon TCG style, holographic shine, collectible card',
      'mtg': 'a Magic: The Gathering card, fantasy art, detailed illustration, collectible trading card',
      'sports-nba': 'a professional basketball trading card, sports memorabilia, action shot, premium quality',
      'sports-nfl': 'a professional American football trading card, sports memorabilia, action shot, premium quality',
      'yugioh': 'a Yu-Gi-Oh! trading card, anime style, dramatic lighting, collectible card',
      'one-piece': 'a One Piece trading card, anime style, vibrant colors, collectible card',
      'lorcana': 'a Disney Lorcana trading card, enchanted style, magical glow, collectible card',
      'figures': 'a collectible figure, designer toy, art sculpture, premium display piece',
      'gaming': 'a gaming collectible, digital art style, vibrant colors, premium quality',
    };

    const categoryHint = categoryPrompts[category] || 'a premium collectible item, high quality, detailed';
    
    const prompt = `Professional product photography of ${item_name}${set_name ? ` from ${set_name}` : ''}${rarity ? `, ${rarity} edition` : ''}. Style: ${categoryHint}. Ultra high resolution, studio lighting, premium presentation on dark elegant background.`;

    console.log('Image prompt:', prompt);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error('No image URL in response:', JSON.stringify(data));
      throw new Error('No image generated');
    }

    console.log('Image generated successfully');

    // If item_id is provided, update the database
    if (item_id) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { error: updateError } = await supabase
        .from('market_items')
        .update({ image_url: imageUrl })
        .eq('id', item_id);

      if (updateError) {
        console.error('Error updating item image:', updateError);
      } else {
        console.log('Item image updated in database');
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      image_url: imageUrl 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-item-image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
