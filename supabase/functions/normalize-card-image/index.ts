import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// deno-lint-ignore no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

interface NormalizeRequest {
  imageUrl: string;
  tableType: 'market_items' | 'catalog_cards' | 'listings' | 'card_instances' | 'vault_items' | 'swap_listings' | 'boom_pack_cards' | 'grading_orders';
  recordId: string;
  imageField?: 'front' | 'back'; // For grading_orders
}

interface DetectionResult {
  imageType: 'SLAB' | 'RAW';
  confidence: number;
  cropBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  needsPerspectiveCorrection: boolean;
}

/**
 * Detect if image contains a graded slab or raw card using AI vision
 */
async function detectImageType(imageUrl: string): Promise<DetectionResult> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  const systemPrompt = `You are an expert at analyzing trading card images. Your task is to:
1. Determine if the image contains a GRADED SLAB (card encased in rigid plastic holder with a label from PSA, BGS, CGC, etc.) or a RAW card (ungraded, loose card)
2. Identify the boundaries of the subject (slab outer edges or card edges)

SLAB indicators:
- Rigid plastic rectangular casing
- Top label region with printed grade, cert number, and grading company logo
- Usually has sharp rectangular edges with rounded corners

RAW card indicators:
- No plastic encasement
- Card is loose/unslabbed
- Standard card proportions (~2.5" x 3.5" or similar)

Respond with a JSON object ONLY (no markdown, no explanation):
{
  "imageType": "SLAB" or "RAW",
  "confidence": 0.0-1.0,
  "subjectDetected": true/false,
  "needsPerspectiveCorrection": true/false,
  "estimatedBounds": {
    "topLeftPercent": { "x": 0-100, "y": 0-100 },
    "topRightPercent": { "x": 0-100, "y": 0-100 },
    "bottomLeftPercent": { "x": 0-100, "y": 0-100 },
    "bottomRightPercent": { "x": 0-100, "y": 0-100 }
  }
}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: [
              { type: "text", text: "Analyze this trading card image:" },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in response:", content);
      throw new Error("Failed to parse AI response");
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      imageType: parsed.imageType === 'SLAB' ? 'SLAB' : 'RAW',
      confidence: parsed.confidence || 0.5,
      needsPerspectiveCorrection: parsed.needsPerspectiveCorrection || false,
    };
  } catch (error) {
    console.error("Detection error:", error);
    // Default to RAW with low confidence on error
    return {
      imageType: 'RAW',
      confidence: 0.3,
      needsPerspectiveCorrection: false,
    };
  }
}

/**
 * Generate normalized/cropped image using AI image editing
 */
async function generateNormalizedImage(
  imageUrl: string, 
  imageType: 'SLAB' | 'RAW'
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  const cropPrompt = imageType === 'SLAB'
    ? "Crop this image to show ONLY the graded slab. Include the ENTIRE slab from edge to edge, ensuring the top label with grade and cert number is fully visible. Remove all background. Apply perspective correction if the slab is tilted. Output ONLY the cropped slab with no padding or background."
    : "Crop this image to show ONLY the trading card. Remove all background. Crop edge-to-edge to the card boundaries. Apply perspective correction if the card is tilted. Maintain a 5:7 aspect ratio. Output ONLY the cropped card with no padding or background.";

  try {
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
              { type: "text", text: cropPrompt },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Image generation error:", response.status, errorText);
      throw new Error(`Image generation failed: ${response.status}`);
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      throw new Error("No image in response");
    }

    return imageData; // Returns base64 data URL
  } catch (error) {
    console.error("Image generation error:", error);
    throw error;
  }
}

/**
 * Upload base64 image to Supabase Storage
 */
async function uploadToStorage(
  supabase: AnySupabaseClient,
  base64DataUrl: string,
  recordId: string,
  tableType: string
): Promise<string> {
  // Extract base64 data
  const base64Match = base64DataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!base64Match) {
    throw new Error("Invalid base64 data URL");
  }
  
  const [, format, base64Data] = base64Match;
  const fileExtension = format === 'jpeg' ? 'jpg' : format;
  const fileName = `normalized/${tableType}/${recordId}.${fileExtension}`;
  
  // Convert base64 to Uint8Array
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Upload to card-images bucket
  const { error: uploadError } = await supabase.storage
    .from('card-images')
    .upload(fileName, bytes, {
      contentType: `image/${format}`,
      upsert: true,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    throw new Error(`Failed to upload: ${uploadError.message}`);
  }

  // Get public URL
  const { data: publicUrl } = supabase.storage
    .from('card-images')
    .getPublicUrl(fileName);

  return publicUrl.publicUrl;
}

/**
 * Update the database record with normalized image data
 */
async function updateRecord(
  supabase: AnySupabaseClient,
  tableType: string,
  recordId: string,
  normalizedImageUrl: string,
  imageType: 'SLAB' | 'RAW',
  imageField?: 'front' | 'back'
) {
  if (tableType === 'grading_orders' && imageField) {
    const prefix = imageField === 'front' ? 'front_' : 'back_';
    const { error } = await supabase
      .from(tableType)
      .update({
        [`${prefix}normalized_image_url`]: normalizedImageUrl,
        [`${prefix}normalized_image_type`]: imageType,
        [`${prefix}normalization_status`]: 'DONE',
        [`${prefix}normalization_error`]: null,
      })
      .eq('id', recordId);
    
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from(tableType)
      .update({
        normalized_image_url: normalizedImageUrl,
        normalized_image_type: imageType,
        normalization_status: 'DONE',
        normalization_error: null,
      })
      .eq('id', recordId);
    
    if (error) throw error;
  }
}

/**
 * Mark record as failed
 */
async function markFailed(
  supabase: AnySupabaseClient,
  tableType: string,
  recordId: string,
  errorMessage: string,
  imageField?: 'front' | 'back'
) {
  if (tableType === 'grading_orders' && imageField) {
    const prefix = imageField === 'front' ? 'front_' : 'back_';
    await supabase
      .from(tableType)
      .update({
        [`${prefix}normalization_status`]: 'FAILED',
        [`${prefix}normalization_error`]: errorMessage,
      })
      .eq('id', recordId);
  } else {
    await supabase
      .from(tableType)
      .update({
        normalization_status: 'FAILED',
        normalization_error: errorMessage,
      })
      .eq('id', recordId);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { imageUrl, tableType, recordId, imageField }: NormalizeRequest = await req.json();

    if (!imageUrl || !tableType || !recordId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: imageUrl, tableType, recordId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${tableType}/${recordId}:`, imageUrl.substring(0, 50));

    // Step 1: Detect image type (SLAB vs RAW)
    const detection = await detectImageType(imageUrl);
    console.log(`Detected: ${detection.imageType} (confidence: ${detection.confidence})`);

    // Step 2: Generate normalized/cropped image
    let normalizedImageUrl: string;
    try {
      const base64Image = await generateNormalizedImage(imageUrl, detection.imageType);
      
      // Step 3: Upload to storage
      normalizedImageUrl = await uploadToStorage(supabase, base64Image, recordId, tableType);
      console.log(`Uploaded normalized image:`, normalizedImageUrl);
    } catch (genError) {
      // If generation fails, fall back to original image
      console.error("Generation failed, using original:", genError);
      normalizedImageUrl = imageUrl;
      await markFailed(supabase, tableType, recordId, String(genError), imageField);
      
      return new Response(
        JSON.stringify({
          success: false,
          normalizedImageUrl: imageUrl,
          imageType: detection.imageType,
          error: "Generation failed, using original image",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 4: Update database record
    await updateRecord(supabase, tableType, recordId, normalizedImageUrl, detection.imageType, imageField);

    return new Response(
      JSON.stringify({
        success: true,
        normalizedImageUrl,
        imageType: detection.imageType,
        confidence: detection.confidence,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Normalization error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});