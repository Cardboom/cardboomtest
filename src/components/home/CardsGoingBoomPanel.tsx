import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Flame, Heart, MessageCircle, Repeat2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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

// Fallback mock posts when API is unavailable
const mockPosts: XPost[] = [
  {
    id: '1',
    author: { name: 'PokéCollector', handle: '@pokecollector', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=poke' },
    content: 'Just pulled a Charizard VMAX from my latest booster box! 🔥 This card is absolutely stunning. The market is going crazy for these.',
    image: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=400&h=300&fit=crop',
    likes: 342,
    retweets: 89,
    comments: 45,
    timestamp: '2h',
  },
  {
    id: '2',
    author: { name: 'TCG Investor', handle: '@tcginvestor', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=investor' },
    content: 'One Piece TCG prices are mooning! 🚀 Luffy Gear 5 just hit $500. Get in while you can.',
    likes: 567,
    retweets: 234,
    comments: 78,
    timestamp: '4h',
  },
  {
    id: '3',
    author: { name: 'Slab King', handle: '@slabking', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=slab' },
    content: 'PSA 10 Black Lotus sold for $540,000 today. MTG vintage market is insane. 💎',
    likes: 1243,
    retweets: 456,
    comments: 123,
    timestamp: '6h',
  },
  {
    id: '4',
    author: { name: 'Card Flipper', handle: '@cardflip', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=flip' },
    content: 'Mail day! Just received my graded Pikachu Illustrator from @cardboomcom. The CBGI score matches perfectly with my expectations 🎯',
    image: 'https://images.unsplash.com/photo-1606503825008-909a67e63c3d?w=400&h=300&fit=crop',
    likes: 892,
    retweets: 167,
    comments: 92,
    timestamp: '8h',
  },
  {
    id: '5',
    author: { name: 'Sports Cards Daily', handle: '@sportscardsdaily', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sports' },
    content: 'Victor Wembanyama rookie cards are the hottest thing in sports cards right now. Prizm silvers selling for $2000+ 📈',
    likes: 678,
    retweets: 198,
    comments: 67,
    timestamp: '12h',
  },
  {
    id: '6',
    author: { name: 'Yu-Gi-Oh Master', handle: '@ygomasterduelist', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=yugi' },
    content: 'The 25th Anniversary Rarity Collection is completely sold out everywhere. My Blue-Eyes Ultimate Dragon is worth 3x what I paid! 🐉',
    likes: 445,
    retweets: 112,
    comments: 56,
    timestamp: '1d',
  },
];

export const CardsGoingBoomPanel = () => {
  const [posts, setPosts] = useState<XPost[]>(mockPosts);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('fetch-x-posts');
        
        if (error) {
          console.error('Error fetching X posts:', error);
          return;
        }
        
        if (data?.posts && data.posts.length > 0) {
          setPosts(data.posts);
        }
        // If no posts returned, keep mock data
      } catch (err) {
        console.error('Failed to fetch X posts:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
    
    // Refresh posts every 5 minutes
    const interval = setInterval(fetchPosts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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
