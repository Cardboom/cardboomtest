import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeftRight, 
  Plus, 
  Search, 
  Filter,
  Plug,
  DollarSign,
  Clock,
  Eye,
  User,
  ChevronRight
} from 'lucide-react';
import { SwapListingCard } from '@/components/cardswap/SwapListingCard';
import { CreateSwapModal } from '@/components/cardswap/CreateSwapModal';
import { MakeOfferModal } from '@/components/cardswap/MakeOfferModal';
import { MySwapsPanel } from '@/components/cardswap/MySwapsPanel';

interface SwapListing {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  category: string;
  condition: string;
  grade: string | null;
  grading_company: string | null;
  estimated_value: number | null;
  looking_for: string | null;
  accept_cash_offers: boolean;
  min_cash_addon: number | null;
  status: string;
  views_count: number;
  created_at: string;
}

const Cardswap = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const [user, setUser] = useState<any>(null);
  const [listings, setListings] = useState<SwapListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<SwapListing | null>(null);
  const [activeTab, setActiveTab] = useState('browse');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchListings();
  }, [searchQuery, selectedCategory]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('swap_listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error fetching swap listings:', error);
      toast.error('Failed to load swap listings');
    } finally {
      setLoading(false);
    }
  };

  const handleMakeOffer = (listing: SwapListing) => {
    if (!user) {
      toast.error('Please sign in to make an offer');
      navigate('/auth');
      return;
    }
    setSelectedListing(listing);
    setOfferModalOpen(true);
  };

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'pokemon', label: 'Pokémon' },
    { value: 'magic', label: 'Magic: The Gathering' },
    { value: 'yugioh', label: 'Yu-Gi-Oh!' },
    { value: 'one-piece', label: 'One Piece' },
    { value: 'sports', label: 'Sports Cards' },
    { value: 'figures', label: 'Figures' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header cartCount={0} onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <ArrowLeftRight className="w-4 h-4" />
            <span className="text-sm font-medium">Card Swap Marketplace</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-3">
            Cardswap
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Trade your cards directly with other collectors. List what you have, find what you want.
          </p>
        </motion.div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search swap listings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 rounded-lg bg-secondary border border-border text-sm"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            {user && (
              <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                List a Card
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="browse">Browse Swaps</TabsTrigger>
            <TabsTrigger value="my-swaps" disabled={!user}>My Swaps</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="mt-6">
            {loading ? (
              <div className="grid grid-cols-1 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center py-16">
                <ArrowLeftRight className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No swap listings yet</h3>
                <p className="text-muted-foreground mb-4">Be the first to list a card for swapping!</p>
                {user && (
                  <Button onClick={() => setCreateModalOpen(true)}>
                    Create First Listing
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {listings.map((listing, index) => (
                    <SwapListingCard
                      key={listing.id}
                      listing={listing}
                      onMakeOffer={() => handleMakeOffer(listing)}
                      isOwner={user?.id === listing.user_id}
                      formatPrice={formatPrice}
                      index={index}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-swaps" className="mt-6">
            {user && <MySwapsPanel userId={user.id} onRefresh={fetchListings} />}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />

      {/* Modals */}
      <CreateSwapModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={() => {
          fetchListings();
          setCreateModalOpen(false);
        }}
      />

      {selectedListing && (
        <MakeOfferModal
          open={offerModalOpen}
          onOpenChange={setOfferModalOpen}
          listing={selectedListing}
          onSuccess={() => {
            setOfferModalOpen(false);
            setSelectedListing(null);
            toast.success('Offer sent successfully!');
          }}
        />
      )}
    </div>
  );
};

export default Cardswap;
