import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, ShoppingBag, Bell, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Activity {
  id: string;
  type: 'purchase' | 'notification' | 'listing';
  username: string;
  userId: string;
  message: string;
  timestamp: Date;
}

export const ActivityAnnouncementBanner = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  // Fetch recent activities
  useEffect(() => {
    const fetchRecentActivity = async () => {
      // Fetch recent orders
      const { data: orders } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          buyer_id,
          listing_id,
          listings!orders_listing_id_fkey(title)
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10);

      if (orders) {
        // Get buyer profiles
        const buyerIds = orders.map(o => o.buyer_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', buyerIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.display_name || 'A collector']) || []);

        const newActivities: Activity[] = orders.map(order => ({
          id: order.id,
          type: 'purchase' as const,
          username: profileMap.get(order.buyer_id) || 'A collector',
          userId: order.buyer_id,
          message: `just purchased ${(order.listings as any)?.title?.slice(0, 30) || 'a card'}...`,
          timestamp: new Date(order.created_at),
        }));

        setActivities(newActivities);
      }
    };

    fetchRecentActivity();

    // Subscribe to real-time order updates
    const channel = supabase
      .channel('activity-banner')
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
            .select('title')
            .eq('id', payload.new.listing_id)
            .single();

          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', payload.new.buyer_id)
            .single();

          const newActivity: Activity = {
            id: payload.new.id,
            type: 'purchase',
            username: profile?.display_name || 'A collector',
            userId: payload.new.buyer_id,
            message: `just purchased ${listing?.title?.slice(0, 30) || 'a card'}...`,
            timestamp: new Date(),
          };

          setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
          setIsAnimating(true);
          setTimeout(() => setIsAnimating(false), 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Rotate through activities
  useEffect(() => {
    if (activities.length <= 1) return;
    
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % activities.length);
        setIsAnimating(false);
      }, 300);
    }, 5000);

    return () => clearInterval(interval);
  }, [activities.length]);

  if (!isVisible || activities.length === 0) return null;

  const currentActivity = activities[currentIndex];
  const IconComponent = currentActivity?.type === 'purchase' ? ShoppingBag : 
                        currentActivity?.type === 'notification' ? Bell : Sparkles;

  return (
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-b border-primary/20 py-1.5 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className={cn(
          "flex items-center justify-center gap-2 text-xs transition-all duration-300",
          isAnimating && "opacity-0 translate-y-2"
        )}>
          <IconComponent className="w-3 h-3 text-primary animate-pulse" />
          <span className="text-muted-foreground">
            <Link 
              to={`/profile/${currentActivity?.userId}`}
              className="font-medium text-primary hover:underline"
            >
              {currentActivity?.username}
            </Link>
            {' '}{currentActivity?.message}
          </span>
          <span className="text-muted-foreground/60 text-[10px]">
            {currentActivity?.timestamp && getTimeAgo(currentActivity.timestamp)}
          </span>
        </div>
      </div>
      <button 
        onClick={() => setIsVisible(false)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}