import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Vault, Truck, ArrowLeftRight, MessageCircle, ShoppingCart, Award, Info, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCurrency } from '@/contexts/CurrencyContext';

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
  seller_name?: string;
  seller_country_code?: string;
  // Grading fields
  certification_status?: string | null;
  grading_order_id?: string | null;
  grade?: string | null;
  // Market info
  market_item_id?: string | null;
  source?: string | null;
}

const getCountryFlag = (countryCode: string): string => {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

interface ListingsTableProps {
  category?: string;
  search?: string;
}

export const ListingsTable = ({ category, search }: ListingsTableProps) => {
  const navigate = useNavigate();
  const { formatPrice: formatCurrency } = useCurrency();
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
        .select('id, title, description, category, condition, price, status, allows_vault, allows_trade, allows_shipping, created_at, seller_id, image_url, certification_status, grading_order_id, market_item_id, source')
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
      
      // Fetch seller profiles for location data
      const sellerIds = [...new Set((data || []).map(l => l.seller_id))];
      let profileMap = new Map<string, { display_name: string; country_code: string }>();
      
      if (sellerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('public_profiles')
          .select('id, display_name, country_code')
          .in('id', sellerIds);
        
        profileMap = new Map(profiles?.map(p => [p.id, { 
          display_name: p.display_name || 'Seller', 
          country_code: p.country_code || 'TR' 
        }]) || []);
      }

      // Fetch grading orders for grade info
      const gradingOrderIds = (data || [])
        .filter(l => l.grading_order_id)
        .map(l => l.grading_order_id!);

      let gradeMap = new Map<string, string>();
      if (gradingOrderIds.length > 0) {
        const { data: gradingOrders } = await supabase
          .from('grading_orders')
          .select('id, cbgi_score_0_100')
          .in('id', gradingOrderIds);

        gradingOrders?.forEach(go => {
          if (go.cbgi_score_0_100) {
            gradeMap.set(go.id, (go.cbgi_score_0_100 / 10).toFixed(1));
          }
        });
      }
      
      // Enrich listings with seller info and grade
      const enrichedListings = (data || []).map(listing => {
        const profile = profileMap.get(listing.seller_id);
        const grade = listing.grading_order_id 
          ? gradeMap.get(listing.grading_order_id) || null
          : null;

        return {
          ...listing,
          seller_name: profile?.display_name || 'Seller',
          seller_country_code: profile?.country_code || 'TR',
          grade,
        };
      });

      // Sort: Real user listings first (no external source), then external
      enrichedListings.sort((a, b) => {
        const aIsReal = !a.source || a.source === 'user';
        const bIsReal = !b.source || b.source === 'user';
        if (aIsReal && !bIsReal) return -1;
        if (!aIsReal && bIsReal) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      setListings(enrichedListings);
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return formatCurrency(price);
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      nba: 'NBA',
      football: 'Football',
      tcg: 'TCG',
      figures: 'Figures',
      pokemon: 'Pokémon',
      'one-piece': 'One Piece',
      'lol-riftbound': 'Riftbound',
    };
    return labels[cat] || cat.replace(/-/g, ' ').toUpperCase();
  };

  // Render grade badge
  const renderGradeBadge = (listing: Listing) => {
    // CardBoom graded
    if (listing.certification_status === 'completed' && listing.grade) {
      return (
        <Badge className="bg-primary text-primary-foreground gap-1">
          <Award className="h-3 w-3" />
          CB {listing.grade}
        </Badge>
      );
    }
    // Grading pending
    if (listing.certification_status === 'pending') {
      return (
        <Badge variant="outline" className="text-amber-500 border-amber-500/30">
          Grading...
        </Badge>
      );
    }
    // External/info only card
    if (listing.source && listing.source !== 'user') {
      return (
        <Badge variant="outline" className="text-muted-foreground gap-1">
          <Info className="h-3 w-3" />
          Info Only
        </Badge>
      );
    }
    // Regular ungraded
    return <span className="text-xs text-muted-foreground">N/A</span>;
  };

  // Check if listing has real sellers
  const isRealListing = (listing: Listing) => {
    return !listing.source || listing.source === 'user';
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
        <div className="col-span-1">Grade</div>
        <div className="col-span-2 text-right">Price</div>
        <div className="col-span-1">Options</div>
        <div className="col-span-1"></div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-border/30">
        {listings.map((listing, index) => {
          const isReal = isRealListing(listing);
          
          return (
            <div
              key={listing.id}
              onClick={() => navigate(`/listing/${listing.id}`)}
              className={cn(
                "grid grid-cols-12 gap-4 p-3 items-center hover:bg-secondary/30 transition-colors cursor-pointer",
                !isReal && "opacity-75"
              )}
            >
              {/* Rank */}
              <div className="col-span-1 text-muted-foreground text-sm font-medium">
                {index + 1}
              </div>

              {/* Item Info */}
              <div className="col-span-12 lg:col-span-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden shrink-0 relative">
                  {listing.image_url ? (
                    <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ShoppingCart className="w-6 h-6" />
                    </div>
                  )}
                  {/* Real seller indicator */}
                  {isReal && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Users className="w-2.5 h-2.5 text-white" />
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
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    {isReal ? (
                      <>
                        <span className="text-base leading-none" title={listing.seller_country_code}>
                          {getCountryFlag(listing.seller_country_code || 'TR')}
                        </span>
                        <span>{listing.seller_name}</span>
                      </>
                    ) : (
                      <span className="text-amber-500 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        No Sellers
                      </span>
                    )}
                    <span>•</span>
                    <span>Listed {new Date(listing.created_at).toLocaleDateString()}</span>
                  </div>
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

              {/* Grade */}
              <div className="hidden lg:block col-span-1">
                {renderGradeBadge(listing)}
              </div>

              {/* Price */}
              <div className="hidden lg:block col-span-2 text-right">
                <p className="text-foreground font-bold text-lg">{formatPrice(listing.price)}</p>
              </div>

              {/* Delivery Options */}
              <div className="hidden lg:flex col-span-1 justify-center gap-1">
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
                {isReal && currentUserId !== listing.seller_id && (
                  <>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    <Button variant="default" size="sm" className="h-8">
                      Buy
                    </Button>
                  </>
                )}
                {!isReal && (
                  <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                    Info Only
                  </Badge>
                )}
                {isReal && currentUserId === listing.seller_id && (
                  <Badge className="bg-primary/20 text-primary">Your listing</Badge>
                )}
              </div>

              {/* Mobile Layout */}
              <div className="col-span-12 lg:hidden flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {getCategoryLabel(listing.category)}
                  </Badge>
                  {renderGradeBadge(listing)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-bold">{formatPrice(listing.price)}</span>
                  {isReal && currentUserId !== listing.seller_id && (
                    <Button variant="default" size="sm">Buy</Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
