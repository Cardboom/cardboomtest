import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// TCG-style organic comments that feel authentic
const TCG_COMMENTS = [
  // Pack opening reactions
  "NO WAY you pulled that!! 🔥",
  "That centering is PERFECT",
  "The holo on this is insane",
  "PSA 10 for sure 👀",
  "Sheesh that's a grail right there",
  "Adding this to my want list immediately",
  "The vintage vibes are unmatched",
  "Clean corners on that one",
  "This set is so underrated fr",
  "Collection goals right here 🙌",
  
  // Market/value comments
  "Prices on these are going crazy rn",
  "Picked one up last month, great investment",
  "This aged like fine wine",
  "Remember when these were $20?? 😭",
  "Hodl forever 💎",
  "Market is sleeping on this set",
  "Just copped one yesterday, hyped!",
  
  // Collector appreciation
  "Your collection is actually insane",
  "Goals 🎯",
  "Need this for my binder",
  "Been hunting this for months",
  "The nostalgia hit different",
  "Childhood memories right here",
  "This brings back so many memories",
  "One of my favorites from this era",
  
  // Questions/engagement
  "What grade you thinking?",
  "Where'd you find this??",
  "Raw or slabbed?",
  "Is this for sale? 👀",
  "PSA or CGC?",
  "That a reprint or OG?",
  
  // Short reactions
  "Fire 🔥",
  "W",
  "Massive W",
  "Heat 🥵",
  "Legendary",
  "Beautiful",
  "Clean 🧼",
  "Gorgeous",
  "Need 🙏",
  "Wow",
  "Insane pull",
  "Banger",
];

// Get a random subset of comments
function getRandomComments(count: number): string[] {
  const shuffled = [...TCG_COMMENTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Generate organic timing delays (in ms)
function getRandomDelay(): number {
  // Between 30 seconds and 2 hours
  return Math.floor(Math.random() * (7200000 - 30000) + 30000);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action, reelId } = await req.json();

    // Get all fan accounts
    const { data: fanAccounts, error: fanError } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("is_fan_account", true);

    if (fanError || !fanAccounts?.length) {
      return new Response(
        JSON.stringify({ error: "No fan accounts available" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (action === "simulate_new_video") {
      // Simulate organic engagement on a specific new video
      if (!reelId) {
        return new Response(
          JSON.stringify({ error: "reelId required for simulate_new_video" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Random number of engagements (2-5 initial interactions)
      const engagementCount = Math.floor(Math.random() * 4) + 2;
      const selectedAccounts = fanAccounts.sort(() => Math.random() - 0.5).slice(0, engagementCount);
      const comments = getRandomComments(Math.ceil(engagementCount / 2));

      const results = { likes: 0, comments: 0, views: 0 };

      for (let i = 0; i < selectedAccounts.length; i++) {
        const account = selectedAccounts[i];
        
        // Add a view
        await supabase.from("reel_watch_events").insert({
          reel_id: reelId,
          user_id: account.id,
          watch_duration_seconds: Math.floor(Math.random() * 30) + 5,
          completed: Math.random() > 0.3,
        });
        results.views++;

        // 70% chance to like
        if (Math.random() > 0.3) {
          const { error: likeError } = await supabase.from("reel_likes").insert({
            reel_id: reelId,
            user_id: account.id,
          });
          if (!likeError) results.likes++;
        }

        // Add comment if available
        if (comments[i]) {
          await supabase.from("reel_comments").insert({
            reel_id: reelId,
            user_id: account.id,
            content: comments[i],
            is_bot_generated: true,
          });
          results.comments++;
        }
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "batch_engagement") {
      // Simulate engagement across all recent reels
      const { data: recentReels, error: reelError } = await supabase
        .from("card_reels")
        .select("id, user_id, view_count, like_count, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(20);

      if (reelError || !recentReels?.length) {
        return new Response(
          JSON.stringify({ error: "No reels to engage with" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      let totalEngagements = 0;

      for (const reel of recentReels) {
        // Don't self-engage (fan account on their own reel too much)
        const eligibleAccounts = fanAccounts.filter(a => a.id !== reel.user_id);
        if (eligibleAccounts.length === 0) continue;

        // 40% chance to engage with each reel
        if (Math.random() > 0.4) continue;

        const account = eligibleAccounts[Math.floor(Math.random() * eligibleAccounts.length)];
        
        // Check if already engaged
        const { data: existingLike } = await supabase
          .from("reel_likes")
          .select("id")
          .eq("reel_id", reel.id)
          .eq("user_id", account.id)
          .maybeSingle();

        if (!existingLike) {
          // Add like
          const { error: likeError } = await supabase.from("reel_likes").insert({
            reel_id: reel.id,
            user_id: account.id,
          });
          if (!likeError) totalEngagements++;

          // 30% chance to also comment
          if (Math.random() < 0.3) {
            const comment = TCG_COMMENTS[Math.floor(Math.random() * TCG_COMMENTS.length)];
            await supabase.from("reel_comments").insert({
              reel_id: reel.id,
              user_id: account.id,
              content: comment,
              is_bot_generated: true,
            });
            totalEngagements++;
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, engagements: totalEngagements }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "cross_engagement") {
      // Fan accounts engage with each other's content
      const { data: fanReels } = await supabase
        .from("card_reels")
        .select("id, user_id")
        .eq("is_active", true)
        .in("user_id", fanAccounts.map(a => a.id))
        .order("created_at", { ascending: false })
        .limit(30);

      if (!fanReels?.length) {
        return new Response(
          JSON.stringify({ message: "No fan reels to cross-engage" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let crossEngagements = 0;

      for (const reel of fanReels) {
        // Other fan accounts engage with this reel
        const otherFans = fanAccounts.filter(a => a.id !== reel.user_id);
        
        for (const fan of otherFans) {
          // 25% chance of engagement
          if (Math.random() > 0.25) continue;

          // Check existing like
          const { data: existingLike } = await supabase
            .from("reel_likes")
            .select("id")
            .eq("reel_id", reel.id)
            .eq("user_id", fan.id)
            .maybeSingle();

          if (!existingLike) {
            const { error: likeError } = await supabase.from("reel_likes").insert({
              reel_id: reel.id,
              user_id: fan.id,
            });
            if (!likeError) crossEngagements++;

            // 20% chance to comment
            if (Math.random() < 0.2) {
              const comment = TCG_COMMENTS[Math.floor(Math.random() * TCG_COMMENTS.length)];
              await supabase.from("reel_comments").insert({
                reel_id: reel.id,
                user_id: fan.id,
                content: comment,
                is_bot_generated: true,
              });
              crossEngagements++;
            }
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, crossEngagements }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: simulate_new_video, batch_engagement, or cross_engagement" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
