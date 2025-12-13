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
import { Footer } from '@/components/Footer';
import { WaitlistBanner } from '@/components/WaitlistBanner';
import { mockCollectibles } from '@/data/mockData';
import { Collectible } from '@/types/collectible';
import { useLivePrices } from '@/hooks/useLivePrices';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDailyStreak } from '@/hooks/useDailyStreak';

const WAITLIST_DISMISSED_KEY = 'cardboom_waitlist_dismissed';

const Index = () => {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cartItems, setCartItems] = useState<Collectible[]>([]);
  const [selectedCollectible, setSelectedCollectible] = useState<Collectible | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showWaitlist, setShowWaitlist] = useState(false);
  
  // Initialize daily streak tracking for logged-in users
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

  // Get live prices for all collectibles
  const productIds = useMemo(() => mockCollectibles.map(c => c.priceId), []);
  const { prices } = useLivePrices({ productIds, refreshInterval: 15000 });

  // Merge live prices with collectibles
  const collectiblesWithLivePrices = useMemo(() => {
    return mockCollectibles.map(collectible => {
      const livePrice = prices[collectible.priceId];
      if (livePrice) {
        return {
          ...collectible,
          price: livePrice.price,
          priceChange: livePrice.change,
          previousPrice: Math.round(livePrice.price / (1 + livePrice.change / 100)),
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

  return (
    <div className="min-h-screen bg-background">
      {showWaitlist && <WaitlistBanner onDismiss={handleDismissWaitlist} />}
      <Header cartCount={cartItems.length} onCartClick={() => setIsCartOpen(true)} />
      <MarketTicker />
      
      <main>
        <HeroSection />
        <TrendingSection />

        {/* Market Overview */}
        <section className="py-12 border-t border-border/50">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-3 gap-6 mb-12">
              <div className="lg:col-span-2">
                <PriceChart title={t.market.index} />
              </div>
              <div className="space-y-6">
                <div className="glass rounded-xl p-6">
                  <h3 className="font-display text-lg font-semibold text-foreground mb-4">
                    {t.market.topGainers} 📈
                  </h3>
                  {collectiblesWithLivePrices
                    .filter((item) => item.priceChange > 0)
                    .sort((a, b) => b.priceChange - a.priceChange)
                    .slice(0, 3)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                      >
                        <span className="text-sm text-foreground truncate max-w-[150px]">
                          {item.name}
                        </span>
                        <span className="text-sm font-medium text-gain">
                          +{item.priceChange.toFixed(2)}%
                        </span>
                      </div>
                    ))}
                </div>
                <div className="glass rounded-xl p-6">
                  <h3 className="font-display text-lg font-semibold text-foreground mb-4">
                    {t.market.topLosers} 📉
                  </h3>
                  {collectiblesWithLivePrices
                    .filter((item) => item.priceChange < 0)
                    .sort((a, b) => a.priceChange - b.priceChange)
                    .slice(0, 3)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                      >
                        <span className="text-sm text-foreground truncate max-w-[150px]">
                          {item.name}
                        </span>
                        <span className="text-sm font-medium text-loss">
                          {item.priceChange.toFixed(2)}%
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Listings */}
        <section className="py-12 border-t border-border/50">
          <div className="container mx-auto px-4">
            <h2 className="font-display text-2xl font-bold text-foreground mb-6">
              {t.market.explore}
            </h2>
            
            <CategoryFilter
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCollectibles.map((collectible, index) => (
                <div key={collectible.id} style={{ animationDelay: `${index * 50}ms` }}>
                  <CollectibleCard
                    collectible={collectible}
                    onAddToCart={handleAddToCart}
                    onClick={setSelectedCollectible}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Modals */}
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
