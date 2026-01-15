import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Gavel, ShoppingCart, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import { generateListingUrl } from '@/lib/listingUrl';

interface Seller {
  id: string;
  listing_id: string;
  price: number;
  condition: string;
  seller_name: string;
  seller_avatar: string | null;
  is_verified: boolean;
}

interface Bid {
  id: string;
  bid_amount: number;
  max_bid: number | null;
  grade: string | null;
  bidder_name: string;
  bidder_avatar: string | null;
  expires_at: string | null;
}

interface ItemSellersAndBidsProps {
  itemId?: string;
  itemName: string;
  category?: string;
  compact?: boolean;
  className?: string;
}

export const ItemSellersAndBids = ({ 
  itemId, 
  itemName, 
  category,
  compact = false,
  className 
}: ItemSellersAndBidsProps) => {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch active listings (sellers) for this item
      const { data: listings } = await supabase
        .from('listings')
        .select(`
          id,
          price,
          condition,
          seller_id,
          profiles!listings_seller_id_fkey (
            display_name,
            avatar_url,
            is_verified_seller
          )
        `)
        .eq('status', 'active')
        .ilike('title', `%${itemName}%`)
        .order('price', { ascending: true })
        .limit(compact ? 3 : 10);

      if (listings) {
        setSellers(listings.map((l: any) => ({
          id: l.seller_id,
          listing_id: l.id,
          price: l.price,
          condition: l.condition,
          seller_name: l.profiles?.display_name || 'Unknown Seller',
          seller_avatar: l.profiles?.avatar_url,
          is_verified: l.profiles?.is_verified_seller || false,
        })));
      }

      // Fetch active bids for this item
      const bidQuery = supabase
        .from('bids')
        .select(`
          id,
          bid_amount,
          max_bid,
          grade,
          expires_at,
          user_id,
          profiles!bids_user_id_fkey (
            display_name,
            avatar_url
          )
        `)
        .eq('status', 'active')
        .ilike('item_name', `%${itemName}%`)
        .order('bid_amount', { ascending: false })
        .limit(compact ? 3 : 10);

      const { data: bidsData } = await bidQuery;

      if (bidsData) {
        setBids(bidsData.map((b: any) => ({
          id: b.id,
          bid_amount: b.bid_amount,
          max_bid: b.max_bid,
          grade: b.grade,
          bidder_name: b.profiles?.display_name || 'Anonymous',
          bidder_avatar: b.profiles?.avatar_url,
          expires_at: b.expires_at,
        })));
      }

      setLoading(false);
    };

    if (itemName) {
      fetchData();
    }
  }, [itemId, itemName, compact]);

  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const hasSellers = sellers.length > 0;
  const hasBids = bids.length > 0;

  if (!hasSellers && !hasBids) {
    return null;
  }

  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        {hasSellers && (
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">{sellers.length} seller{sellers.length !== 1 ? 's' : ''}</span>
            <span className="font-medium text-foreground">from {formatPrice(sellers[0].price)}</span>
          </div>
        )}
        {hasBids && (
          <div className="flex items-center gap-2 text-sm">
            <Gavel className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">{bids.length} bid{bids.length !== 1 ? 's' : ''}</span>
            <span className="font-medium text-primary">up to {formatPrice(bids[0].bid_amount)}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Sellers Section */}
      {hasSellers && (
        <Card className="border-border/50">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              Available from {sellers.length} seller{sellers.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-4 space-y-2">
            {sellers.map((seller) => (
              <a
                key={seller.listing_id}
                href={`/listing/${seller.listing_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={seller.seller_avatar || undefined} />
                    <AvatarFallback>{seller.seller_name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{seller.seller_name}</span>
                      {seller.is_verified && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 bg-primary/10 text-primary border-primary/30">
                          Verified
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{seller.condition}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{formatPrice(seller.price)}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </a>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Bids Section */}
      {hasBids && (
        <Card className="border-border/50">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gavel className="w-4 h-4 text-amber-500" />
              {bids.length} Active Bid{bids.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-4 space-y-2">
            {bids.map((bid) => (
              <div
                key={bid.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-amber-500/5 hover:bg-amber-500/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={bid.bidder_avatar || undefined} />
                    <AvatarFallback>{bid.bidder_name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-sm font-medium">{bid.bidder_name}</span>
                    {bid.grade && (
                      <Badge variant="outline" className="ml-2 text-[10px] px-1 py-0">
                        {bid.grade.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-amber-500">{formatPrice(bid.bid_amount)}</span>
                  {bid.max_bid && bid.max_bid > bid.bid_amount && (
                    <div className="text-xs text-muted-foreground">max: {formatPrice(bid.max_bid)}</div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
