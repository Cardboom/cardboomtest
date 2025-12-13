import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, TrendingUp, Copy, MessageCircle, 
  Crown, Star, ChevronRight, UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import { motion } from 'framer-motion';

interface TopTrader {
  id: string;
  name: string;
  avatar?: string;
  winRate: number;
  monthlyReturn: number;
  followers: number;
  isFollowing: boolean;
  rank: number;
  specialty: string;
  recentTrade?: {
    item: string;
    action: 'buy' | 'sell';
    pnl: number;
  };
}

const MOCK_TRADERS: TopTrader[] = [
  {
    id: '1',
    name: 'CardMaster_Pro',
    winRate: 87,
    monthlyReturn: 34.5,
    followers: 2341,
    isFollowing: false,
    rank: 1,
    specialty: 'Pokémon',
    recentTrade: { item: 'Charizard PSA 10', action: 'buy', pnl: 12500 },
  },
  {
    id: '2',
    name: 'TradingKing',
    winRate: 82,
    monthlyReturn: 28.3,
    followers: 1856,
    isFollowing: true,
    rank: 2,
    specialty: 'Sports Cards',
    recentTrade: { item: 'LeBron Rookie', action: 'sell', pnl: 8200 },
  },
  {
    id: '3',
    name: 'TCGWhale',
    winRate: 79,
    monthlyReturn: 22.1,
    followers: 1234,
    isFollowing: false,
    rank: 3,
    specialty: 'One Piece',
  },
];

export const SocialTradingPanel = () => {
  const { formatPrice } = useCurrency();
  const [traders, setTraders] = useState(MOCK_TRADERS);

  const toggleFollow = (traderId: string) => {
    setTraders(prev => prev.map(t => 
      t.id === traderId ? { ...t, isFollowing: !t.isFollowing } : t
    ));
  };

  const rankBadges: Record<number, { icon: React.ElementType; color: string }> = {
    1: { icon: Crown, color: 'text-gold' },
    2: { icon: Star, color: 'text-platinum' },
    3: { icon: Star, color: 'text-orange-400' },
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent border-b border-border/50">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <span>Top Traders</span>
          </div>
          <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => window.location.href = '/leaderboard'}>
            View All
            <ChevronRight className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {traders.map((trader, index) => {
          const RankIcon = rankBadges[trader.rank]?.icon || Star;
          const rankColor = rankBadges[trader.rank]?.color || 'text-muted-foreground';
          
          return (
            <motion.div
              key={trader.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-all border border-transparent hover:border-primary/20"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="w-12 h-12 ring-2 ring-border">
                    <AvatarImage src={trader.avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {trader.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn(
                    "absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center bg-background border-2 border-border",
                    rankColor
                  )}>
                    <RankIcon className="w-3 h-3" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{trader.name}</p>
                    <Badge variant="outline" className="text-xs">{trader.specialty}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm">
                    <span className="text-muted-foreground">
                      {trader.winRate}% Win Rate
                    </span>
                    <span className={cn(
                      "font-semibold",
                      trader.monthlyReturn >= 0 ? "text-gain" : "text-loss"
                    )}>
                      +{trader.monthlyReturn}% MTD
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={trader.isFollowing ? "secondary" : "default"}
                    className="gap-1"
                    onClick={() => toggleFollow(trader.id)}
                  >
                    {trader.isFollowing ? (
                      <>Following</>
                    ) : (
                      <>
                        <UserPlus className="w-3 h-3" />
                        Follow
                      </>
                    )}
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {trader.recentTrade && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant={trader.recentTrade.action === 'buy' ? 'default' : 'secondary'}>
                        {trader.recentTrade.action.toUpperCase()}
                      </Badge>
                      <span className="text-muted-foreground">{trader.recentTrade.item}</span>
                    </div>
                    <span className={cn(
                      "font-semibold",
                      trader.recentTrade.pnl >= 0 ? "text-gain" : "text-loss"
                    )}>
                      {trader.recentTrade.pnl >= 0 ? '+' : ''}{formatPrice(trader.recentTrade.pnl)}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
        
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button variant="outline" className="gap-2" onClick={() => window.open('https://discord.gg/cardboom', '_blank')}>
            <MessageCircle className="w-4 h-4" />
            Community
          </Button>
          <Button className="gap-2" onClick={() => window.location.href = '/leaderboard'}>
            <TrendingUp className="w-4 h-4" />
            View Leaderboard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
