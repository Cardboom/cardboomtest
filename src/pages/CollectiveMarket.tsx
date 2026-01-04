import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Search, Users, Shield, Vote,
  Clock, Filter, ArrowUpDown, Layers, Star, Sparkles, Trophy
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/contexts/CurrencyContext';
import { CollectiveJoinDialog } from '@/components/collective/CollectiveJoinDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CollectiveListing = {
  id: string;
  share_price: number;
  total_shares: number;
  available_shares: number;
  min_shares: number;
  status: string;
  daily_verification_required: boolean;
  last_verified_at: string | null;
  owner_id: string;
  created_at: string;
  listing?: {
    title: string;
    image_url: string | null;
    price: number;
    category: string;
  } | null;
  market_item?: {
    name: string;
    image_url: string | null;
    current_price: number;
    category: string;
  } | null;
};

const CollectiveMarket = () => {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [cartItems, setCartItems] = useState([]);
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const { data: collectiveListings, isLoading } = useQuery({
    queryKey: ['collective-market', sortBy, filterCategory],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fractional_listings')
        .select(`
          *,
          listing:listings(title, image_url, price, category),
          market_item:market_items(name, image_url, current_price, category)
        `)
        .eq('status', 'active')
        .gt('available_shares', 0);

      if (error) throw error;
      return data as CollectiveListing[];
    },
  });

  const { data: myParticipation } = useQuery({
    queryKey: ['my-collective-participation', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('fractional_ownership')
        .select(`
          *,
          fractional_listing:fractional_listings(
            *,
            listing:listings(title, image_url, price),
            market_item:market_items(name, image_url, current_price)
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const totalListings = collectiveListings?.length || 0;
  const myTotalUnits = myParticipation?.reduce((sum, h) => sum + h.shares_owned, 0) || 0;

  const filteredListings = collectiveListings?.filter(listing => {
    const name = listing.listing?.title || listing.market_item?.name || '';
    const category = listing.listing?.category || listing.market_item?.category || '';
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || category.toLowerCase() === filterCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'price-low': return a.share_price - b.share_price;
      case 'price-high': return b.share_price - a.share_price;
      case 'popular': return (b.total_shares - b.available_shares) - (a.total_shares - a.available_shares);
      default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  }) || [];

  const categories = ['all', 'pokemon', 'sports', 'tcg', 'art', 'gaming'];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>CardBoom COLLECTIVE™ | Community Participation in Premium Collectibles</title>
        <meta name="description" content="Join the CardBoom COLLECTIVE™ community. Participate in premium trading cards and collectibles with voting rights, XP rewards, and exclusive community access." />
        <link rel="canonical" href="https://cardboom.com/collective" />
      </Helmet>
      <Header cartCount={cartItems.length} onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-primary" />
              CardBoom COLLECTIVE™
            </h1>
            <p className="text-muted-foreground">Join communities around premium collectibles</p>
          </div>
        </div>

        <Card className="mb-6 bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2"><Vote className="h-5 w-5 text-primary" /><span>Community voting rights</span></div>
              <div className="flex items-center gap-2"><Star className="h-5 w-5 text-primary" /><span>XP & badge eligibility</span></div>
              <div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><span>Exclusive community access</span></div>
              <div className="flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /><span>Gamified rewards</span></div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Layers className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{totalListings}</p><p className="text-xs text-muted-foreground">Active Collectives</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-secondary"><Users className="h-5 w-5 text-foreground" /></div><div><p className="text-2xl font-bold">{myParticipation?.length || 0}</p><p className="text-xs text-muted-foreground">My Participations</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Sparkles className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{myTotalUnits}</p><p className="text-xs text-muted-foreground">My Units</p></div></div></CardContent></Card>
        </div>

        <Tabs defaultValue="collectives" className="space-y-6">
          <TabsList className="glass">
            <TabsTrigger value="collectives" className="gap-2"><Sparkles className="h-4 w-4" />Collectives</TabsTrigger>
            <TabsTrigger value="participation" className="gap-2"><Users className="h-4 w-4" />My Participation</TabsTrigger>
          </TabsList>

          <TabsContent value="collectives" className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search collectives..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[140px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>{categories.map(cat => (<SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>))}</SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px]"><ArrowUpDown className="h-4 w-4 mr-2" /><SelectValue placeholder="Sort" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (<Card key={i}><CardContent className="p-4"><Skeleton className="h-40 w-full mb-4 rounded-lg" /><Skeleton className="h-6 w-3/4 mb-2" /><Skeleton className="h-4 w-1/2" /></CardContent></Card>))}
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="text-center py-12"><Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="text-lg font-semibold mb-2">No collectives found</h3><p className="text-muted-foreground">Check back later for new opportunities</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredListings.map((listing) => {
                  const name = listing.listing?.title || listing.market_item?.name || 'Unknown Item';
                  const image = listing.listing?.image_url || listing.market_item?.image_url || '/placeholder.svg';
                  const claimedUnits = listing.total_shares - listing.available_shares;
                  const claimedPercent = (claimedUnits / listing.total_shares) * 100;
                  const isVerificationOverdue = listing.daily_verification_required && listing.last_verified_at && new Date().getTime() - new Date(listing.last_verified_at).getTime() > 24 * 60 * 60 * 1000;

                  return (
                    <Card key={listing.id} className="overflow-hidden hover:border-primary/50 transition-colors">
                      <div className="relative h-40 bg-secondary">
                        <img src={image} alt={name} className="w-full h-full object-cover" />
                        <div className="absolute top-2 right-2 flex gap-1">
                          {listing.daily_verification_required && (<Badge variant={isVerificationOverdue ? "destructive" : "secondary"} className="gap-1"><Shield className="h-3 w-3" />{isVerificationOverdue ? "Overdue" : "Verified"}</Badge>)}
                        </div>
                      </div>
                      <CardContent className="p-4 space-y-4">
                        <div><h3 className="font-semibold text-foreground truncate">{name}</h3><p className="text-sm text-muted-foreground">{listing.listing?.category || listing.market_item?.category}</p></div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div><p className="text-lg font-bold">{formatPrice(listing.share_price)}</p><p className="text-xs text-muted-foreground">Per Unit</p></div>
                          <div><p className="text-lg font-bold">{listing.available_shares}</p><p className="text-xs text-muted-foreground">Available</p></div>
                          <div><p className="text-lg font-bold">{listing.min_shares}</p><p className="text-xs text-muted-foreground">Min Join</p></div>
                        </div>
                        <div className="space-y-1"><div className="flex justify-between text-xs"><span className="text-muted-foreground">Community</span><span className="font-medium">{claimedPercent.toFixed(0)}% Joined</span></div><Progress value={claimedPercent} className="h-2" /></div>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs gap-1"><Vote className="h-3 w-3" />Voting</Badge>
                          <Badge variant="outline" className="text-xs gap-1"><Star className="h-3 w-3" />XP</Badge>
                          <Badge variant="outline" className="text-xs gap-1"><Trophy className="h-3 w-3" />Rewards</Badge>
                        </div>
                        <CollectiveJoinDialog collectiveListing={listing} />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="participation" className="space-y-4">
            {!user ? (
              <div className="text-center py-12"><Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="text-lg font-semibold mb-2">Sign in to view your participation</h3><p className="text-muted-foreground mb-4">Track your Collective memberships</p><Button onClick={() => navigate('/auth')}>Sign In</Button></div>
            ) : myParticipation?.length === 0 ? (
              <div className="text-center py-12"><Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="text-lg font-semibold mb-2">No participations yet</h3><p className="text-muted-foreground">Join a Collective above to get started</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myParticipation?.map((holding) => {
                  const fl = holding.fractional_listing;
                  const name = fl?.listing?.title || fl?.market_item?.name || 'Unknown Item';
                  const image = fl?.listing?.image_url || fl?.market_item?.image_url || '/placeholder.svg';
                  const participationPercent = fl ? (holding.shares_owned / fl.total_shares) * 100 : 0;

                  return (
                    <Card key={holding.id} className="overflow-hidden">
                      <div className="relative h-32 bg-secondary">
                        <img src={image} alt={name} className="w-full h-full object-cover" />
                        <Badge className="absolute top-2 right-2 gap-1 bg-primary">{participationPercent.toFixed(1)}% Member</Badge>
                      </div>
                      <CardContent className="p-4 space-y-3">
                        <div><h3 className="font-semibold text-foreground truncate">{name}</h3><p className="text-sm text-muted-foreground">{holding.shares_owned} Collective Units</p></div>
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                          <p className="text-xs font-medium mb-2">Your Rights:</p>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary" className="text-xs gap-1"><Vote className="h-3 w-3" />Vote</Badge>
                            <Badge variant="secondary" className="text-xs gap-1"><Star className="h-3 w-3" />XP Eligible</Badge>
                            <Badge variant="secondary" className="text-xs gap-1"><Users className="h-3 w-3" />Community</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="h-3 w-3" />Joined {formatDistanceToNow(new Date(holding.purchased_at), { addSuffix: true })}</div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-8 p-4 rounded-lg bg-muted/50 text-center">
          <p className="text-xs text-muted-foreground">CardBoom COLLECTIVE™ units are non-financial digital participation rights. They do not represent ownership, equity, investment products, or entitlement to financial returns or profit distribution. Participation grants voting access, gamified rewards, XP/badge eligibility, and community interaction rights only.</p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CollectiveMarket;
