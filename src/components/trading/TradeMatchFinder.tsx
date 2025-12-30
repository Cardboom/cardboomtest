import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTradeMatching } from '@/hooks/useTradeMatching';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeftRight, Sparkles, RefreshCw, Star, 
  TrendingUp, AlertCircle, ChevronRight, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';

export const TradeMatchFinder = () => {
  const navigate = useNavigate();
  const { matches, loading, error, refetch } = useTradeMatching();
  const { formatPrice } = useCurrency();

  const perfectMatches = matches.filter(m => m.theyHave.length > 0 && m.theyWant.length > 0);
  const partialMatches = matches.filter(m => !(m.theyHave.length > 0 && m.theyWant.length > 0));

  if (loading) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="w-6 h-6 rounded" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-3 text-destructive mb-4">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
        <Button variant="outline" onClick={refetch} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Trade Matches</h2>
            <p className="text-muted-foreground text-sm">
              {matches.length} potential trades found
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={refetch}>
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </Button>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-8">
          <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">No trade matches found yet</p>
          <p className="text-muted-foreground text-sm mb-4">
            Add items to your portfolio and watchlist to find traders
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/portfolio')}>
              Add to Portfolio
            </Button>
            <Button onClick={() => navigate('/markets')}>
              Browse Cards
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Perfect Matches */}
          {perfectMatches.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Perfect Matches</span>
                <Badge className="bg-primary/20 text-primary text-xs">{perfectMatches.length}</Badge>
              </div>
              <div className="space-y-3">
                {perfectMatches.slice(0, 5).map(match => (
                  <MatchCard key={match.userId} match={match} formatPrice={formatPrice} />
                ))}
              </div>
            </div>
          )}

          {/* Partial Matches */}
          {partialMatches.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Partial Matches</span>
                <Badge variant="secondary" className="text-xs">{partialMatches.length}</Badge>
              </div>
              <div className="space-y-3">
                {partialMatches.slice(0, 5).map(match => (
                  <MatchCard key={match.userId} match={match} formatPrice={formatPrice} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface MatchCardProps {
  match: {
    userId: string;
    username: string;
    avatarUrl: string | null;
    matchScore: number;
    theyHave: { id: string; name: string; imageUrl: string | null; currentPrice: number }[];
    theyWant: { id: string; name: string; imageUrl: string | null; currentPrice: number }[];
    totalValueTheyOffer: number;
    totalValueYouOffer: number;
    valueDifference: number;
  };
  formatPrice: (price: number) => string;
}

const MatchCard = ({ match, formatPrice }: MatchCardProps) => {
  const navigate = useNavigate();
  const isPerfectMatch = match.theyHave.length > 0 && match.theyWant.length > 0;

  return (
    <div 
      className={cn(
        "rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.01]",
        isPerfectMatch 
          ? "bg-primary/5 border border-primary/20 hover:border-primary/40" 
          : "bg-secondary/50 border border-border/50 hover:border-border"
      )}
      onClick={() => navigate(`/profile/${match.userId}`)}
    >
      <div className="flex items-start gap-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={match.avatarUrl || undefined} />
          <AvatarFallback>{match.username.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-foreground">{match.username}</span>
            {isPerfectMatch && (
              <Badge className="bg-primary/20 text-primary text-xs gap-1">
                <Star className="w-3 h-3" />
                Perfect
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            {/* They Have */}
            {match.theyHave.length > 0 && (
              <div>
                <p className="text-muted-foreground text-xs mb-1">They have (you want)</p>
                <div className="space-y-1">
                  {match.theyHave.slice(0, 2).map(item => (
                    <p key={item.id} className="text-foreground truncate">{item.name}</p>
                  ))}
                  {match.theyHave.length > 2 && (
                    <p className="text-muted-foreground">+{match.theyHave.length - 2} more</p>
                  )}
                </div>
                <p className="text-primary font-medium mt-1">
                  {formatPrice(match.totalValueTheyOffer)}
                </p>
              </div>
            )}

            {/* They Want */}
            {match.theyWant.length > 0 && (
              <div>
                <p className="text-muted-foreground text-xs mb-1">They want (you have)</p>
                <div className="space-y-1">
                  {match.theyWant.slice(0, 2).map(item => (
                    <p key={item.id} className="text-foreground truncate">{item.name}</p>
                  ))}
                  {match.theyWant.length > 2 && (
                    <p className="text-muted-foreground">+{match.theyWant.length - 2} more</p>
                  )}
                </div>
                <p className="text-foreground font-medium mt-1">
                  {formatPrice(match.totalValueYouOffer)}
                </p>
              </div>
            )}
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
      </div>
    </div>
  );
};

export default TradeMatchFinder;
