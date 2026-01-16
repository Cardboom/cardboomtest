import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GradeBadge } from '@/components/ui/grade-badge';
import { Vault, Truck, ArrowLeftRight, MessageCircle, ShoppingCart, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useUnifiedPricing } from '@/hooks/useUnifiedPricing';
import { generateListingUrl } from '@/lib/listingUrl';
import { formatCategoryName } from '@/lib/categoryFormatter';

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
  // Grading fields from listings table
  certification_status?: string | null;
  grading_order_id?: string | null;
  grading_company?: string | null;
  grade?: string | null;
  cbgi_score?: number | null;
  cbgi_grade_label?: string | null;
  // Market info
  market_item_id?: string | null;
  source?: string | null;
  // SEO
  slug?: string | null;
  set_name?: string | null;
  card_number?: string | null;
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
  const { formatPriceWithSymbol } = useUnifiedPricing();
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
        .select('id, title, description, category, condition, price, status, allows_vault, allows_trade, allows_shipping, created_at, seller_id, image_url, certification_status, grading_order_id, market_item_id, source, grading_company, grade, cbgi_score, cbgi_grade_label, slug')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (category && category !== 'all') {
        // Handle category name variations (one-piece vs onepiece, etc.)
        const categoryVariants = [category];
        if (category === 'one-piece') categoryVariants.push('onepiece');
        if (category === 'onepiece') categoryVariants.push('one-piece');
        if (category === 'gaming') categoryVariants.push('videogames');
        if (category === 'videogames') categoryVariants.push('gaming');
        
        query = query.in('category', categoryVariants);
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

      // Fetch grading orders for grade info - both by ID and for fallback matching
      const gradingOrderIds = (data || [])
        .filter(l => l.grading_order_id)
        .map(l => l.grading_order_id!);

      let gradeMap = new Map<string, { grade: string | null; status: string }>();
      
      // Fetch all completed grading orders for fallback matching (reuse sellerIds from above)
      const { data: allGradingOrders } = await supabase
        .from('grading_orders')
        .select('id, card_name, cbgi_score_0_100, status, user_id, listing_created_id')
        .in('user_id', sellerIds)
        .eq('status', 'completed');

      // Build grade map by ID
      if (gradingOrderIds.length > 0) {
        const { data: gradingOrders } = await supabase
          .from('grading_orders')
          .select('id, cbgi_score_0_100, status')
          .in('id', gradingOrderIds);

        gradingOrders?.forEach(go => {
          let grade: string | null = null;
          if (go.cbgi_score_0_100) {
            // Normalize: if > 10, it's 0-100 scale, divide by 10
            const score = go.cbgi_score_0_100 > 10 ? go.cbgi_score_0_100 / 10 : go.cbgi_score_0_100;
            grade = score.toFixed(1);
          }
          gradeMap.set(go.id, { grade, status: go.status });
        });
      }

      // Helper function for fuzzy name matching
      const normalizeCardName = (name: string | null): string => {
        if (!name) return '';
        return name.toLowerCase().replace(/[^a-z0-9]/g, '');
      };
      
      // Enrich listings with seller info and grade
      const enrichedListings = (data || []).map(listing => {
        const profile = profileMap.get(listing.seller_id);
        
        // Priority 1: Use listing's direct grading fields (grading_company + grade)
        if (listing.grading_company && listing.grade) {
          return {
            ...listing,
            seller_name: profile?.display_name || 'Seller',
            seller_country_code: profile?.country_code || 'TR',
            // Already has grading_company and grade from listing
          };
        }

        // Priority 2: Use listing's cbgi_score if available (CardBoom grading)
        if (listing.cbgi_score) {
          const score = listing.cbgi_score > 10 ? listing.cbgi_score / 10 : listing.cbgi_score;
          return {
            ...listing,
            seller_name: profile?.display_name || 'Seller',
            seller_country_code: profile?.country_code || 'TR',
            grading_company: 'CardBoom',
            grade: score.toFixed(1),
          };
        }

        // Priority 3: Check grading_orders by grading_order_id
        let gradingInfo = listing.grading_order_id 
          ? gradeMap.get(listing.grading_order_id) 
          : null;

        // Priority 4: Fallback - match by seller and card name from completed grading orders
        if (!gradingInfo && allGradingOrders && listing.title) {
          const normalizedTitle = normalizeCardName(listing.title);
          const matchingOrder = allGradingOrders.find(go => 
            go.user_id === listing.seller_id && 
            go.status === 'completed' &&
            go.cbgi_score_0_100 &&
            (go.listing_created_id === listing.id || normalizeCardName(go.card_name) === normalizedTitle)
          );
          
          if (matchingOrder && matchingOrder.cbgi_score_0_100) {
            const score = matchingOrder.cbgi_score_0_100 > 10 
              ? matchingOrder.cbgi_score_0_100 / 10 
              : matchingOrder.cbgi_score_0_100;
            gradingInfo = { grade: score.toFixed(1), status: 'completed' };
          }
        }

        // Determine grading display values from grading_orders
        let gradingCompany: string | null = null;
        let grade: string | null = null;
        
        if (gradingInfo) {
          if (gradingInfo.status === 'completed' && gradingInfo.grade) {
            gradingCompany = 'CardBoom';
            grade = gradingInfo.grade;
          } else if (['pending', 'queued', 'processing', 'in_review'].includes(gradingInfo.status)) {
            gradingCompany = 'CardBoom';
            grade = 'Pending';
          }
        }

        return {
          ...listing,
          seller_name: profile?.display_name || 'Seller',
          seller_country_code: profile?.country_code || 'TR',
          grading_company: gradingCompany,
          grade,
        };
      });

      // ONLY show real user listings - filter out external/placeholder listings
      const userOnlyListings = enrichedListings.filter(l => !l.source || l.source === 'user');
      
      // Sort by newest first
      userOnlyListings.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setListings(userOnlyListings);
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return formatPriceWithSymbol(price);
  };

  const getCategoryLabel = (cat: string) => {
    return formatCategoryName(cat);
  };

  // Render grade badge using unified component
  const renderGradeBadge = (listing: Listing) => {
    return (
      <GradeBadge
        gradingCompany={listing.grading_company}
        grade={listing.grade}
        certificationStatus={listing.certification_status}
      />
    );
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
        {listings.map((listing, index) => (
            <div
              key={listing.id}
              onClick={() => navigate(generateListingUrl({ id: listing.id, category: listing.category, slug: listing.slug, title: listing.title }))}
              className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-secondary/30 transition-colors cursor-pointer"
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
                  {/* Verified seller indicator */}
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Users className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-foreground font-medium text-sm truncate">{listing.title}</p>
                  {listing.description && (
                    <p className="text-muted-foreground text-xs truncate max-w-[200px]">
                      {listing.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <span className="text-base leading-none" title={listing.seller_country_code}>
                      {getCountryFlag(listing.seller_country_code || 'TR')}
                    </span>
                    <span>{listing.seller_name}</span>
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
                  {renderGradeBadge(listing)}
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
