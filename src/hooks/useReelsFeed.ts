import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Reel } from './useReels';

// Session-persistent mute preference
export function useMutePreference() {
  const [isMuted, setIsMuted] = useState(() => {
    const stored = sessionStorage.getItem('reels-muted');
    return stored === null ? true : stored === 'true';
  });

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newValue = !prev;
      sessionStorage.setItem('reels-muted', String(newValue));
      return newValue;
    });
  }, []);

  const setMuted = useCallback((value: boolean) => {
    sessionStorage.setItem('reels-muted', String(value));
    setIsMuted(value);
  }, []);

  return { isMuted, toggleMute, setMuted };
}

// Generate session ID for anonymous tracking
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('reels-session-id');
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('reels-session-id', sessionId);
  }
  return sessionId;
}

// Watch events tracking
export function useWatchEvents() {
  const sessionId = useRef(getSessionId());
  const trackedEvents = useRef(new Set<string>());

  const trackEvent = useCallback(async (
    reelId: string,
    eventType: 'impression' | 'view_start' | 'view_3s' | 'view_10s' | 'view_complete' | 'like' | 'comment' | 'share' | 'save' | 'follow_creator',
    watchDuration: number = 0
  ) => {
    // Prevent duplicate milestone events per session
    const eventKey = `${reelId}-${eventType}`;
    if (['view_3s', 'view_10s', 'view_complete'].includes(eventType)) {
      if (trackedEvents.current.has(eventKey)) return;
      trackedEvents.current.add(eventKey);
    }

    try {
      // Use direct insert instead of RPC (types will update after migration)
      await supabase.from('reel_watch_events' as any).insert({
        reel_id: reelId,
        event_type: eventType,
        watch_duration: watchDuration,
        session_id: sessionId.current
      });
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }, []);

  const resetTracking = useCallback((reelId: string) => {
    // Clear tracked events for this reel (for new session)
    trackedEvents.current.forEach(key => {
      if (key.startsWith(reelId)) {
        trackedEvents.current.delete(key);
      }
    });
  }, []);

  return { trackEvent, resetTracking, sessionId: sessionId.current };
}

// Preload hook for videos
export function usePrefetch(reels: Reel[], currentIndex: number) {
  const preloadedUrls = useRef(new Set<string>());

  useEffect(() => {
    // Preload next 2 videos
    const indicesToPreload = [currentIndex + 1, currentIndex + 2];
    
    indicesToPreload.forEach(index => {
      if (index >= 0 && index < reels.length) {
        const reel = reels[index];
        if (reel && !preloadedUrls.current.has(reel.video_url)) {
          // Preload video
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.src = reel.video_url;
          preloadedUrls.current.add(reel.video_url);

          // Preload thumbnail
          if (reel.thumbnail_url) {
            const img = new Image();
            img.src = reel.thumbnail_url;
          }
        }
      }
    });
  }, [reels, currentIndex]);
}

// Enhanced reels feed hook with proper ranking
export function useReelsFeed(feedType: 'for_you' | 'following' | 'trending' = 'for_you') {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const { toast } = useToast();

  const fetchReels = useCallback(async (offset = 0, limit = 10) => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      // Determine ordering based on feed type
      let orderColumn = 'created_at';
      if (feedType === 'trending') {
        orderColumn = 'trending_score';
      }
      
      let query = supabase
        .from('card_reels')
        .select('*')
        .eq('is_active', true)
        .order(orderColumn, { ascending: false })
        .range(offset, offset + limit - 1);

      // For following feed, filter by followed users
      if (feedType === 'following' && user) {
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        
        if (following && following.length > 0) {
          const followingIds = following.map(f => f.following_id);
          query = query.in('user_id', followingIds);
        } else {
          // No following, return empty
          setReels([]);
          setHasMore(false);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        if (offset === 0) setReels([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      // Fetch user profiles
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

      // Fetch tagged cards
      const cardIds = data.filter(r => r.tagged_card_id).map(r => r.tagged_card_id);
      let cardsMap = new Map();
      if (cardIds.length > 0) {
        const { data: cards } = await supabase
          .from('market_items')
          .select('id, name, image_url, current_price, category')
          .in('id', cardIds);
        cardsMap = new Map(cards?.map(c => [c.id, c]) || []);
      }

      let reelsWithData = data.map(reel => ({
        ...reel,
        user: profilesMap.get(reel.user_id) as Reel['user'],
        tagged_card: reel.tagged_card_id ? cardsMap.get(reel.tagged_card_id) as Reel['tagged_card'] : undefined,
      })) as Reel[];

      // Check user's likes and saves
      if (user) {
        const reelIds = data.map(r => r.id);
        
        const [likesResult, savesResult] = await Promise.all([
          supabase
            .from('reel_likes')
            .select('reel_id')
            .eq('user_id', user.id)
            .in('reel_id', reelIds),
          supabase
            .from('reel_saves')
            .select('reel_id')
            .eq('user_id', user.id)
            .in('reel_id', reelIds)
        ]);

        const likedIds = new Set(likesResult.data?.map(l => l.reel_id) || []);
        const savedIds = new Set(savesResult.data?.map(s => s.reel_id) || []);

        reelsWithData = reelsWithData.map(reel => ({
          ...reel,
          is_liked: likedIds.has(reel.id),
          is_saved: savedIds.has(reel.id),
        }));
      }

      if (offset === 0) {
        setReels(reelsWithData);
      } else {
        setReels(prev => [...prev, ...reelsWithData]);
      }

      setHasMore(data.length === limit);
    } catch (error) {
      console.error('Error fetching reels:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reels',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [feedType, toast]);

  useEffect(() => {
    fetchReels();
  }, [fetchReels]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchReels(reels.length);
    }
  }, [loading, hasMore, reels.length, fetchReels]);

  return { reels, loading, hasMore, loadMore, refetch: () => fetchReels() };
}

// Swipe navigation hook
export function useSwipeNav(
  currentIndex: number,
  totalItems: number,
  onNext: () => void,
  onPrev: () => void
) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleSwipe = useCallback((direction: 'up' | 'down') => {
    if (isAnimating) return;

    setIsAnimating(true);
    
    if (direction === 'up' && currentIndex < totalItems - 1) {
      onNext();
    } else if (direction === 'down' && currentIndex > 0) {
      onPrev();
    }

    setTimeout(() => setIsAnimating(false), 300);
  }, [currentIndex, totalItems, onNext, onPrev, isAnimating]);

  return { handleSwipe, isAnimating };
}

// Active video hook with IntersectionObserver
export function useActiveVideo(containerRef: React.RefObject<HTMLElement>) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0');
            setActiveIndex(index);
          }
        });
      },
      {
        root: container,
        threshold: 0.5
      }
    );

    const videos = container.querySelectorAll('[data-reel-video]');
    videos.forEach(video => observer.observe(video));

    return () => observer.disconnect();
  }, [containerRef]);

  return activeIndex;
}
