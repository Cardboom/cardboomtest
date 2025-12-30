import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Link, useLocation } from 'react-router-dom';

interface SocialProofEvent {
  id: string;
  type: 'purchase' | 'listing';
  username: string;
  userId: string;
  itemName: string;
  price?: number;
  timestamp: Date;
}

// Pages where social proof should NOT show
const EXCLUDED_PATHS = ['/', '/auth', '/admin', '/profile', '/messages', '/wallet'];

export const SocialProofPopup = () => {
  const [currentEvent, setCurrentEvent] = useState<SocialProofEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [eventQueue, setEventQueue] = useState<SocialProofEvent[]>([]);
  const location = useLocation();

  // Check if we should show popups on current page
  const shouldShow = !EXCLUDED_PATHS.some(path => 
    location.pathname === path || location.pathname.startsWith('/profile/')
  );

  // Subscribe to real orders only
  useEffect(() => {
    if (!shouldShow) return;

    const channel = supabase
      .channel('social-proof-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        async (payload) => {
          const { data: listing } = await supabase
            .from('listings')
            .select('title, price')
            .eq('id', payload.new.listing_id)
            .single();

          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', payload.new.buyer_id)
            .single();

          if (listing) {
            const event: SocialProofEvent = {
              id: payload.new.id,
              type: 'purchase',
              username: profile?.display_name || 'A collector',
              userId: payload.new.buyer_id,
              itemName: listing.title?.slice(0, 30) || 'a card',
              price: listing.price,
              timestamp: new Date(),
            };
            setEventQueue(prev => [...prev, event]);
          }
        }
      )
      .subscribe();

    // Subscribe to new listings
    const listingsChannel = supabase
      .channel('social-proof-listings')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'listings',
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', payload.new.seller_id)
            .single();

          const event: SocialProofEvent = {
            id: payload.new.id,
            type: 'listing',
            username: profile?.display_name || 'A seller',
            userId: payload.new.seller_id,
            itemName: (payload.new.title as string)?.slice(0, 30) || 'a new item',
            price: payload.new.price as number,
            timestamp: new Date(),
          };
          setEventQueue(prev => [...prev, event]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(listingsChannel);
    };
  }, [shouldShow]);

  // Process event queue
  useEffect(() => {
    if (eventQueue.length > 0 && !isVisible && shouldShow) {
      const nextEvent = eventQueue[0];
      setCurrentEvent(nextEvent);
      setIsVisible(true);
      setEventQueue(prev => prev.slice(1));

      // Hide after 4 seconds
      const hideTimeout = setTimeout(() => {
        setIsVisible(false);
      }, 4000);

      return () => clearTimeout(hideTimeout);
    }
  }, [eventQueue, isVisible, shouldShow]);

  // Hide when navigating to excluded pages
  useEffect(() => {
    if (!shouldShow) {
      setIsVisible(false);
    }
  }, [shouldShow]);

  const getEventIcon = (type: SocialProofEvent['type']) => {
    switch (type) {
      case 'purchase':
        return <ShoppingBag className="w-3.5 h-3.5 text-green-500" />;
      case 'listing':
        return <Sparkles className="w-3.5 h-3.5 text-primary" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-primary" />;
    }
  };

  const getEventMessage = (event: SocialProofEvent) => {
    switch (event.type) {
      case 'purchase':
        return 'bought';
      case 'listing':
        return 'listed';
      default:
        return 'active on';
    }
  };

  if (!shouldShow) return null;

  return (
    <AnimatePresence>
      {isVisible && currentEvent && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-4 left-4 z-50"
        >
          <div className="bg-card/90 backdrop-blur-md border border-border/40 rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 text-xs">
            {/* Icon */}
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center">
              {getEventIcon(currentEvent.type)}
            </div>

            {/* Content */}
            <div className="flex items-center gap-1.5 min-w-0">
              <Link 
                to={`/profile/${currentEvent.userId}`}
                className="font-medium text-foreground hover:text-primary transition-colors truncate max-w-[80px]"
              >
                {currentEvent.username}
              </Link>
              <span className="text-muted-foreground">
                {getEventMessage(currentEvent)}
              </span>
              <span className="font-medium text-foreground truncate max-w-[100px]">
                {currentEvent.itemName}
              </span>
              {currentEvent.price && (
                <span className="font-semibold text-primary">
                  ${currentEvent.price.toLocaleString()}
                </span>
              )}
            </div>

            {/* Live dot */}
            <span className="relative flex h-1.5 w-1.5 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
