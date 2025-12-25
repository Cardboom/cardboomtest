import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Film, Play, Eye, Heart, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ReelPreview {
  id: string;
  title: string;
  thumbnail_url: string | null;
  video_url: string;
  view_count: number;
  like_count: number;
  user: {
    display_name: string;
    avatar_url: string | null;
  } | null;
}

export const ReelsPreviewSection = () => {
  const { t } = useLanguage();
  const [reels, setReels] = useState<ReelPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredReel, setHoveredReel] = useState<string | null>(null);

  useEffect(() => {
    fetchReels();
  }, []);

  const fetchReels = async () => {
    try {
      const { data, error } = await supabase
        .from('card_reels')
        .select(`
          id,
          title,
          thumbnail_url,
          video_url,
          view_count,
          like_count,
          user_id
        `)
        .eq('is_active', true)
        .order('view_count', { ascending: false })
        .limit(6);

      if (error) throw error;

      // Fetch user profiles
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(r => r.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const reelsWithUsers = data.map(reel => ({
          ...reel,
          user: profileMap.get(reel.user_id) || null
        }));

        setReels(reelsWithUsers);
      }
    } catch (error) {
      console.error('Error fetching reels:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <section className="py-12 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-[9/16] bg-muted rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Show placeholder if no reels
  if (reels.length === 0) {
    return (
      <section className="py-12 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 via-red-500 to-orange-500 flex items-center justify-center">
                <Film className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                  {t.nav.reels}
                </h2>
                <p className="text-muted-foreground text-sm">{t.reels?.beFirstToPost || 'Watch card opening videos'}</p>
              </div>
            </div>
            <Link to="/reels">
              <Button variant="outline" className="gap-2">
                {t.reels?.createReel || 'Create Reel'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          
          <div className="flex flex-col items-center justify-center py-16 text-center bg-gradient-to-br from-muted/50 to-muted/20 rounded-2xl border border-border/50">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500/20 via-red-500/20 to-orange-500/20 flex items-center justify-center mb-4">
              <Film className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-display text-xl font-bold mb-2">{t.reels?.noReels || 'No reels yet'}</h3>
            <p className="text-muted-foreground mb-4">{t.reels?.beFirstToPost || 'Be the first to post a reel!'}</p>
            <Link to="/reels">
              <Button className="gap-2 bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 hover:from-pink-600 hover:via-red-600 hover:to-orange-600">
                <Film className="w-4 h-4" />
                {t.reels?.createReel || 'Create Reel'}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 border-t border-border/50 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <motion.div 
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 via-red-500 to-orange-500 flex items-center justify-center"
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Film className="w-5 h-5 text-white" />
            </motion.div>
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                {t.nav.reels}
              </h2>
              <p className="text-muted-foreground text-sm">Watch card opening videos</p>
            </div>
          </div>
          <Link to="/reels">
            <Button variant="outline" className="gap-2 hidden sm:flex">
              View All
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {reels.map((reel, index) => (
            <motion.div
              key={reel.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                to="/reels"
                className="block relative aspect-[9/16] rounded-xl overflow-hidden group cursor-pointer"
                onMouseEnter={() => setHoveredReel(reel.id)}
                onMouseLeave={() => setHoveredReel(null)}
              >
                {/* Thumbnail or gradient placeholder */}
                {reel.thumbnail_url ? (
                  <img
                    src={reel.thumbnail_url}
                    alt={reel.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/30 via-purple-500/30 to-pink-500/30 flex items-center justify-center">
                    <Film className="w-8 h-8 text-white/50" />
                  </div>
                )}

                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Play button on hover */}
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: hoveredReel === reel.id ? 1 : 0 }}
                >
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                    <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                  </div>
                </motion.div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white font-medium text-sm line-clamp-2 mb-2">
                    {reel.title}
                  </p>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-3 text-white/70 text-xs">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {(reel.view_count || 0).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {(reel.like_count || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* User avatar */}
                {reel.user && (
                  <div className="absolute top-3 left-3">
                    {reel.user.avatar_url ? (
                      <img
                        src={reel.user.avatar_url}
                        alt={reel.user.display_name}
                        className="w-8 h-8 rounded-full border-2 border-white/50 object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center border-2 border-white/50">
                        <span className="text-white text-xs font-bold">
                          {reel.user.display_name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Mobile view all button */}
        <div className="flex justify-center mt-6 sm:hidden">
          <Link to="/reels">
            <Button variant="outline" className="gap-2">
              View All Reels
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
