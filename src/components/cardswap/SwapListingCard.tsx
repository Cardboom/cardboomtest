import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getCategoryLabel } from '@/lib/categoryLabels';
import { 
  Plug, 
  DollarSign, 
  Clock, 
  Eye, 
  User,
  ChevronRight,
  ArrowLeftRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SwapListingCardProps {
  listing: {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    image_url: string | null;
    category: string;
    condition: string;
    grade: string | null;
    grading_company: string | null;
    estimated_value: number | null;
    looking_for: string | null;
    accept_cash_offers: boolean;
    min_cash_addon: number | null;
    views_count: number;
    created_at: string;
  };
  onMakeOffer: () => void;
  isOwner: boolean;
  formatPrice: (value: number) => string;
  index: number;
}

export const SwapListingCard = ({ 
  listing, 
  onMakeOffer, 
  isOwner, 
  formatPrice,
  index 
}: SwapListingCardProps) => {
  const conditionColors: Record<string, string> = {
    mint: 'bg-emerald-500/10 text-emerald-500',
    near_mint: 'bg-green-500/10 text-green-500',
    excellent: 'bg-blue-500/10 text-blue-500',
    good: 'bg-amber-500/10 text-amber-500',
    played: 'bg-orange-500/10 text-orange-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
      className="relative bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all group"
    >
      <div className="flex flex-col md:flex-row">
        {/* Left Side - Card Image */}
        <div className="relative w-full md:w-48 h-48 md:h-auto flex-shrink-0">
          {listing.image_url ? (
            <img
              src={listing.image_url}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <ArrowLeftRight className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          
          {/* Category Badge */}
          <Badge className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm">
            {getCategoryLabel(listing.category)}
          </Badge>

          {/* Graded Badge */}
          {listing.grade && (
            <Badge className="absolute top-2 right-2 bg-premium/90 text-premium-foreground">
              {listing.grading_company} {listing.grade}
            </Badge>
          )}
        </div>

        {/* Middle Section - Card Details */}
        <div className="flex-1 p-4 md:p-5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h3 className="font-semibold text-foreground text-lg line-clamp-1 group-hover:text-primary transition-colors">
                {listing.title}
              </h3>
              <span className="text-sm text-muted-foreground mt-1">
                Listed by Collector
              </span>
            </div>
            
            {listing.estimated_value && (
              <div className="text-right">
                <span className="text-xs text-muted-foreground">Est. Value</span>
                <p className="font-semibold text-foreground">
                  {formatPrice(listing.estimated_value)}
                </p>
              </div>
            )}
          </div>

          {/* Condition & Meta */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="outline" className={conditionColors[listing.condition] || ''}>
              {listing.condition.replace('_', ' ')}
            </Badge>
            
            {listing.accept_cash_offers && (
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                <DollarSign className="w-3 h-3 mr-1" />
                Accepts Cash
              </Badge>
            )}
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
              <Eye className="w-3 h-3" />
              {listing.views_count}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
            </div>
          </div>

          {/* Looking For */}
          {listing.looking_for && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              <span className="text-foreground font-medium">Looking for:</span> {listing.looking_for}
            </p>
          )}
        </div>

        {/* Right Side - CTA with Plug Icon */}
        <div className="relative flex items-center p-4 md:p-0 border-t md:border-t-0 md:border-l border-border bg-muted/30 md:w-32">
          {/* Connector Line Visual */}
          <div className="hidden md:block absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center w-full gap-2 md:px-4">
            <Plug className="w-6 h-6 text-primary hidden md:block" />
            
            {isOwner ? (
              <Badge variant="secondary" className="text-xs">
                Your Listing
              </Badge>
            ) : (
              <Button 
                onClick={onMakeOffer}
                size="sm"
                className="w-full md:w-auto gap-1"
              >
                <span className="md:hidden">Make Offer</span>
                <span className="hidden md:inline text-xs">Offer</span>
                <ChevronRight className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
