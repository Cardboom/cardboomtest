import { useState, useEffect } from 'react';
import { Eye, Heart, Search, MessageCircle, TrendingUp, Users, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CardSocialProofProps {
  itemId: string;
  views?: number;
  watchlistCount?: number;
  searchCount?: number;
  mentionCount?: number;
  recentBuyers?: number;
  compact?: boolean;
  className?: string;
}

export const CardSocialProof = ({
  itemId,
  views = 0,
  watchlistCount = 0,
  searchCount = 0,
  mentionCount = 0,
  recentBuyers = 0,
  compact = false,
  className
}: CardSocialProofProps) => {
  const [displayViews, setDisplayViews] = useState(views);
  const [isHot, setIsHot] = useState(false);

  // Calculate social proof score (0-100)
  const socialScore = Math.min(100, Math.round(
    (views / 10) + 
    (watchlistCount * 5) + 
    (searchCount * 2) + 
    (mentionCount * 3) +
    (recentBuyers * 10)
  ));

  // Determine heat level
  const heatLevel = socialScore >= 80 ? 'hot' : socialScore >= 50 ? 'warm' : 'normal';

  // Simulate live view count updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setDisplayViews(prev => prev + Math.floor(Math.random() * 3));
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Check if item is "hot"
  useEffect(() => {
    setIsHot(watchlistCount > 50 || views > 500 || recentBuyers > 5);
  }, [watchlistCount, views, recentBuyers]);

  if (compact) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "flex items-center gap-2 text-xs",
          className
        )}
      >
        {isHot && (
          <span className="flex items-center gap-1 text-orange-500 font-semibold animate-pulse">
            <Flame className="w-3 h-3" />
            Hot
          </span>
        )}
        <span className="flex items-center gap-1 text-muted-foreground">
          <Eye className="w-3 h-3" />
          {displayViews.toLocaleString()}
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Heart className="w-3 h-3" />
          {watchlistCount}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4",
        heatLevel === 'hot' && "border-orange-500/50 bg-orange-500/5",
        heatLevel === 'warm' && "border-yellow-500/30 bg-yellow-500/5",
        className
      )}
    >
      {/* Header with Score */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            heatLevel === 'hot' ? "bg-orange-500/20" : 
            heatLevel === 'warm' ? "bg-yellow-500/20" : "bg-primary/20"
          )}>
            {heatLevel === 'hot' ? (
              <Flame className="w-4 h-4 text-orange-500" />
            ) : (
              <TrendingUp className={cn(
                "w-4 h-4",
                heatLevel === 'warm' ? "text-yellow-500" : "text-primary"
              )} />
            )}
          </div>
          <div>
            <h4 className="font-semibold text-sm text-foreground">Social Proof Score</h4>
            <p className="text-xs text-muted-foreground">Real-time interest</p>
          </div>
        </div>
        <div className={cn(
          "text-2xl font-bold",
          heatLevel === 'hot' ? "text-orange-500" : 
          heatLevel === 'warm' ? "text-yellow-500" : "text-primary"
        )}>
          {socialScore}
        </div>
      </div>

      {/* Live Watching Banner */}
      <AnimatePresence>
        {displayViews > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              "rounded-lg px-3 py-2 mb-3 text-center",
              heatLevel === 'hot' ? "bg-orange-500/10 text-orange-600 dark:text-orange-400" :
              heatLevel === 'warm' ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" :
              "bg-primary/10 text-primary"
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={cn(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  heatLevel === 'hot' ? "bg-orange-400" : 
                  heatLevel === 'warm' ? "bg-yellow-400" : "bg-primary"
                )} />
                <span className={cn(
                  "relative inline-flex rounded-full h-2 w-2",
                  heatLevel === 'hot' ? "bg-orange-500" : 
                  heatLevel === 'warm' ? "bg-yellow-500" : "bg-primary"
                )} />
              </span>
              <span className="font-semibold text-sm">
                {displayViews.toLocaleString()} people viewing this card
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Views (24h)</p>
            <p className="font-semibold text-sm">{displayViews.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
          <Heart className="w-4 h-4 text-rose-500" />
          <div>
            <p className="text-xs text-muted-foreground">Watchlists</p>
            <p className="font-semibold text-sm">{watchlistCount.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
          <Search className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Searches</p>
            <p className="font-semibold text-sm">{searchCount.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
          <Users className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Recent Buyers</p>
            <p className="font-semibold text-sm">{recentBuyers}</p>
          </div>
        </div>
      </div>

      {/* FOMO Message */}
      {recentBuyers > 0 && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs text-muted-foreground mt-3 text-center"
        >
          <span className="text-gain font-medium">{recentBuyers} collectors</span> bought this in the last 24 hours
        </motion.p>
      )}
    </motion.div>
  );
};
