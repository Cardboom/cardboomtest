import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShoppingCart, User } from 'lucide-react';
import { useCatalogCardListings } from '@/hooks/useCatalogCard';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Link } from 'react-router-dom';

interface CatalogCardListingsProps {
  catalogCardId: string;
}

export const CatalogCardListings = ({ catalogCardId }: CatalogCardListingsProps) => {
  const { data: listings, isLoading } = useCatalogCardListings(catalogCardId);
  const { formatPrice } = useCurrency();

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Active Listings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!listings?.length) {
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Active Listings</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No listings available</p>
          <p className="text-sm text-muted-foreground mt-1">
            Be the first to list this card
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Active Listings</CardTitle>
        <Badge variant="secondary">{listings.length}</Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {listings.map((item: any) => {
            const listing = item.listings;
            const seller = listing?.profiles;
            
            return (
              <Link
                key={item.listing_id}
                to={`/listing/${item.listing_id}`}
                className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <img
                  src={listing?.image_url || '/placeholder.svg'}
                  alt={listing?.title}
                  className="w-16 h-16 object-cover rounded-md"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{listing?.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {listing?.condition && (
                      <Badge variant="outline" className="text-xs">
                        {listing.condition}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={seller?.avatar_url} />
                      <AvatarFallback>
                        <User className="w-3 h-3" />
                      </AvatarFallback>
                    </Avatar>
                    <span>{seller?.display_name || 'Seller'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl font-bold">
                    {formatPrice(listing?.price || 0)}
                  </p>
                  <Button size="sm" className="mt-2">
                    View
                  </Button>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
