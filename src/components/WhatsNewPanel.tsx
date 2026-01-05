import { useNavigate } from 'react-router-dom';
import { useListings } from '@/hooks/useMarketItems';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Clock, ShoppingCart, Award, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const getCountryFlag = (countryCode: string): string => {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

export function WhatsNewPanel() {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const { listings, isLoading } = useListings({ status: 'active', limit: 12 });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="glass rounded-xl p-3 space-y-2">
            <Skeleton className="aspect-square rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (!listings || listings.length === 0) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
        <h3 className="text-xl font-semibold text-foreground mb-2">No new listings yet</h3>
        <p className="text-muted-foreground mb-6">Be the first to list a card!</p>
        <Button onClick={() => navigate('/sell')}>Create Listing</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <span className="text-muted-foreground text-sm">
            {listings.length} new listing{listings.length !== 1 ? 's' : ''} recently added
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/markets?tab=forsale')}>
          View All
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {listings.slice(0, 8).map((listing) => (
          <div
            key={listing.id}
            onClick={() => navigate(`/listing/${listing.id}`)}
            className="glass rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all group"
          >
            {/* Image */}
            <div className="aspect-square relative overflow-hidden bg-secondary/50">
              {listing.image_url ? (
                <img 
                  src={listing.image_url} 
                  alt={listing.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <ShoppingCart className="w-10 h-10" />
                </div>
              )}
              
              {/* Grade Badge - Show grading info or Ungraded */}
              <div className="absolute top-2 right-2">
                {listing.grading_company === 'CardBoom' ? (
                  <Badge className="bg-primary text-primary-foreground gap-1">
                    <Award className="w-3 h-3" />
                    CB {listing.grade || 'Graded'}
                  </Badge>
                ) : listing.grading_company ? (
                  <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm gap-1">
                    <Award className="w-3 h-3" />
                    {listing.grading_company} {listing.grade}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-xs">
                    Ungraded
                  </Badge>
                )}
              </div>
              
              {/* Time Badge */}
              <div className="absolute bottom-2 left-2">
                <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
                </Badge>
              </div>
            </div>

            {/* Content */}
            <div className="p-3 space-y-2">
              <h3 className="font-medium text-sm text-foreground line-clamp-2 leading-tight">
                {listing.title}
              </h3>
              
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="text-base leading-none">
                  {getCountryFlag(listing.seller_country_code || 'TR')}
                </span>
                <span className="truncate">{listing.seller_username || 'Seller'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">
                  {formatPrice(listing.price)}
                </span>
                
                <Badge variant="outline" className={cn(
                  "text-xs",
                  listing.condition === 'Mint' || listing.condition === 'Gem Mint' || listing.condition === 'PSA 10'
                    ? "border-gold/50 text-gold"
                    : ""
                )}>
                  {listing.condition || 'NM'}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
