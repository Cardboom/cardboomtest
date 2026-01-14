import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();
    
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "Image URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Processing image for background removal:", imageUrl);

    // Use Gemini flash image model for editing
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
            content: [
              {
                type: "text",
                text: "Remove the background from this image. Keep only the trading card with clean crisp edges. Replace the background with pure transparency. The card should appear to float with no background at all."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.log("Rate limited, returning original image");
        return new Response(
          JSON.stringify({ 
            processedImageUrl: imageUrl,
            originalUsed: true,
            error: "Rate limit exceeded"
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        console.log("Credits required, returning original image");
        return new Response(
          JSON.stringify({ 
            processedImageUrl: imageUrl,
            originalUsed: true,
            error: "AI credits required"
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      // Return original image on any error instead of failing
      return new Response(
        JSON.stringify({ 
          processedImageUrl: imageUrl,
          originalUsed: true,
          error: `AI error: ${response.status}`
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("AI response structure:", JSON.stringify(Object.keys(data)));

    // Extract the processed image from response - check multiple locations
    let processedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    // Alternative locations the image might be
    if (!processedImageUrl) {
      processedImageUrl = data.choices?.[0]?.message?.content?.[0]?.image_url?.url;
    }
    if (!processedImageUrl && Array.isArray(data.choices?.[0]?.message?.content)) {
      const imageContent = data.choices[0].message.content.find((c: any) => c.type === 'image_url' || c.image_url);
      processedImageUrl = imageContent?.image_url?.url;
    }

    if (!processedImageUrl) {
      console.log("No processed image in response, structure:", JSON.stringify(data.choices?.[0]?.message));
      // Return original image when AI doesn't return an image
      return new Response(
        JSON.stringify({ 
          processedImageUrl: imageUrl,
          originalUsed: true,
          message: "AI did not return processed image"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Successfully processed image");
    return new Response(
      JSON.stringify({ 
        processedImageUrl,
        originalUsed: false,
        message: "Background removed successfully"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing image:", error);
    // Return original image on error instead of failing
    const { imageUrl } = await req.json().catch(() => ({ imageUrl: null }));
    return new Response(
      JSON.stringify({ 
        processedImageUrl: imageUrl || null,
        originalUsed: true,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
