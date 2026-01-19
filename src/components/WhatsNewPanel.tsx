import { useNavigate } from 'react-router-dom';
import { useListings } from '@/hooks/useMarketItems';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GradeBadge } from '@/components/ui/grade-badge';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Clock, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { generateListingUrl } from '@/lib/listingUrl';
import { getThumbnailUrl } from '@/lib/imageUtils';

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
      <div className="glass rounded-xl p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-primary/10 animate-pulse">
            <ShoppingCart className="h-12 w-12 text-primary" />
          </div>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No new listings yet</h3>
          <p className="text-muted-foreground mb-4">Be the first to list a card and earn rewards!</p>
        </div>
        
        {/* Popular categories to browse */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Browse popular categories:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {['Pokemon', 'Yu-Gi-Oh!', 'One Piece', 'NBA', 'Magic: The Gathering'].map((cat) => (
              <Button 
                key={cat}
                variant="outline" 
                size="sm"
                onClick={() => navigate(`/catalog?category=${cat.toLowerCase().replace(/[^a-z0-9]/g, '')}`)}
                className="text-xs"
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate('/sell')} className="gap-2">
            <ShoppingCart className="w-4 h-4" />
            List Your First Card
          </Button>
          <Button variant="outline" onClick={() => navigate('/catalog')}>
            Browse Catalog
          </Button>
        </div>
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
            onClick={() => navigate(generateListingUrl({ id: listing.id, category: listing.category, slug: (listing as any).slug, title: listing.title }))}
            className="glass rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all group block"
          >
            {/* Image with mini pedestal effect */}
            <div className="aspect-[3/4] relative overflow-hidden bg-gradient-to-b from-muted/30 to-muted/10 flex items-center justify-center">
              {/* Subtle ambient glow on hover */}
              <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {listing.image_url ? (
                <div className="relative flex-1 w-full flex items-center justify-center p-2">
                  <img 
                    src={getThumbnailUrl(listing.image_url)} 
                    alt={listing.title}
                    width={300}
                    height={400}
                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="flex-1 w-full flex items-center justify-center text-muted-foreground">
                  <ShoppingCart className="w-10 h-10" />
                </div>
              )}
              
              {/* Subtle bottom gradient */}
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background/50 to-transparent" />
              
              {/* Grade Badge - Show grading info or Ungraded */}
              <div className="absolute top-2 right-2">
                <GradeBadge 
                  gradingCompany={listing.grading_company}
                  grade={listing.grade}
                  certificationStatus={listing.certification_status}
                />
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
              
              {listing.set_name && (
                <p className="text-xs text-muted-foreground truncate">
                  {listing.set_name}
                </p>
              )}
              
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
