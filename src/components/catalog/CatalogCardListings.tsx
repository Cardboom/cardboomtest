import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShoppingCart, User, AlertCircle, TestTube2 } from 'lucide-react';
import { useCatalogCardListings, useCatalogCardMappings, type CatalogListing } from '@/hooks/useCatalogCard';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Link } from 'react-router-dom';
import { resolveCardPageImage } from '@/lib/catalogImageResolver';

interface CatalogCardListingsProps {
  catalogCardId: string;
}

export const CatalogCardListings = ({ catalogCardId }: CatalogCardListingsProps) => {
  const { data: listings, isLoading, error } = useCatalogCardListings(catalogCardId);
  const { data: mappings } = useCatalogCardMappings(catalogCardId);
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

  // Debug: Show mapping info if no listings found but mappings exist
  const hasNoListings = !listings || listings.length === 0;
  const hasMappings = mappings && mappings.count > 0;
  
  // Check if all listings are samples
  const allSamples = listings?.every((l: any) => l.is_sample) ?? false;

  if (hasNoListings) {
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Active Listings</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No active listings available</p>
          <p className="text-sm text-muted-foreground mt-1">
            Be the first to list this card
          </p>
          {/* Debug info for admin */}
          {hasMappings && (
            <div className="mt-4 p-3 bg-muted/50 rounded text-xs text-muted-foreground">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              {mappings.count} market items mapped, but no active listings found
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">Active Listings</CardTitle>
          {allSamples && (
            <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground/30">
              <TestTube2 className="w-3 h-3 mr-1" />
              Demo
            </Badge>
          )}
        </div>
        <Badge variant="secondary">{listings.length}</Badge>
      </CardHeader>
      <CardContent>
        {allSamples && (
          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
            <TestTube2 className="w-3 h-3" />
            These are sample listings for demonstration purposes
          </p>
        )}
        <div className="space-y-3">
          {listings.map((item: any) => (
            <Link
              key={item.listing_id}
              to={`/listing/${item.listing_id}`}
              className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <img
                src={resolveCardPageImage(item.image_url, null, item.category)}
                alt={item.title}
                className="w-16 h-16 object-cover rounded-md"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate flex items-center gap-2">
                  {item.title}
                  {item.is_sample && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-muted-foreground border-muted-foreground/30">
                      Sample
                    </Badge>
                  )}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {item.condition && (
                    <Badge variant="outline" className="text-xs">
                      {item.condition}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={item.seller_avatar || undefined} />
                    <AvatarFallback>
                      <User className="w-3 h-3" />
                    </AvatarFallback>
                  </Avatar>
                  <span>{item.seller_name || 'Seller'}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-display text-xl font-bold">
                  {formatPrice(item.price || 0)}
                </p>
                <Button size="sm" className="mt-2">
                  View
                </Button>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
