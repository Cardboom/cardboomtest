import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Vault, Truck, ArrowLeftRight, MessageCircle, ShoppingCart, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Listing {
  id: string;
  title: string;
  description: string | null;
  category: string;
  condition: string;
  price: number;
  status: string;
  allows_vault: boolean;
  allows_trade: boolean;
  allows_shipping: boolean;
  created_at: string;
  seller_id: string;
  image_url: string | null;
}

interface ListingsTableProps {
  category?: string;
  search?: string;
}

export const ListingsTable = ({ category, search }: ListingsTableProps) => {
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchListings();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, [category, search]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      if (search) {
        query = query.ilike('title', `%${search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`;
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`;
    return `$${price.toLocaleString()}`;
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      nba: 'NBA',
      football: 'Football',
      tcg: 'TCG',
      figures: 'Figures',
    };
    return labels[cat] || cat.toUpperCase();
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <div className="animate-pulse text-muted-foreground">Loading listings...</div>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
        <h2 className="text-xl font-semibold text-foreground mb-2">No listings yet</h2>
        <p className="text-muted-foreground mb-6">
          Be the first to list something for sale!
        </p>
        <Button onClick={() => navigate('/sell')}>
          Create Listing
        </Button>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Table Header */}
      <div className="hidden lg:grid grid-cols-12 gap-4 p-3 bg-secondary/50 text-muted-foreground text-sm font-medium border-b border-border/50">
        <div className="col-span-1">#</div>
        <div className="col-span-4">Item</div>
        <div className="col-span-1">Category</div>
        <div className="col-span-1">Condition</div>
        <div className="col-span-2 text-right">Price</div>
        <div className="col-span-2 text-center">Options</div>
        <div className="col-span-1"></div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-border/30">
        {listings.map((listing, index) => (
          <div
            key={listing.id}
            className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-secondary/30 transition-colors"
          >
            {/* Rank */}
            <div className="col-span-1 text-muted-foreground text-sm font-medium">
              {index + 1}
            </div>

            {/* Item Info */}
            <div className="col-span-12 lg:col-span-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden shrink-0">
                {listing.image_url ? (
                  <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-foreground font-medium text-sm truncate">{listing.title}</p>
                {listing.description && (
                  <p className="text-muted-foreground text-xs truncate max-w-[200px]">
                    {listing.description}
                  </p>
                )}
                <p className="text-muted-foreground text-xs">
                  Listed {new Date(listing.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Category */}
            <div className="hidden lg:block col-span-1">
              <Badge variant="outline" className="text-xs">
                {getCategoryLabel(listing.category)}
              </Badge>
            </div>

            {/* Condition */}
            <div className="hidden lg:block col-span-1">
              <span className="text-sm text-muted-foreground">{listing.condition}</span>
            </div>

            {/* Price */}
            <div className="hidden lg:block col-span-2 text-right">
              <p className="text-foreground font-bold text-lg">{formatPrice(listing.price)}</p>
            </div>

            {/* Delivery Options */}
            <div className="hidden lg:flex col-span-2 justify-center gap-1">
              {listing.allows_vault && (
                <Badge variant="outline" className="text-xs px-1.5">
                  <Vault className="h-3 w-3" />
                </Badge>
              )}
              {listing.allows_trade && (
                <Badge variant="outline" className="text-xs px-1.5">
                  <ArrowLeftRight className="h-3 w-3" />
                </Badge>
              )}
              {listing.allows_shipping && (
                <Badge variant="outline" className="text-xs px-1.5">
                  <Truck className="h-3 w-3" />
                </Badge>
              )}
            </div>

            {/* Actions */}
            <div className="hidden lg:flex col-span-1 justify-end gap-1">
              {currentUserId !== listing.seller_id && (
                <>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                  <Button variant="default" size="sm" className="h-8">
                    Buy
                  </Button>
                </>
              )}
              {currentUserId === listing.seller_id && (
                <Badge className="bg-primary/20 text-primary">Your listing</Badge>
              )}
            </div>

            {/* Mobile Layout */}
            <div className="col-span-12 lg:hidden flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {getCategoryLabel(listing.category)}
                </Badge>
                <span className="text-xs text-muted-foreground">{listing.condition}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-foreground font-bold">{formatPrice(listing.price)}</span>
                {currentUserId !== listing.seller_id && (
                  <Button variant="default" size="sm">Buy</Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
