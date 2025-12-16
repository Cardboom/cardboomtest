import { cn } from '@/lib/utils';
import { Check, TrendingUp, Zap, Clock, Star, Sparkles, ShieldCheck } from 'lucide-react';

interface ConfidenceBadgeProps {
  type: 'good_price' | 'sells_fast' | 'high_interest' | 'trending' | 'verified' | 'fresh_data';
  className?: string;
}

const badgeConfig = {
  good_price: {
    icon: Check,
    label: 'Good Price Range',
    color: 'text-gain bg-gain/10 border-gain/20',
    description: 'Price aligns with recent market sales',
  },
  sells_fast: {
    icon: Zap,
    label: 'Sells Fast',
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    description: 'High liquidity - typically sells within 7 days',
  },
  high_interest: {
    icon: Star,
    label: 'High Interest',
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    description: 'Many collectors watching this item',
  },
  trending: {
    icon: TrendingUp,
    label: 'Trending Up',
    color: 'text-primary bg-primary/10 border-primary/20',
    description: 'Price has increased recently',
  },
  verified: {
    icon: ShieldCheck,
    label: 'Verified Match',
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    description: 'Item matched with official database',
  },
  fresh_data: {
    icon: Clock,
    label: 'Fresh Data',
    color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
    description: 'Updated within the last hour',
  },
};

export const ConfidenceBadge = ({ type, className }: ConfidenceBadgeProps) => {
  const config = badgeConfig[type];
  const Icon = config.icon;

  return (
    <span 
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
        config.color,
        className
      )}
      title={config.description}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
};

// Micro-confirmation toast content
export const ConfirmationMessage = ({ 
  type 
}: { 
  type: keyof typeof confirmationMessages;
}) => {
  const message = confirmationMessages[type];
  return (
    <div className="flex items-center gap-2">
      <Sparkles className="w-4 h-4 text-primary" />
      <span>{message}</span>
    </div>
  );
};

const confirmationMessages = {
  good_listing: "Great listing! Priced competitively.",
  watchlist_added: "Nice pick! This item has high demand.",
  portfolio_added: "Added to your collection tracker.",
  price_alert_set: "You'll be notified when the price drops.",
  matched: "Perfect match found in our database!",
  import_success: "All items imported successfully!",
};

// Market insight badges for items
export const MarketInsightBadges = ({ 
  liquidityLevel,
  priceChange,
  watchlistCount,
  salesCount,
}: {
  liquidityLevel?: 'high' | 'medium' | 'low';
  priceChange?: number;
  watchlistCount?: number;
  salesCount?: number;
}) => {
  const badges = [];

  if (liquidityLevel === 'high') {
    badges.push(<ConfidenceBadge key="fast" type="sells_fast" />);
  }

  if (priceChange && priceChange > 5) {
    badges.push(<ConfidenceBadge key="trending" type="trending" />);
  }

  if (watchlistCount && watchlistCount > 50) {
    badges.push(<ConfidenceBadge key="interest" type="high_interest" />);
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {badges}
    </div>
  );
};
