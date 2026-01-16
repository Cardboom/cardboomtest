import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Flame, Heart, MessageCircle, Repeat2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TweetRewardClaim } from '@/components/TweetRewardClaim';

interface XPost {
  id: string;
  author: { name: string; handle: string; avatar: string };
  content: string;
  image?: string | null;
  likes: number;
  retweets: number;
  comments: number;
  timestamp: string;
}

export const CardsGoingBoomPanel = () => {
  const [posts, setPosts] = useState<XPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch from cached database table (populated by background job)
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const { data, error } = await supabase
          .from('cached_social_posts')
          .select('*')
          .eq('is_active', true)
          .order('posted_at', { ascending: false })
          .limit(12);

        if (error) throw error;
        
        if (data && data.length > 0) {
          setPosts(data.map(p => ({
            id: p.id,
            author: {
              name: p.author_name,
              handle: p.author_handle || '',
              avatar: p.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.author_name}`,
            },
            content: p.content,
            image: null,
            likes: p.engagement_count || 0,
            retweets: Math.floor((p.engagement_count || 0) * 0.3),
            comments: Math.floor((p.engagement_count || 0) * 0.15),
            timestamp: p.posted_at ? getRelativeTime(new Date(p.posted_at)) : '1h',
          })));
        }
        // If no posts returned, keep mock data
      } catch (err) {
        console.error('Failed to fetch social posts:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // Helper to format relative time
  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  };

  // Create three columns with different posts
  const columns = [
    posts.filter((_, i) => i % 3 === 0),
    posts.filter((_, i) => i % 3 === 1),
    posts.filter((_, i) => i % 3 === 2),
  ];

  return (
    <section className="py-8 sm:py-12 border-t border-border/20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                Cards Going Boom
              </h2>
              <p className="text-sm text-muted-foreground">What collectors are saying</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <TweetRewardClaim />
            <a 
              href="https://x.com/cardboomcom" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <span className="hidden sm:inline">Follow us on</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Masonry-style scrolling posts */}
        <div 
          className="relative overflow-hidden rounded-2xl bg-card/30 border border-border/50"
          style={{ height: '500px' }}
        >
          {/* Gradient overlays for smooth fade */}
          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />

          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center mb-4">
                <Flame className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Be the first to go boom!</h3>
              <p className="text-muted-foreground max-w-md mb-4">
                Tweet about CardBoom with <span className="font-mono text-primary">@cardboomcom</span> and your post will appear here
              </p>
              <a
                href="https://x.com/intent/tweet?text=Just%20discovered%20%40cardboomcom%20-%20the%20future%20of%20TCG%20trading!%20%F0%9F%94%A5"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Tweet about CardBoom
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 h-full overflow-hidden">
              {columns.map((columnPosts, colIndex) => (
                <div 
                  key={colIndex}
                  className="flex flex-col gap-4"
                  style={{
                    animation: `scrollColumn${colIndex % 2 === 0 ? 'Up' : 'Down'} ${20 + colIndex * 5}s linear infinite`,
                  }}
                >
                  {/* Duplicate posts for seamless loop */}
                  {[...columnPosts, ...columnPosts].map((post, idx) => (
                    <PostCard key={`${post.id}-${idx}`} post={post} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes scrollColumnUp {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @keyframes scrollColumnDown {
          0% { transform: translateY(-50%); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </section>
  );
};

interface PostCardProps {
  post: XPost;
}

const PostCard = ({ post }: PostCardProps) => (
  <div className="bg-card border border-border/50 rounded-xl p-4 hover:border-primary/30 transition-all cursor-pointer group">
    {/* Author */}
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-2">
        <img 
          src={post.author.avatar} 
          alt={post.author.name}
          width={40}
          height={40}
          className="w-10 h-10 rounded-full bg-muted"
        />
        <div>
          <div className="font-semibold text-sm text-foreground">{post.author.name}</div>
          <div className="text-xs text-muted-foreground">{post.author.handle} · {post.timestamp}</div>
        </div>
      </div>
      <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    </div>

    {/* Content */}
    <p className="text-sm text-foreground mb-3 leading-relaxed">{post.content}</p>

    {/* Image if present */}
    {post.image && (
      <div className="rounded-lg overflow-hidden mb-3">
        <img 
          src={post.image} 
          alt="Post image"
          width={400}
          height={128}
          className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
    )}

    {/* Engagement stats */}
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1 hover:text-blue-500 transition-colors">
        <MessageCircle className="w-3.5 h-3.5" />
        {post.comments}
      </span>
      <span className="flex items-center gap-1 hover:text-green-500 transition-colors">
        <Repeat2 className="w-3.5 h-3.5" />
        {post.retweets}
      </span>
      <span className="flex items-center gap-1 hover:text-red-500 transition-colors">
        <Heart className="w-3.5 h-3.5" />
        {post.likes}
      </span>
    </div>
  </div>
);

export default CardsGoingBoomPanel;
