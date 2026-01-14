import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TCGDrop {
  id: string;
  name: string;
  tcg: 'pokemon' | 'one-piece' | 'lorcana' | 'riftbound' | 'magic' | 'yugioh' | 'other';
  releaseDate: string;
  type: 'booster-box' | 'starter-deck' | 'collection' | 'promo' | 'expansion';
  imageUrl?: string;
  description?: string;
}

// Known upcoming releases (fallback data)
const KNOWN_RELEASES: TCGDrop[] = [
  {
    id: "pokemon-sv8",
    name: "Surging Sparks",
    tcg: "pokemon",
    releaseDate: "2025-02-07",
    type: "booster-box",
    description: "Scarlet & Violet expansion featuring new ex Pokémon"
  },
  {
    id: "one-piece-op10",
    name: "OP-10 Royal Blood",
    tcg: "one-piece",
    releaseDate: "2025-02-14",
    type: "booster-box",
    description: "New One Piece TCG expansion"
  },
  {
    id: "lorcana-s5",
    name: "Shimmering Skies",
    tcg: "lorcana",
    releaseDate: "2025-02-21",
    type: "booster-box",
    description: "Fifth Lorcana expansion"
  },
  {
    id: "magic-fdn",
    name: "Foundations",
    tcg: "magic",
    releaseDate: "2025-02-28",
    type: "booster-box",
    description: "MTG core set for 2025"
  },
  {
    id: "riftbound-exp2",
    name: "Shadow Realms",
    tcg: "riftbound",
    releaseDate: "2025-03-07",
    type: "expansion",
    description: "Riftbound Origins expansion"
  },
  {
    id: "yugioh-qcdb",
    name: "Quantum Chaos",
    tcg: "yugioh",
    releaseDate: "2025-03-14",
    type: "booster-box",
    description: "Yu-Gi-Oh! spring set"
  },
  {
    id: "pokemon-sv9",
    name: "Journey Together",
    tcg: "pokemon",
    releaseDate: "2025-03-28",
    type: "booster-box",
    description: "Pokémon SV expansion with partner mechanics"
  },
  {
    id: "one-piece-op11",
    name: "OP-11 New Era",
    tcg: "one-piece",
    releaseDate: "2025-04-11",
    type: "booster-box",
    description: "One Piece TCG spring expansion"
  }
];

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    // If we have the API key, try to get AI-enhanced data
    if (LOVABLE_API_KEY) {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `You are a TCG release calendar expert. Return ONLY valid JSON array of upcoming TCG product releases. Today is ${today}. Focus on releases in the next 3 months. Include Pokemon, One Piece, Lorcana, Magic: The Gathering, Yu-Gi-Oh, and any other major TCGs.`
              },
              {
                role: "user",
                content: `List upcoming TCG booster box and expansion releases for the next 3 months. Return JSON array with format: [{"id": "unique-id", "name": "Product Name", "tcg": "pokemon|one-piece|lorcana|riftbound|magic|yugioh|other", "releaseDate": "YYYY-MM-DD", "type": "booster-box|starter-deck|collection|promo|expansion", "description": "Brief description"}]. Only include confirmed or highly likely releases.`
              }
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "get_tcg_releases",
                  description: "Returns upcoming TCG product releases",
                  parameters: {
                    type: "object",
                    properties: {
                      releases: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                            tcg: { type: "string", enum: ["pokemon", "one-piece", "lorcana", "riftbound", "magic", "yugioh", "other"] },
                            releaseDate: { type: "string" },
                            type: { type: "string", enum: ["booster-box", "starter-deck", "collection", "promo", "expansion"] },
                            description: { type: "string" }
                          },
                          required: ["id", "name", "tcg", "releaseDate", "type"]
                        }
                      }
                    },
                    required: ["releases"]
                  }
                }
              }
            ],
            tool_choice: { type: "function", function: { name: "get_tcg_releases" } }
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
          
          if (toolCall?.function?.arguments) {
            const parsed = JSON.parse(toolCall.function.arguments);
            if (parsed.releases && Array.isArray(parsed.releases)) {
              // Merge with known releases, removing duplicates
              const aiReleases = parsed.releases as TCGDrop[];
              const mergedReleases = [...KNOWN_RELEASES];
              
              for (const release of aiReleases) {
                if (!mergedReleases.some(r => r.id === release.id || r.name === release.name)) {
                  mergedReleases.push(release);
                }
              }
              
              // Sort by date
              mergedReleases.sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime());
              
              // Filter to only future releases
              const futureReleases = mergedReleases.filter(r => new Date(r.releaseDate) >= new Date(today));
              
              return new Response(
                JSON.stringify({ releases: futureReleases.slice(0, 12), source: 'ai-enhanced' }),
                { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
              );
            }
          }
        }
      } catch (aiError) {
        console.error("AI fetch failed, using fallback:", aiError);
      }
    }

    // Fallback to known releases
    const today = new Date().toISOString().split('T')[0];
    const futureReleases = KNOWN_RELEASES
      .filter(r => new Date(r.releaseDate) >= new Date(today))
      .sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime());

    return new Response(
      JSON.stringify({ releases: futureReleases, source: 'fallback' }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("TCG drops error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
