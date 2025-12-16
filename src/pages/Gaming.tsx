import { useState, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { CoachRegistrationDialog } from '@/components/gaming/CoachRegistrationDialog';
import { CoachesSection } from '@/components/gaming/CoachesSection';
import { Collectible } from '@/types/collectible';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Gamepad2, Trophy, Coins, Sword, Users, GraduationCap, Package } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useNavigate } from 'react-router-dom';

interface GamingItem {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  current_price: number;
  image_url: string | null;
  change_24h: number | null;
}

const Gaming = () => {
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<Collectible[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showCoachDialog, setShowCoachDialog] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [gamingItems, setGamingItems] = useState<GamingItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Check auth state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch gaming items from database
  useEffect(() => {
    const fetchGamingItems = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('market_items')
        .select('id, name, category, subcategory, current_price, image_url, change_24h')
        .in('category', ['gamepoints', 'gaming', 'coaching'])
        .order('current_price', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching gaming items:', error);
      } else {
        setGamingItems(data || []);
      }
      setLoading(false);
    };

    fetchGamingItems();
  }, []);

  const gamePointsItems = useMemo(() => {
    return gamingItems.filter(item => item.category === 'gamepoints');
  }, [gamingItems]);

  const coachingItems = useMemo(() => {
    return gamingItems.filter(item => item.category === 'coaching');
  }, [gamingItems]);

  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return gamingItems;
    if (activeTab === 'points') return gamePointsItems;
    if (activeTab === 'coaching') return coachingItems;
    if (activeTab === 'valorant') return gamingItems.filter(i => i.subcategory?.toLowerCase().includes('valorant'));
    if (activeTab === 'lol') return gamingItems.filter(i => i.subcategory?.toLowerCase().includes('league'));
    if (activeTab === 'csgo') return gamingItems.filter(i => i.subcategory?.toLowerCase().includes('cs'));
    if (activeTab === 'pubg') return gamingItems.filter(i => i.subcategory?.toLowerCase().includes('pubg'));
    return gamingItems;
  }, [activeTab, gamingItems, gamePointsItems, coachingItems]);

  const handleRemoveFromCart = (id: string) => {
    setCartItems(cartItems.filter((item) => item.id !== id));
    toast.info(t.cart.removed);
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Gaming Hub | Cardboom - Game Points, Skins & Coaching</title>
        <meta name="description" content="Buy and sell game points, skins, and coaching services. Level up your gaming experience with Valorant VP, PUBG UC, and professional coaching from top players." />
        <meta name="keywords" content="game points, gaming marketplace, Valorant VP, PUBG UC, gaming coaching, esports coaching, game skins" />
        <link rel="canonical" href="https://cardboom.com/gaming" />
        <meta property="og:title" content="Gaming Hub | Cardboom" />
        <meta property="og:description" content="Buy and sell game points, skins, and coaching services. Level up your gaming experience." />
        <meta property="og:url" content="https://cardboom.com/gaming" />
        <meta property="og:type" content="website" />
      </Helmet>
      <Header cartCount={cartItems.length} onCartClick={() => setIsCartOpen(true)} />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="relative rounded-2xl overflow-hidden mb-8 bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 p-8 md:p-12">
          <div className="absolute inset-0 bg-[url('/placeholder.svg')] opacity-5"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-primary/20">
                <Gamepad2 className="w-8 h-8 text-primary" />
              </div>
              <Badge variant="secondary" className="bg-gain/20 text-gain">
                New Category
              </Badge>
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
              Gaming Hub
            </h1>
            <p className="text-muted-foreground max-w-2xl text-lg mb-6">
              Game points, skins, coaching services and more. Level up your gaming experience with CardBoom.
            </p>
            <Button 
              onClick={() => {
                if (!user) {
                  toast.error('Please log in to register as a coach');
                  return;
                }
                setShowCoachDialog(true);
              }}
              className="bg-gradient-to-r from-gold to-gold/80 text-background hover:from-gold/90 hover:to-gold/70"
            >
              <GraduationCap className="w-4 h-4 mr-2" />
              Become a Coach
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-card border border-border">
            <Coins className="w-5 h-5 text-gold mb-2" />
            <p className="text-2xl font-bold">{gamePointsItems.length}</p>
            <p className="text-sm text-muted-foreground">Game Points</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <Trophy className="w-5 h-5 text-primary mb-2" />
            <p className="text-2xl font-bold">{coachingItems.length}</p>
            <p className="text-sm text-muted-foreground">Coaching Services</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <Sword className="w-5 h-5 text-loss mb-2" />
            <p className="text-2xl font-bold">{gamingItems.filter(i => i.subcategory?.toLowerCase().includes('cs')).length}</p>
            <p className="text-sm text-muted-foreground">CS2 Skins</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <Users className="w-5 h-5 text-gain mb-2" />
            <p className="text-2xl font-bold">{gamingItems.length}</p>
            <p className="text-sm text-muted-foreground">Total Items</p>
          </div>
        </div>

        {/* Our Coaches Section */}
        <CoachesSection />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-2">
              All
            </TabsTrigger>
            <TabsTrigger value="points" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-2">
              🎮 Game Points
            </TabsTrigger>
            <TabsTrigger value="coaching" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-2">
              🎓 Coaching
            </TabsTrigger>
            <TabsTrigger value="valorant" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-2">
              Valorant
            </TabsTrigger>
            <TabsTrigger value="lol" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-2">
              League of Legends
            </TabsTrigger>
            <TabsTrigger value="csgo" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-2">
              CS2
            </TabsTrigger>
            <TabsTrigger value="pubg" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-2">
              PUBG
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Items Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="aspect-square bg-muted rounded-lg mb-3" />
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredItems.map((item) => (
              <Card 
                key={item.id} 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate(`/item/${item.id}`)}
              >
                <CardContent className="p-4">
                  <div className="aspect-square bg-muted rounded-lg mb-3 overflow-hidden">
                    {item.image_url ? (
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Gamepad2 className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-medium text-sm line-clamp-2 mb-1">{item.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">{formatPrice(item.current_price)}</span>
                    {item.change_24h !== null && (
                      <span className={item.change_24h >= 0 ? 'text-gain text-xs' : 'text-loss text-xs'}>
                        {item.change_24h >= 0 ? '+' : ''}{item.change_24h.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No items found</h3>
            <p className="text-muted-foreground">Gaming items will appear here once added to the marketplace</p>
          </div>
        )}

        {/* Coaching Info Section */}
        <div className="mt-16 p-8 rounded-2xl bg-card border border-border">
          <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-gold" />
            Pro Gaming Coaching
          </h2>
          <p className="text-muted-foreground mb-6">
            Learn from professional players and coaches. Get personalized training, VOD reviews, and rank up faster.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-4 rounded-xl bg-muted/50">
              <h3 className="font-semibold mb-2">Valorant Coaching</h3>
              <p className="text-sm text-muted-foreground">
                From Iron to Radiant. Learn agent mastery, game sense, and aim training from top-ranked coaches.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50">
              <h3 className="font-semibold mb-2">League of Legends Coaching</h3>
              <p className="text-sm text-muted-foreground">
                Climb the ranked ladder with Challenger-level coaching. Lane mechanics, macro play, and champion pools.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50">
              <h3 className="font-semibold mb-2">VOD Reviews</h3>
              <p className="text-sm text-muted-foreground">
                Get your gameplay analyzed by pros. Identify mistakes and improve your decision-making.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onRemoveItem={handleRemoveFromCart}
      />

      <CoachRegistrationDialog 
        open={showCoachDialog} 
        onOpenChange={setShowCoachDialog} 
      />
    </div>
  );
};

export default Gaming;
