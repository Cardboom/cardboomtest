import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Tightened CORS - only allows cardboom.com and Lovable preview URLs
const corsHeaders = getCorsHeaders();

interface ChatRequest {
  message: string;
  context?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verify admin access
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { message, context }: ChatRequest = await req.json();

    // Get current market stats for context
    const { data: marketStats } = await supabase
      .from("market_items")
      .select("id, name, current_price, change_7d, category")
      .limit(100);

    const { data: recentListings } = await supabase
      .from("listings")
      .select("id, title, price, category, status")
      .order("created_at", { ascending: false })
      .limit(20);

    const systemPrompt = `You are an AI assistant for CardBoom, a TCG marketplace platform. You help admins manage the platform quickly.

You have access to the following data:
- ${marketStats?.length || 0} market items in the index
- ${recentListings?.length || 0} recent listings

Common admin tasks you can help with:
1. **Price Adjustments**: Suggest SQL queries to update market_items prices
2. **Trending Cards**: Identify which cards to mark as trending
3. **Data Analysis**: Analyze market trends and suggest actions
4. **Quick Edits**: Generate ready-to-use SQL for bulk updates

When suggesting price changes or updates, always:
- Provide the exact SQL query wrapped in \`\`\`sql code blocks
- Explain what the query does
- Warn about any risks

Sample market data:
${JSON.stringify(marketStats?.slice(0, 10) || [], null, 2)}

Current context: ${context || 'General admin assistance'}`;

    // Call OpenAI
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error("OpenAI error:", error);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const completion = await openaiResponse.json();
    const reply = completion.choices?.[0]?.message?.content || "No response generated";

    // Log the interaction
    await supabase.from("admin_audit_log").insert({
      admin_id: user.id,
      action: "ai_chat",
      target_type: "admin_assistant",
      details: { message: message.substring(0, 200), response_length: reply.length },
    });

    return new Response(
      JSON.stringify({ reply, tokens: completion.usage }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in admin-ai-chat:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
