import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Bookmark, Volume2, VolumeX, Play, Pause, MoreHorizontal, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useReelActions, Reel } from '@/hooks/useReels';
import { useLanguage } from '@/contexts/LanguageContext';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ReelCardProps {
  reel: Reel;
  isActive: boolean;
  onOpenComments: () => void;
  onLikeChange?: (liked: boolean) => void;
  onSaveChange?: (saved: boolean) => void;
}

export function ReelCard({ reel, isActive, onOpenComments, onLikeChange, onSaveChange }: ReelCardProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [isLiked, setIsLiked] = useState(reel.is_liked || false);
  const [isSaved, setIsSaved] = useState(reel.is_saved || false);
  const [likeCount, setLikeCount] = useState(reel.like_count);
  const [hasViewed, setHasViewed] = useState(false);
  const [doubleTapAnimation, setDoubleTapAnimation] = useState(false);
  const lastTapRef = useRef(0);
  
  const { likeReel, unlikeReel, saveReel, unsaveReel, incrementView, shareReel } = useReelActions();

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
        
        if (!hasViewed) {
          incrementView(reel.id);
          setHasViewed(true);
        }
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setIsPlaying(false);
      }
    }
  }, [isActive, reel.id, hasViewed, incrementView]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
      setShowPlayIcon(true);
      const timeoutId = setTimeout(() => setShowPlayIcon(false), 500);
      return () => clearTimeout(timeoutId);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

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
      onLikeChange?.(true);
    }
  };

  const handleDoubleTap = () => {
    if (!isLiked) {
      handleLike();
    }
    setDoubleTapAnimation(true);
    const timeoutId = setTimeout(() => setDoubleTapAnimation(false), 800);
    return () => clearTimeout(timeoutId);
  };

  const handleSave = async () => {
    if (isSaved) {
      setIsSaved(false);
      await unsaveReel(reel.id);
      onSaveChange?.(false);
    } else {
      setIsSaved(true);
      await saveReel(reel.id);
      onSaveChange?.(true);
    }
  };

  const handleShare = () => {
    shareReel(reel.id, reel.title);
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

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
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
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />

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

      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <Badge variant="secondary" className="bg-black/50 backdrop-blur-sm text-white border-0">
          CardBoom Reels
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="text-white bg-black/30 backdrop-blur-sm hover:bg-black/50"
          onClick={toggleMute}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </Button>
      </div>

      {/* Right side actions */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-5">
        {/* Profile */}
        <Link to={`/profile/${reel.user_id}`} className="relative">
          <Avatar className="w-12 h-12 ring-2 ring-primary">
            <AvatarImage src={reel.user?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {displayName[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-primary-foreground">+</span>
          </div>
        </Link>

        {/* Like */}
        <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
          <motion.div
            whileTap={{ scale: 1.2 }}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
              isLiked 
                ? "bg-red-500/20" 
                : "bg-white/10 backdrop-blur-sm group-hover:bg-white/20"
            )}
          >
            <Heart 
              className={cn(
                "w-7 h-7 transition-colors",
                isLiked ? "text-red-500 fill-red-500" : "text-white"
              )} 
            />
          </motion.div>
          <span className="text-white text-xs font-medium">{formatCount(likeCount)}</span>
        </button>

        {/* Comments */}
        <button onClick={onOpenComments} className="flex flex-col items-center gap-1 group">
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
            <MessageCircle className="w-7 h-7 text-white" />
          </div>
          <span className="text-white text-xs font-medium">{formatCount(reel.comment_count)}</span>
        </button>

        {/* Bookmark */}
        <button onClick={handleSave} className="flex flex-col items-center gap-1 group">
          <motion.div
            whileTap={{ scale: 1.2 }}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
              isSaved 
                ? "bg-primary/20" 
                : "bg-white/10 backdrop-blur-sm group-hover:bg-white/20"
            )}
          >
            <Bookmark 
              className={cn(
                "w-7 h-7 transition-colors",
                isSaved ? "text-primary fill-primary" : "text-white"
              )} 
            />
          </motion.div>
        </button>

        {/* Share */}
        <button onClick={handleShare} className="flex flex-col items-center gap-1 group">
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
            <Share2 className="w-7 h-7 text-white" />
          </div>
        </button>

        {/* More */}
        <button className="flex flex-col items-center gap-1 group">
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
            <MoreHorizontal className="w-7 h-7 text-white" />
          </div>
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-6 left-4 right-20">
        {/* User info */}
        <Link to={`/profile/${reel.user_id}`} className="flex items-center gap-2 mb-3">
          <span className="text-white font-bold text-sm">
            @{displayName}
          </span>
        </Link>

        {/* Title */}
        <p className="text-white text-sm mb-3 line-clamp-2">{reel.title}</p>

        {/* Description */}
        {reel.description && (
          <p className="text-white/70 text-xs mb-3 line-clamp-2">{reel.description}</p>
        )}

        {/* Tagged card */}
        {reel.tagged_card && (
          <motion.button
            onClick={() => navigate(`/item/${reel.tagged_card_id}`)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 max-w-xs"
          >
            <img
              src={reel.tagged_card.image_url || '/placeholder.svg'}
              alt={reel.tagged_card.name}
              className="w-10 h-14 rounded-md object-cover"
            />
            <div className="flex-1 text-left min-w-0">
              <p className="text-white text-xs font-medium truncate">{reel.tagged_card.name}</p>
              <p className="text-primary text-sm font-bold">${reel.tagged_card.current_price.toLocaleString()}</p>
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
        className="h-full bg-primary"
        style={{ width: `${progress}%` }}
        transition={{ duration: 0.1 }}
      />
    </div>
  );
}
