import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { ReelCard } from './ReelCard';
import { CommentsDrawer } from './CommentsDrawer';
import { useReels, Reel } from '@/hooks/useReels';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface ReelsFeedProps {
  feedType?: 'for_you' | 'following' | 'trending';
  className?: string;
}

export function ReelsFeed({ feedType = 'for_you', className }: ReelsFeedProps) {
  const { t } = useLanguage();
  const { reels, loading, hasMore, loadMore } = useReels(feedType);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down'>('down');
  const containerRef = useRef<HTMLDivElement>(null);
  
  const y = useMotionValue(0);
  const dragProgress = useTransform(y, [-100, 0, 100], [-1, 0, 1]);

  const goToNext = useCallback(() => {
    if (currentIndex < reels.length - 1) {
      setDirection('down');
      setCurrentIndex(prev => prev + 1);
      
      // Load more when near end
      if (currentIndex >= reels.length - 3 && hasMore) {
        loadMore();
      }
    }
  }, [currentIndex, reels.length, hasMore, loadMore]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setDirection('up');
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  // Handle swipe
  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 50;
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    if (offset < -threshold || velocity < -500) {
      goToNext();
    } else if (offset > threshold || velocity > 500) {
      goToPrev();
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (commentsOpen) return;
      
      if (e.key === 'ArrowDown' || e.key === 'j') {
        goToNext();
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        goToPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, commentsOpen]);

  // Handle scroll wheel
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let lastScrollTime = 0;
    const scrollCooldown = 500;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      const now = Date.now();
      if (now - lastScrollTime < scrollCooldown) return;
      
      if (e.deltaY > 30) {
        goToNext();
        lastScrollTime = now;
      } else if (e.deltaY < -30) {
        goToPrev();
        lastScrollTime = now;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [goToNext, goToPrev]);

  if (loading && reels.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-full bg-black", className)}>
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-white/70">{t.reels?.loadingReels || 'Loading reels...'}</p>
        </div>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-full bg-black", className)}>
        <div className="text-center px-8">
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
            <ChevronUp className="w-10 h-10 text-white/50" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">{t.reels?.noReels || 'No reels yet'}</h3>
          <p className="text-white/60">{t.reels?.beFirstToPost || 'Be the first to post a reel!'}</p>
        </div>
      </div>
    );
  }

  const currentReel = reels[currentIndex];

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-full w-full overflow-hidden bg-black touch-pan-x",
        className
      )}
    >
      <motion.div
        className="absolute inset-0"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ y }}
      >
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentReel.id}
            custom={direction}
            initial={{ 
              y: direction === 'down' ? '100%' : '-100%',
              opacity: 0 
            }}
            animate={{ 
              y: 0,
              opacity: 1 
            }}
            exit={{ 
              y: direction === 'down' ? '-100%' : '100%',
              opacity: 0 
            }}
            transition={{ 
              type: 'spring', 
              stiffness: 300, 
              damping: 30,
              opacity: { duration: 0.2 }
            }}
            className="absolute inset-0"
          >
            <ReelCard
              reel={currentReel}
              isActive={true}
              onOpenComments={() => setCommentsOpen(true)}
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Navigation hints */}
      <div className="absolute left-1/2 -translate-x-1/2 top-20 z-10 pointer-events-none">
        <AnimatePresence>
          {currentIndex > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex flex-col items-center text-white/30"
            >
              <ChevronUp className="w-6 h-6 animate-bounce" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 bottom-28 z-10 pointer-events-none">
        <AnimatePresence>
          {currentIndex < reels.length - 1 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center text-white/30"
            >
              <ChevronDown className="w-6 h-6 animate-bounce" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reel counter */}
      <div className="absolute top-4 right-16 z-10">
        <div className="px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs">
          {currentIndex + 1} / {reels.length}
        </div>
      </div>

      {/* Comments drawer */}
      <CommentsDrawer
        reelId={currentReel.id}
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
      />
    </div>
  );
}
