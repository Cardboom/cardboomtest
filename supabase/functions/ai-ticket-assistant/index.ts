import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Tightened CORS - only allows cardboom.com and Lovable preview URLs
const corsHeaders = getCorsHeaders();

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticketId, subject, message, category, existingResponse } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const systemPrompt = `You are an AI assistant for CardBoom, a TCG card and collectibles marketplace. 
Your role is to help admin staff handle support tickets efficiently.

Analyze the support ticket and provide:
1. Suggested priority (low, medium, high, urgent)
2. Suggested category (payment, shipping, dispute, account, listing, technical, general)
3. A professional, empathetic draft response addressing the user's concern
4. Key issues identified in the ticket

Guidelines:
- Be professional and empathetic
- Reference CardBoom policies when relevant
- If it's a dispute or payment issue, prioritize higher
- For technical issues, ask for specifics if unclear
- Never make promises about refunds without admin review

Respond in JSON format:
{
  "suggestedPriority": "low|medium|high|urgent",
  "suggestedCategory": "payment|shipping|dispute|account|listing|technical|general",
  "draftResponse": "Your professional response here...",
  "keyIssues": ["issue1", "issue2"],
  "summary": "Brief one-line summary",
  "sentiment": "positive|neutral|negative|angry"
}`;

    const userPrompt = `Support Ticket:
Subject: ${subject}
Current Category: ${category || 'Not set'}
Message: ${message}
${existingResponse ? `\nPrevious Admin Response: ${existingResponse}` : ''}

Analyze this ticket and provide your recommendations.`;

    console.log('Calling OpenAI for ticket analysis...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response
    let analysis;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      analysis = {
        suggestedPriority: 'medium',
        suggestedCategory: category || 'general',
        draftResponse: content,
        keyIssues: [],
        summary: 'AI analysis completed',
        sentiment: 'neutral'
      };
    }

    // If ticketId provided, update the ticket in database
    if (ticketId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase
        .from('support_tickets')
        .update({
          ai_analysis: analysis,
          ai_suggested_priority: analysis.suggestedPriority,
          ai_suggested_category: analysis.suggestedCategory,
          ai_draft_response: analysis.draftResponse,
        })
        .eq('id', ticketId);

      console.log('Updated ticket with AI analysis:', ticketId);
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-ticket-assistant:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
