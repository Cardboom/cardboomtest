import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const X_BEARER_TOKEN = Deno.env.get('X_BEARER_TOKEN');
    
    if (!X_BEARER_TOKEN) {
      console.error('X_BEARER_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'X API not configured', posts: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Search for tweets mentioning @cardboomcom
    const searchQuery = encodeURIComponent('@cardboomcom -is:retweet');
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${searchQuery}&max_results=20&tweet.fields=created_at,public_metrics,attachments&expansions=author_id,attachments.media_keys&user.fields=name,username,profile_image_url&media.fields=url,preview_image_url,type`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${X_BEARER_TOKEN}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('X API error:', response.status, errorText);
      
      // Return empty posts on error so UI can fallback to mock data
      return new Response(
        JSON.stringify({ error: `X API error: ${response.status}`, posts: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Map users by ID for easy lookup
    const users = new Map<string, any>();
    if (data.includes?.users) {
      for (const user of data.includes.users) {
        users.set(user.id, user);
      }
    }

    // Map media by key for easy lookup
    const media = new Map<string, any>();
    if (data.includes?.media) {
      for (const m of data.includes.media) {
        media.set(m.media_key, m);
      }
    }

    // Transform tweets to our format
    const posts = (data.data || []).map((tweet: any) => {
      const author = users.get(tweet.author_id);
      const tweetMedia = tweet.attachments?.media_keys?.map((key: string) => media.get(key)).filter(Boolean) || [];
      const imageMedia = tweetMedia.find((m: any) => m.type === 'photo');

      // Calculate relative timestamp
      const createdAt = new Date(tweet.created_at);
      const now = new Date();
      const diffMs = now.getTime() - createdAt.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      
      let timestamp = '';
      if (diffDays > 0) {
        timestamp = `${diffDays}d`;
      } else if (diffHours > 0) {
        timestamp = `${diffHours}h`;
      } else {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        timestamp = `${diffMinutes}m`;
      }

      return {
        id: tweet.id,
        author: {
          name: author?.name || 'Unknown',
          handle: `@${author?.username || 'unknown'}`,
          avatar: author?.profile_image_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${tweet.id}`,
        },
        content: tweet.text,
        image: imageMedia?.url || imageMedia?.preview_image_url || null,
        likes: tweet.public_metrics?.like_count || 0,
        retweets: tweet.public_metrics?.retweet_count || 0,
        comments: tweet.public_metrics?.reply_count || 0,
        timestamp,
      };
    });

    return new Response(
      JSON.stringify({ posts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error fetching X posts:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage, posts: [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
