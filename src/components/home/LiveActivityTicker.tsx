import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, TrendingUp, Sparkles, User, Trophy } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'sale' | 'price_move' | 'grading' | 'listing' | 'card_war';
  icon: 'fire' | 'chart' | 'sparkle' | 'user' | 'trophy';
  color: string;
  message: string;
  timeAgo: string;
}

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

const formatPrice = (cents: number): string => {
  return `$${(cents / 100).toLocaleString()}`;
};

const iconMap = {
  fire: Flame,
  chart: TrendingUp,
  sparkle: Sparkles,
  user: User,
  trophy: Trophy,
};

const colorMap = {
  fire: 'text-green-400',
  chart: 'text-purple-400',
  sparkle: 'text-blue-400',
  user: 'text-yellow-400',
  trophy: 'text-orange-400',
};

export const LiveActivityTicker = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchRecentActivities();
    
    // Set up realtime subscriptions
    const ordersChannel = supabase
      .channel('live-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        fetchRecentActivities();
      })
      .subscribe();

    const listingsChannel = supabase
      .channel('live-listings')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'listings' }, () => {
        fetchRecentActivities();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(listingsChannel);
    };
  }, []);

  // Auto-rotate through activities
  useEffect(() => {
    if (activities.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activities.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [activities.length]);

  const fetchRecentActivities = async () => {
    const newActivities: ActivityItem[] = [];

    // Fetch recent sales (completed orders)
    const { data: orders } = await supabase
      .from('orders')
      .select('id, price_cents, created_at, listing:listings(title)')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5);

    orders?.forEach((order) => {
      const title = (order.listing as any)?.title || 'Card';
      const shortTitle = title.length > 30 ? title.substring(0, 30) + '...' : title;
      newActivities.push({
        id: `sale-${order.id}`,
        type: 'sale',
        icon: 'fire',
        color: 'green',
        message: `🔥 ${shortTitle} sold for ${formatPrice(order.price_cents || 0)}`,
        timeAgo: formatTimeAgo(new Date(order.created_at)),
      });
    });

    // Fetch recent listings
    const { data: listings } = await supabase
      .from('listings')
      .select('id, title, price_cents, created_at, seller_id')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5);

    listings?.forEach((listing) => {
      const shortTitle = listing.title.length > 25 ? listing.title.substring(0, 25) + '...' : listing.title;
      newActivities.push({
        id: `listing-${listing.id}`,
        type: 'listing',
        icon: 'user',
        color: 'yellow',
        message: `👤 New listing: ${shortTitle} — ${formatPrice(listing.price_cents || 0)}`,
        timeAgo: formatTimeAgo(new Date(listing.created_at)),
      });
    });

    // Fetch recent grading completions
    const { data: gradingOrders } = await supabase
      .from('grading_orders')
      .select('id, card_name, final_grade, completed_at')
      .eq('status', 'completed')
      .not('final_grade', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(3);

    gradingOrders?.forEach((grading) => {
      const shortName = grading.card_name.length > 25 ? grading.card_name.substring(0, 25) + '...' : grading.card_name;
      newActivities.push({
        id: `grading-${grading.id}`,
        type: 'grading',
        icon: 'sparkle',
        color: 'blue',
        message: `🧠 AI Grading completed — ${shortName}: ${grading.final_grade}`,
        timeAgo: formatTimeAgo(new Date(grading.completed_at!)),
      });
    });

    // Fetch top movers (price changes)
    const { data: movers } = await supabase
      .from('market_items')
      .select('id, name, change_7d')
      .not('change_7d', 'is', null)
      .gt('change_7d', 5)
      .order('change_7d', { ascending: false })
      .limit(3);

    movers?.forEach((item) => {
      const shortName = item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name;
      newActivities.push({
        id: `mover-${item.id}`,
        type: 'price_move',
        icon: 'chart',
        color: 'purple',
        message: `📈 ${shortName} +${item.change_7d?.toFixed(1)}% this week`,
        timeAgo: 'trending',
      });
    });

    // Fetch recent card wars
    const { data: cardWars } = await supabase
      .from('card_wars')
      .select('id, card_a_name, card_b_name, winner, status')
      .eq('status', 'completed')
      .not('winner', 'is', null)
      .order('ends_at', { ascending: false })
      .limit(2);

    cardWars?.forEach((war) => {
      const winnerName = war.winner === 'card_a' ? war.card_a_name : war.card_b_name;
      const shortName = winnerName.length > 20 ? winnerName.substring(0, 20) + '...' : winnerName;
      newActivities.push({
        id: `war-${war.id}`,
        type: 'card_war',
        icon: 'trophy',
        color: 'orange',
        message: `🏆 Card Wars: ${shortName} wins the vote!`,
        timeAgo: 'completed',
      });
    });

    // Shuffle and set activities
    const shuffled = newActivities.sort(() => Math.random() - 0.5);
    setActivities(shuffled.slice(0, 10));
  };

  if (activities.length === 0) return null;

  const currentActivity = activities[currentIndex];
  const IconComponent = iconMap[currentActivity.icon];

  return (
    <div className="w-full mb-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl px-4 py-3 border border-border/30 overflow-hidden"
      >
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Live</span>
          </div>

          <div className="h-4 w-px bg-border/50" />

          {/* Activity content */}
          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentActivity.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2"
              >
                <IconComponent className={`w-4 h-4 shrink-0 ${colorMap[currentActivity.icon]}`} />
                <span className="text-sm text-foreground truncate">{currentActivity.message}</span>
                <span className="text-xs text-muted-foreground shrink-0">— {currentActivity.timeAgo}</span>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Progress dots */}
          <div className="flex gap-1 shrink-0">
            {activities.slice(0, 5).map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === currentIndex % 5 ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
