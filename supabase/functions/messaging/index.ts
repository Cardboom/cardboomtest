import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

// Tightened CORS - only allows cardboom.com and Lovable preview URLs
const corsHeaders = getCorsHeaders();

// Patterns to detect contact info sharing attempts
const BLOCKED_PATTERNS = [
  // Phone numbers (various formats)
  /\b(?:\+?90|0)?[\s.-]?5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/gi, // Turkish
  /\b\+?[\d\s.-]{10,15}\b/g, // General phone
  /\b(?:\+1|\+44|\+49|\+33|\+81|\+86|\+91)[\s.-]?\d{6,12}\b/gi, // International codes
  
  // Email patterns
  /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/gi,
  /\b[a-zA-Z0-9._%+-]+\s*[@＠]\s*[a-zA-Z0-9.-]+\s*[.．]\s*[a-zA-Z]{2,}\b/gi,
  /\b[a-zA-Z0-9._%+-]+\s*(?:at|AT)\s*[a-zA-Z0-9.-]+\s*(?:dot|DOT)\s*[a-zA-Z]{2,}\b/gi,
  
  // Social media handles and platforms
  /\b(?:instagram|insta|ig|twitter|x\.com|x\s+app|telegram|tg|whatsapp|wa|discord|snap|snapchat|tiktok|facebook|fb|messenger|linkedin|wechat|line|viber|signal|skype)[\s:@]*[a-zA-Z0-9._-]+\b/gi,
  /@[a-zA-Z0-9._]{3,30}\b/g,
  
  // Social media mentions without handle
  /\b(?:hit\s*me\s*(?:up|on)|dm\s*me|message\s*me\s*on|find\s*me\s*on|add\s*me\s*on|follow\s*me\s*on)\s*(?:instagram|insta|ig|twitter|x|telegram|tg|whatsapp|wa|discord|snap|snapchat|tiktok|facebook|fb)\b/gi,
  
  // URLs (except cardboom)
  /\b(?:https?:\/\/)?(?!.*cardboom)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?\b/gi,
  
  // Common evasion patterns - spelled out numbers
  /\b(?:five|zero|one|two|three|four|six|seven|eight|nine)\s+(?:five|zero|one|two|three|four|six|seven|eight|nine)\s+(?:five|zero|one|two|three|four|six|seven|eight|nine)/gi,
  /\b(?:beş|sıfır|bir|iki|üç|dört|altı|yedi|sekiz|dokuz)\s+/gi, // Turkish numbers
  
  // "Message me at", "Contact me on", etc.
  /\b(?:contact|message|reach|find|add|call|text|ring)\s*(?:me|us)\s*(?:at|on|via|through|@)\b/gi,
  /\b(?:my|send|here'?s?\s*my)\s*(?:number|phone|cell|mobile|email|mail|insta|ig|telegram|whatsapp|discord|snap|handle|username)\b/gi,
  
  // Numbers starting with specific patterns (phone number starts)
  /\b0[1-9]\d{8,10}\b/g, // Numbers starting with 0
  /\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/g, // XXX-XXX-XXXX format
];

// Words that suggest attempt to share contact but aren't definitive
const WARNING_PATTERNS = [
  /\b(?:outside|offline|direct|private|personal)\s*(?:contact|message|chat|talk)\b/gi,
  /\b(?:meet|meetup|buluşalım|görüşelim)\b/gi,
];

function filterMessage(content: string): { filtered: boolean; filteredContent: string; reason?: string } {
  let filteredContent = content;
  let wasFiltered = false;
  let reason: string | undefined;

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(content)) {
      wasFiltered = true;
      reason = 'Contact information detected';
      filteredContent = filteredContent.replace(pattern, '[removed]');
    }
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
  }

  return { filtered: wasFiltered, filteredContent, reason };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, conversationId, recipientId, listingId, content, messageId } = await req.json();

    switch (action) {
      case 'filter': {
        // Just filter content without sending
        if (!content) {
          return new Response(
            JSON.stringify({ error: 'Content required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { filtered, filteredContent, reason } = filterMessage(content);

        return new Response(
          JSON.stringify({ 
            success: true, 
            isFiltered: filtered,
            filteredContent,
            reason 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'send_message': {
        if (!conversationId || !content) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Filter the message
        const { filtered, filteredContent, reason } = filterMessage(content);

        // Insert the message
        const { data: message, error: msgError } = await supabaseClient
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            content: filtered ? filteredContent : content,
            is_filtered: filtered,
            filtered_content: filtered ? content : null,
          })
          .select()
          .single();

        if (msgError) {
          console.error('Error sending message:', msgError);
          return new Response(
            JSON.stringify({ error: 'Failed to send message' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update conversation last_message_at
        await supabaseClient
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversationId);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message, 
            wasFiltered: filtered,
            filterReason: reason 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'start_conversation': {
        if (!recipientId) {
          return new Response(
            JSON.stringify({ error: 'Recipient required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if conversation already exists
        const { data: existing } = await supabaseClient
          .from('conversations')
          .select('id')
          .or(`and(participant_1.eq.${user.id},participant_2.eq.${recipientId}),and(participant_1.eq.${recipientId},participant_2.eq.${user.id})`)
          .eq('listing_id', listingId || null)
          .maybeSingle();

        if (existing) {
          return new Response(
            JSON.stringify({ success: true, conversationId: existing.id, isNew: false }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create new conversation
        const { data: conversation, error: convError } = await supabaseClient
          .from('conversations')
          .insert({
            participant_1: user.id,
            participant_2: recipientId,
            listing_id: listingId || null,
          })
          .select()
          .single();

        if (convError) {
          console.error('Error creating conversation:', convError);
          return new Response(
            JSON.stringify({ error: 'Failed to create conversation' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, conversationId: conversation.id, isNew: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'mark_read': {
        if (!conversationId) {
          return new Response(
            JSON.stringify({ error: 'Conversation ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await supabaseClient
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', conversationId)
          .neq('sender_id', user.id);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Messaging error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});