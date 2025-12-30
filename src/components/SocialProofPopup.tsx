import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Sparkles, TrendingUp, Users, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface SocialProofEvent {
  id: string;
  type: 'purchase' | 'listing' | 'watchlist' | 'follow';
  username: string;
  userId: string;
  itemName: string;
  itemImage?: string;
  price?: number;
  timestamp: Date;
}

const DEMO_EVENTS: Omit<SocialProofEvent, 'id' | 'timestamp'>[] = [
  { type: 'purchase', username: 'CardMaster99', userId: 'demo-1', itemName: 'Charizard 1st Edition PSA 10', price: 45000 },
  { type: 'listing', username: 'TCGTrader', userId: 'demo-2', itemName: 'Black Lotus BGS 9.5', price: 125000 },
  { type: 'watchlist', username: 'CollectorPro', userId: 'demo-3', itemName: 'Pikachu Illustrator' },
  { type: 'purchase', username: 'PokeFan2024', userId: 'demo-4', itemName: 'Mewtwo Rainbow Rare', price: 850 },
  { type: 'follow', username: 'NewCollector', userId: 'demo-5', itemName: 'VintageCards' },
];

export const SocialProofPopup = () => {
  const [currentEvent, setCurrentEvent] = useState<SocialProofEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [eventQueue, setEventQueue] = useState<SocialProofEvent[]>([]);

  // Generate demo events periodically
  useEffect(() => {
    const generateDemoEvent = () => {
      const randomEvent = DEMO_EVENTS[Math.floor(Math.random() * DEMO_EVENTS.length)];
      const event: SocialProofEvent = {
        ...randomEvent,
        id: `demo-${Date.now()}`,
        timestamp: new Date(),
      };
      setEventQueue(prev => [...prev, event]);
    };

    // Start with a delay, then show events periodically
    const initialDelay = setTimeout(() => {
      generateDemoEvent();
    }, 5000);

    const interval = setInterval(() => {
      if (Math.random() > 0.4) { // 60% chance to show an event
        generateDemoEvent();
      }
    }, 15000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, []);

  // Subscribe to real orders
  useEffect(() => {
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
            .select('title, price, image_url')
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
              itemName: listing.title?.slice(0, 40) || 'a card',
              itemImage: listing.image_url || undefined,
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
            itemName: (payload.new.title as string)?.slice(0, 40) || 'a new item',
            itemImage: payload.new.image_url as string | undefined,
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
  }, []);

  // Process event queue
  useEffect(() => {
    if (eventQueue.length > 0 && !isVisible) {
      const nextEvent = eventQueue[0];
      setCurrentEvent(nextEvent);
      setIsVisible(true);
      setEventQueue(prev => prev.slice(1));

      // Hide after 5 seconds
      const hideTimeout = setTimeout(() => {
        setIsVisible(false);
      }, 5000);

      return () => clearTimeout(hideTimeout);
    }
  }, [eventQueue, isVisible]);

  const getEventIcon = (type: SocialProofEvent['type']) => {
    switch (type) {
      case 'purchase':
        return <ShoppingBag className="w-5 h-5 text-green-500" />;
      case 'listing':
        return <Sparkles className="w-5 h-5 text-primary" />;
      case 'watchlist':
        return <Star className="w-5 h-5 text-yellow-500" />;
      case 'follow':
        return <Users className="w-5 h-5 text-blue-500" />;
      default:
        return <TrendingUp className="w-5 h-5 text-primary" />;
    }
  };

  const getEventMessage = (event: SocialProofEvent) => {
    switch (event.type) {
      case 'purchase':
        return 'just purchased';
      case 'listing':
        return 'just listed';
      case 'watchlist':
        return 'added to watchlist';
      case 'follow':
        return 'started following';
      default:
        return 'is active on';
    }
  };

  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <AnimatePresence>
      {isVisible && currentEvent && (
        <motion.div
          initial={{ opacity: 0, x: -100, y: 0 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed bottom-4 left-4 z-50 max-w-sm"
        >
          <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl p-4 flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              {getEventIcon(currentEvent.type)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Link 
                  to={`/profile/${currentEvent.userId}`}
                  className="font-semibold text-foreground hover:text-primary transition-colors truncate"
                >
                  {currentEvent.username}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {getTimeAgo(currentEvent.timestamp)}
                </span>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {getEventMessage(currentEvent)}{' '}
                <span className="font-medium text-foreground">
                  {currentEvent.itemName}
                </span>
              </p>

              {currentEvent.price && (
                <p className="text-sm font-bold text-primary mt-1">
                  ${currentEvent.price.toLocaleString()}
                </p>
              )}
            </div>

            {/* Live indicator */}
            <div className="flex-shrink-0 flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Live</span>
            </div>
          </div>

          {/* Subtle glow effect */}
          <div className="absolute inset-0 -z-10 bg-primary/5 blur-xl rounded-full" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
