import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Zap, Check, X, ArrowRight, Sparkles, 
  DollarSign, Tag, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import type { AutoMatch } from '@/hooks/useAutoMatches';
import { generateListingUrl } from '@/lib/listingUrl';

interface AutoMatchNotificationProps {
  match: AutoMatch;
  onAccept: (matchId: string) => Promise<boolean>;
  onReject: (matchId: string) => Promise<boolean>;
  viewAs: 'buyer' | 'seller';
}

export const AutoMatchNotification = ({ 
  match, 
  onAccept, 
  onReject,
  viewAs 
}: AutoMatchNotificationProps) => {
  const navigate = useNavigate();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await onAccept(match.id);
      toast.success('Match accepted! Creating order...');
    } catch (error) {
      toast.error('Failed to accept match');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await onReject(match.id);
      toast.success('Match dismissed');
    } catch (error) {
      toast.error('Failed to dismiss match');
    } finally {
      setIsRejecting(false);
    }
  };

  const listing = match.listing;
  const buyOrder = match.buy_order;
  const otherParty = viewAs === 'buyer' 
    ? listing?.seller 
    : buyOrder?.buyer;

  const savings = buyOrder && listing 
    ? ((buyOrder.max_price - listing.price) / buyOrder.max_price * 100).toFixed(0)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', damping: 20 }}
    >
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-full bg-primary/20">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium">Auto-Match Found</span>
            <Badge 
              variant="secondary" 
              className={match.match_score >= 80 ? 'bg-gain/20 text-gain' : ''}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              {Math.round(match.match_score)}% match
            </Badge>
            {savings && Number(savings) > 0 && (
              <Badge variant="outline" className="text-gain border-gain/30">
                Save {savings}%
              </Badge>
            )}
          </div>

          {/* Match Details */}
          <div className="flex items-center gap-4">
            {/* Image */}
            <div className="w-20 h-20 rounded-lg bg-secondary/50 overflow-hidden flex-shrink-0">
              {listing?.image_url ? (
                <img 
                  src={listing.image_url} 
                  alt={listing.title}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Tag className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold line-clamp-1">
                {viewAs === 'buyer' ? listing?.title : buyOrder?.item_name}
              </h4>
              
              <div className="flex items-center gap-2 mt-1">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={otherParty?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {otherParty?.display_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground truncate">
                  {otherParty?.display_name || 'Unknown'}
                </span>
              </div>

              {/* Prices */}
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-bold text-lg">
                    ${listing?.price?.toFixed(2)}
                  </span>
                </div>
                {buyOrder && (
                  <span className="text-sm text-muted-foreground">
                    (max ${buyOrder.max_price.toFixed(2)})
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              {viewAs === 'seller' ? (
                <>
                  <Button 
                    size="sm" 
                    onClick={handleAccept}
                    disabled={isAccepting || isRejecting}
                    className="gap-1"
                  >
                    {isAccepting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Zap className="h-4 w-4" />
                      </motion.div>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Sell
                      </>
                    )}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={handleReject}
                    disabled={isAccepting || isRejecting}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    size="sm" 
                    onClick={() => navigate(`/listing/${match.listing_id}`)}
                    className="gap-1"
                  >
                    View <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={handleReject}
                    disabled={isRejecting}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              Found {new Date(match.created_at).toLocaleTimeString()}
            </span>
            {match.price_match_percent !== null && match.price_match_percent > 0 && (
              <>
                <span>•</span>
                <span className="text-gain">
                  {match.price_match_percent.toFixed(0)}% below max price
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
