import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, ShoppingCart, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';

interface RelatedListingsProps {
  marketItemId: string;
  cardName: string;
  category: string;
  currentListingId?: string; // Exclude this listing from results
}

export const RelatedListings = ({ 
  marketItemId, 
  cardName, 
  category,
  currentListingId 
}: RelatedListingsProps) => {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();

  const { data: listings, isLoading } = useQuery({
    queryKey: ['related-listings', marketItemId, cardName],
    queryFn: async () => {
      // First try to find listings by market_item_id
      let query = supabase
        .from('listings')
        .select('id, title, price, condition, image_url, seller_id, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (marketItemId) {
        query = query.eq('market_item_id', marketItemId);
      } else {
        // Fallback to title match
        query = query.ilike('title', `%${cardName.split(' ').slice(0, 3).join('%')}%`);
      }

      if (currentListingId) {
        query = query.neq('id', currentListingId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch seller profiles
      const sellerIds = [...new Set(data?.map(l => l.seller_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', sellerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data?.map(listing => ({
        ...listing,
        seller: profileMap.get(listing.seller_id) || { display_name: 'Seller', avatar_url: null }
      })) || [];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5" />
            Other Sellers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!listings || listings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5" />
            Other Sellers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-6">
            No other listings for this card yet. Be the first!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5" />
          Other Sellers ({listings.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {listings.map(listing => (
          <div 
            key={listing.id}
            onClick={() => navigate(`/listing/${listing.id}`)}
            className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors group"
          >
            {/* Card Image */}
            <div className="w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
              {listing.image_url ? (
                <img 
                  src={listing.image_url} 
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Seller & Condition */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={listing.seller?.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {listing.seller?.display_name?.charAt(0) || 'S'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium truncate">
                  {listing.seller?.display_name || 'Seller'}
                </span>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {listing.condition?.replace('_', ' ')}
              </Badge>
            </div>

            {/* Price */}
            <div className="text-right">
              <p className="font-bold text-foreground">
                {formatPrice(listing.price || 0)}
              </p>
              <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
