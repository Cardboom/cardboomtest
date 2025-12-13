import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { MarketTicker } from '@/components/MarketTicker';
import { HeroSection } from '@/components/HeroSection';
import { TrendingSection } from '@/components/TrendingSection';
import { CategoryFilter } from '@/components/CategoryFilter';
import { CollectibleCard } from '@/components/CollectibleCard';
import { CollectibleModal } from '@/components/CollectibleModal';
import { CartDrawer } from '@/components/CartDrawer';
import { PriceChart } from '@/components/PriceChart';
import { LiveMarketTable } from '@/components/LiveMarketTable';
import { Footer } from '@/components/Footer';
import { WaitlistBanner } from '@/components/WaitlistBanner';
import { ScrollReveal } from '@/components/ScrollReveal';
import { mockCollectibles } from '@/data/mockData';
import { Collectible } from '@/types/collectible';
import { useRealtimePrices } from '@/hooks/useRealtimePrices';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDailyStreak } from '@/hooks/useDailyStreak';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, Zap, Wallet, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const WAITLIST_DISMISSED_KEY = 'cardboom_waitlist_dismissed';

const Index = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cartItems, setCartItems] = useState<Collectible[]>([]);
  const [selectedCollectible, setSelectedCollectible] = useState<Collectible | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showWaitlist, setShowWaitlist] = useState(false);
  
  useDailyStreak();
  
  useEffect(() => {
    const dismissed = sessionStorage.getItem(WAITLIST_DISMISSED_KEY);
    if (!dismissed) {
      setShowWaitlist(true);
    }
  }, []);

  const handleDismissWaitlist = () => {
    sessionStorage.setItem(WAITLIST_DISMISSED_KEY, 'true');
    setShowWaitlist(false);
  };

  // Use realtime prices with 3 second refresh
  const productIds = useMemo(() => mockCollectibles.map(c => c.priceId), []);
  const { prices } = useRealtimePrices({ productIds, refreshInterval: 3000 });

  const collectiblesWithLivePrices = useMemo(() => {
    return mockCollectibles.map(collectible => {
      const livePrice = prices[collectible.priceId];
      if (livePrice) {
        return {
          ...collectible,
          price: livePrice.price,
          priceChange: livePrice.change,
          previousPrice: Math.round(livePrice.price / (1 + livePrice.change / 100)),
          priceUpdated: livePrice.updated,
        };
      }
      return collectible;
    });
  }, [prices]);

  const filteredCollectibles = useMemo(() => {
    if (selectedCategory === 'all') return collectiblesWithLivePrices;
    return collectiblesWithLivePrices.filter((item) => item.category === selectedCategory);
  }, [selectedCategory, collectiblesWithLivePrices]);

  const handleAddToCart = (collectible: Collectible) => {
    if (cartItems.find((item) => item.id === collectible.id)) {
      toast.error(t.cart.alreadyIn);
      return;
    }
    setCartItems([...cartItems, collectible]);
    toast.success(`${collectible.name.slice(0, 30)}... ${t.cart.added}`);
  };

  const handleRemoveFromCart = (id: string) => {
    setCartItems(cartItems.filter((item) => item.id !== id));
    toast.info(t.cart.removed);
  };

  const topGainers = collectiblesWithLivePrices
    .filter((item) => item.priceChange > 0)
    .sort((a, b) => b.priceChange - a.priceChange)
    .slice(0, 5);

  const topLosers = collectiblesWithLivePrices
    .filter((item) => item.priceChange < 0)
    .sort((a, b) => a.priceChange - b.priceChange)
    .slice(0, 5);

  const platformFeatures = [
    { icon: Shield, title: 'Secure Vault', desc: 'Store your cards safely with insurance coverage' },
    { icon: Zap, title: 'Instant Trades', desc: 'Fast P2P trading with escrow protection' },
    { icon: Wallet, title: 'Easy Payments', desc: 'Multiple payment methods including crypto' },
    { icon: Users, title: 'Verified Sellers', desc: 'Trade with confidence from verified accounts' }
  ];

  return (
    <div className="min-h-screen bg-background">
      {showWaitlist && <WaitlistBanner onDismiss={handleDismissWaitlist} />}
      <Header cartCount={cartItems.length} onCartClick={() => setIsCartOpen(true)} />
      <MarketTicker />
      
      <main>
        <HeroSection />
        
        {/* Live Market Section */}
        <ScrollReveal>
          <section className="py-12 border-t border-border/50 bg-muted/20">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                    Popular Collections
                  </h2>
                  <p className="text-muted-foreground mt-1">Real-time prices from the market</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/markets')}
                  className="hidden sm:flex"
                >
                  See All Markets
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
              
              <div className="grid lg:grid-cols-2 gap-6">
                <ScrollReveal delay={100}>
                  <LiveMarketTable items={topGainers} title={`${t.market.topGainers} 📈`} />
                </ScrollReveal>
                <ScrollReveal delay={200}>
                  <LiveMarketTable items={topLosers} title={`${t.market.topLosers} 📉`} />
                </ScrollReveal>
              </div>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal>
          <TrendingSection />
        </ScrollReveal>

        {/* Market Overview with Chart */}
        <ScrollReveal>
          <section className="py-12 border-t border-border/50">
            <div className="container mx-auto px-4">
              <div className="mb-8">
                <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                  Market Overview
                </h2>
                <p className="text-muted-foreground mt-1">Track collectible market trends</p>
              </div>
              <div className="max-w-4xl">
                <PriceChart title={t.market.index} />
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Platform Features */}
        <ScrollReveal>
          <section className="py-16 border-t border-border/50 bg-gradient-to-b from-muted/30 to-transparent">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                  Why Trade on CardBoom?
                </h2>
                <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                  The most trusted platform for TCG collectors and traders
                </p>
              </div>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {platformFeatures.map((feature, index) => (
                  <ScrollReveal key={feature.title} delay={index * 100} direction="scale">
                    <div className="p-6 rounded-2xl bg-card/80 border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 text-center h-full">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <feature.icon className="w-7 h-7 text-primary" />
                      </div>
                      <h3 className="font-display text-lg font-bold text-foreground mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground text-sm">{feature.desc}</p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Listings */}
        <ScrollReveal>
          <section className="py-12 border-t border-border/50">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                    {t.market.explore}
                  </h2>
                  <p className="text-muted-foreground mt-1">Browse all available listings</p>
                </div>
              </div>
              
              <CategoryFilter
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCollectibles.map((collectible, index) => (
                  <ScrollReveal key={collectible.id} delay={Math.min(index * 50, 400)}>
                    <div className={cn(
                      "transition-transform duration-300",
                      (collectible as any).priceUpdated && "animate-pulse"
                    )}>
                      <CollectibleCard
                        collectible={collectible}
                        onAddToCart={handleAddToCart}
                        onClick={setSelectedCollectible}
                      />
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>
        </ScrollReveal>
      </main>

      <Footer />

      <CollectibleModal
        collectible={selectedCollectible}
        onClose={() => setSelectedCollectible(null)}
        onAddToCart={handleAddToCart}
      />
      
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onRemoveItem={handleRemoveFromCart}
      />
    </div>
  );
};

export default Index;
