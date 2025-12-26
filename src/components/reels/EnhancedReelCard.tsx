import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Bookmark, Volume2, VolumeX, Play, Pause, MoreHorizontal, ShoppingBag, Music, Hash, ChevronDown, Search, UserPlus, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useReelActions, Reel } from '@/hooks/useReels';
import { useWatchEvents } from '@/hooks/useReelsFeed';
import { useLanguage } from '@/contexts/LanguageContext';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface EnhancedReelCardProps {
  reel: Reel & { 
    hashtags?: string[];
    sound_name?: string | null;
    share_count?: number;
    save_count?: number;
  };
  isActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenComments: () => void;
  onLikeChange?: (liked: boolean) => void;
  onSaveChange?: (saved: boolean) => void;
}

export function EnhancedReelCard({ 
  reel, 
  isActive, 
  isMuted,
  onToggleMute,
  onOpenComments, 
  onLikeChange, 
  onSaveChange 
}: EnhancedReelCardProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const watchTimeRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [isLiked, setIsLiked] = useState(reel.is_liked || false);
  const [isSaved, setIsSaved] = useState(reel.is_saved || false);
  const [likeCount, setLikeCount] = useState(reel.like_count);
  const [doubleTapAnimation, setDoubleTapAnimation] = useState(false);
  const [showMoreCaption, setShowMoreCaption] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const lastTapRef = useRef(0);
  
  const { likeReel, unlikeReel, saveReel, unsaveReel, incrementView, shareReel, followCreator, unfollowCreator } = useReelActions();
  const { trackEvent } = useWatchEvents();

  // Check if user is following the creator
  useEffect(() => {
    const checkFollowStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      
      if (user && reel.user_id !== user.id) {
        const { data } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', reel.user_id)
          .maybeSingle();
        setIsFollowing(!!data);
      }
    };
    checkFollowStatus();
  }, [reel.user_id]);

  // Track watch time milestones
  useEffect(() => {
    if (!isActive || !videoRef.current) return;

    const video = videoRef.current;
    let tracked3s = false;
    let tracked10s = false;

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      
      if (!tracked3s && currentTime >= 3) {
        trackEvent(reel.id, 'view_3s', 3);
        tracked3s = true;
      }
      
      if (!tracked10s && currentTime >= 10) {
        trackEvent(reel.id, 'view_10s', 10);
        tracked10s = true;
      }
    };

    const handleEnded = () => {
      trackEvent(reel.id, 'view_complete', Math.round(video.duration));
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [isActive, reel.id, trackEvent]);

  // Handle play/pause on active change
  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.muted = isMuted;
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
        
        // Track view start
        trackEvent(reel.id, 'impression');
        trackEvent(reel.id, 'view_start');
        incrementView(reel.id);
        startTimeRef.current = Date.now();
      } else {
        // Track watch duration when leaving
        if (startTimeRef.current) {
          watchTimeRef.current = Math.round((Date.now() - startTimeRef.current) / 1000);
        }
        
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setIsPlaying(false);
      }
    }
  }, [isActive, isMuted, reel.id, trackEvent, incrementView]);

  // Sync mute state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
      setShowPlayIcon(true);
      setTimeout(() => setShowPlayIcon(false), 500);
    }
  }, [isPlaying]);

  const handleLike = async () => {
    if (isLiked) {
      setIsLiked(false);
      setLikeCount(prev => prev - 1);
      await unlikeReel(reel.id);
      onLikeChange?.(false);
    } else {
      setIsLiked(true);
      setLikeCount(prev => prev + 1);
      await likeReel(reel.id);
      trackEvent(reel.id, 'like');
      onLikeChange?.(true);
    }
  };

  const handleDoubleTap = () => {
    if (!isLiked) {
      handleLike();
    }
    setDoubleTapAnimation(true);
    setTimeout(() => setDoubleTapAnimation(false), 800);
  };

  const handleSave = async () => {
    if (isSaved) {
      setIsSaved(false);
      await unsaveReel(reel.id);
      onSaveChange?.(false);
    } else {
      setIsSaved(true);
      await saveReel(reel.id);
      trackEvent(reel.id, 'save');
      onSaveChange?.(true);
    }
  };

  const handleShare = async () => {
    await shareReel(reel.id, reel.title);
    trackEvent(reel.id, 'share');
  };

  const handleFollow = async () => {
    if (!currentUserId) {
      navigate('/auth');
      return;
    }
    
    if (isFollowing) {
      await unfollowCreator(reel.user_id);
      setIsFollowing(false);
    } else {
      const success = await followCreator(reel.user_id);
      if (success) {
        setIsFollowing(true);
        trackEvent(reel.id, 'follow_creator');
      }
    }
  };

  const handleOpenComments = () => {
    trackEvent(reel.id, 'comment');
    onOpenComments();
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      handleDoubleTap();
    } else {
      togglePlay();
    }
    lastTapRef.current = now;
  };

  const displayName = reel.user?.display_name || 'User';
  const hashtags = reel.hashtags || [];
  const soundName = reel.sound_name;

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden" data-reel-video>
      {/* Video */}
      <video
        ref={videoRef}
        src={reel.video_url}
        poster={reel.thumbnail_url || undefined}
        className="w-full h-full object-cover"
        loop
        muted={isMuted}
        playsInline
        onClick={handleTap}
        preload="auto"
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70 pointer-events-none" />

      {/* Play/Pause indicator */}
      <AnimatePresence>
        {showPlayIcon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              {isPlaying ? (
                <Pause className="w-10 h-10 text-white" />
              ) : (
                <Play className="w-10 h-10 text-white ml-1" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Double tap heart animation */}
      <AnimatePresence>
        {doubleTapAnimation && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1.2 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <Heart className="w-32 h-32 text-red-500 fill-red-500 drop-shadow-lg" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar with search */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <Badge variant="secondary" className="bg-black/50 backdrop-blur-sm text-white border-0 font-bold">
          Boom Reels
        </Badge>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white bg-black/30 backdrop-blur-sm hover:bg-black/50"
            onClick={() => navigate('/explorer?search=true')}
          >
            <Search className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white bg-black/30 backdrop-blur-sm hover:bg-black/50"
            onClick={onToggleMute}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Right side actions */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-5">
        {/* Profile with follow button */}
        <div className="relative">
          <Link to={`/profile/${reel.user_id}`}>
            <Avatar className="w-12 h-12 ring-2 ring-primary shadow-lg">
              <AvatarImage src={reel.user?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {displayName[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </Link>
          {/* Follow/Unfollow button - hide if it's the user's own reel */}
          {currentUserId !== reel.user_id && (
            <motion.button 
              onClick={handleFollow}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center shadow-lg transition-colors",
                isFollowing 
                  ? "bg-white/20 backdrop-blur-sm border border-white/30" 
                  : "bg-[#00D4FF]"
              )}
            >
              {isFollowing ? (
                <UserMinus className="w-3 h-3 text-white" />
              ) : (
                <UserPlus className="w-3 h-3 text-black" />
              )}
            </motion.button>
          )}
        </div>

        {/* Like */}
        <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
          <motion.div
            whileTap={{ scale: 1.3 }}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200",
              isLiked 
                ? "bg-red-500/20 shadow-lg shadow-red-500/30" 
                : "bg-white/10 backdrop-blur-sm group-hover:bg-white/20"
            )}
          >
            <Heart 
              className={cn(
                "w-7 h-7 transition-all",
                isLiked ? "text-red-500 fill-red-500 scale-110" : "text-white"
              )} 
            />
          </motion.div>
          <span className="text-white text-xs font-semibold">{formatCount(likeCount)}</span>
        </button>

        {/* Comments */}
        <button onClick={handleOpenComments} className="flex flex-col items-center gap-1 group">
          <motion.div 
            whileTap={{ scale: 1.1 }}
            className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors"
          >
            <MessageCircle className="w-7 h-7 text-white" />
          </motion.div>
          <span className="text-white text-xs font-semibold">{formatCount(reel.comment_count)}</span>
        </button>

        {/* Bookmark */}
        <button onClick={handleSave} className="flex flex-col items-center gap-1 group">
          <motion.div
            whileTap={{ scale: 1.3 }}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200",
              isSaved 
                ? "bg-[#00D4FF]/20 shadow-lg shadow-[#00D4FF]/30" 
                : "bg-white/10 backdrop-blur-sm group-hover:bg-white/20"
            )}
          >
            <Bookmark 
              className={cn(
                "w-7 h-7 transition-all",
                isSaved ? "text-[#00D4FF] fill-[#00D4FF] scale-110" : "text-white"
              )} 
            />
          </motion.div>
        </button>

        {/* Share */}
        <button onClick={handleShare} className="flex flex-col items-center gap-1 group">
          <motion.div 
            whileTap={{ scale: 1.1 }}
            className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors"
          >
            <Share2 className="w-7 h-7 text-white" />
          </motion.div>
          {(reel.share_count || 0) > 0 && (
            <span className="text-white text-xs font-semibold">{formatCount(reel.share_count || 0)}</span>
          )}
        </button>

        {/* More */}
        <button className="flex flex-col items-center gap-1 group">
          <motion.div 
            whileTap={{ scale: 1.1 }}
            className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors"
          >
            <MoreHorizontal className="w-7 h-7 text-white" />
          </motion.div>
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-6 left-4 right-20">
        {/* User info */}
        <Link to={`/profile/${reel.user_id}`} className="flex items-center gap-2 mb-2">
          <span className="text-white font-bold text-base drop-shadow-lg">
            @{displayName}
          </span>
        </Link>

        {/* Title & Description with expand */}
        <div className="mb-3">
          <p className={cn(
            "text-white text-sm drop-shadow-lg transition-all",
            showMoreCaption ? "" : "line-clamp-2"
          )}>
            {reel.title}
            {reel.description && ` - ${reel.description}`}
          </p>
          {(reel.title.length > 80 || reel.description) && (
            <button 
              onClick={() => setShowMoreCaption(!showMoreCaption)}
              className="text-white/70 text-xs mt-1 flex items-center gap-1"
            >
              {showMoreCaption ? 'less' : 'more'}
              <ChevronDown className={cn("w-3 h-3 transition-transform", showMoreCaption && "rotate-180")} />
            </button>
          )}
        </div>

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {hashtags.slice(0, 3).map((tag, i) => (
              <Link 
                key={i} 
                to={`/explorer?hashtag=${encodeURIComponent(tag)}`}
                className="flex items-center gap-1 text-white/80 text-xs hover:text-white transition-colors"
              >
                <Hash className="w-3 h-3" />
                {tag}
              </Link>
            ))}
          </div>
        )}

        {/* Sound/Music label */}
        {soundName && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
              <Music className="w-4 h-4 text-white" />
              <span className="text-white text-xs truncate max-w-[150px]">{soundName}</span>
            </div>
          </div>
        )}

        {/* Tagged card */}
        {reel.tagged_card && (
          <motion.button
            onClick={() => navigate(`/item/${reel.tagged_card_id}`)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 max-w-xs shadow-lg"
          >
            <img
              src={reel.tagged_card.image_url || '/placeholder.svg'}
              alt={reel.tagged_card.name}
              className="w-10 h-14 rounded-md object-cover"
            />
            <div className="flex-1 text-left min-w-0">
              <p className="text-white text-xs font-medium truncate">{reel.tagged_card.name}</p>
              <p className="text-[#00D4FF] text-sm font-bold">${reel.tagged_card.current_price.toLocaleString()}</p>
            </div>
            <ShoppingBag className="w-5 h-5 text-white/70" />
          </motion.button>
        )}
      </div>

      {/* Progress bar */}
      {isActive && videoRef.current && (
        <VideoProgress videoRef={videoRef} />
      )}
    </div>
  );
}

function VideoProgress({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement> }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    video.addEventListener('timeupdate', updateProgress);
    return () => video.removeEventListener('timeupdate', updateProgress);
  }, [videoRef]);

  return (
    <div className="absolute top-0 left-0 right-0 h-1 bg-white/20">
      <motion.div
        className="h-full bg-[#00D4FF]"
        style={{ width: `${progress}%` }}
        transition={{ duration: 0.1 }}
      />
    </div>
  );
}
