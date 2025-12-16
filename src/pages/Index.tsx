import { useState, useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { MarketTicker } from '@/components/MarketTicker';
import { HeroSection } from '@/components/HeroSection';
import { TrendingSection } from '@/components/TrendingSection';
import { CategoryFilter } from '@/components/CategoryFilter';
import { CollectibleCard } from '@/components/CollectibleCard';
import { CollectibleModal } from '@/components/CollectibleModal';
import { CartDrawer } from '@/components/CartDrawer';
import { LiveMarketTable } from '@/components/LiveMarketTable';
import { Footer } from '@/components/Footer';
import { WaitlistBanner } from '@/components/WaitlistBanner';
import { ScrollReveal } from '@/components/ScrollReveal';
import { DailyQuestsPanel } from '@/components/DailyQuestsPanel';
import { AIInsightsPanel } from '@/components/AIInsightsPanel';
import { SocialTradingPanel } from '@/components/SocialTradingPanel';
import { SmartAlertsPanel } from '@/components/SmartAlertsPanel';
import { ActivityAnnouncementBanner } from '@/components/ActivityAnnouncementBanner';
import { useMarketItems, useListings } from '@/hooks/useMarketItems';
import { LiveUpdateIndicator } from '@/components/LiveUpdateIndicator';
import { Collectible } from '@/types/collectible';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDailyStreak } from '@/hooks/useDailyStreak';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, Shield, Zap, Wallet, Users, Brain, Trophy, Bell, PieChart } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { FAQSection } from '@/components/FAQSection';

const WAITLIST_DISMISSED_KEY = 'cardboom_waitlist_dismissed';

const Index = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const marketRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cartItems, setCartItems] = useState<Collectible[]>([]);
  const [selectedCollectible, setSelectedCollectible] = useState<Collectible | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showWaitlist, setShowWaitlist] = useState(false);
  
  useDailyStreak();

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

  // Scroll to market section if user is logged in
  useEffect(() => {
    if (user && marketRef.current) {
      setTimeout(() => {
        marketRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [user]);
  
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

  // Fetch items from database with real-time updates
  const { items: marketItems, isLoading: marketLoading, lastUpdated, updateCount } = useMarketItems({ limit: 100, refreshInterval: 30000 });
  
  // Also fetch active listings (user-created)
  const { listings, isLoading: listingsLoading } = useListings({ status: 'active' });

  const isLoading = marketLoading || listingsLoading;

  // Transform database market items to Collectible format
  const marketCollectibles = useMemo(() => {
    return marketItems.map(item => ({
      id: item.id,
      priceId: item.id,
      name: item.name,
      category: item.category,
      image: item.image_url || '/placeholder.svg',
      price: item.current_price,
      previousPrice: item.base_price,
      priceChange: item.change_24h ?? 0,
      rarity: (item.rarity as 'common' | 'rare' | 'legendary' | 'grail') || 'rare',
      seller: 'CardBoom',
      condition: 'Mint',
      year: new Date(item.created_at).getFullYear(),
      brand: item.set_name || item.subcategory || item.category,
      trending: item.is_trending ?? false,
      priceUpdated: false,
      liquidity: item.liquidity,
      salesCount: item.sales_count_30d,
      source: 'market_item',
      listingId: undefined,
    } as Collectible & { source: string; listingId?: string }));
  }, [marketItems]);

  // Transform user listings to Collectible format
  const listingCollectibles = useMemo(() => {
    return listings.map(listing => ({
      id: listing.id,
      priceId: listing.id,
      name: listing.title,
      category: listing.category,
      image: listing.image_url || '/placeholder.svg',
      price: listing.price,
      previousPrice: listing.price,
      priceChange: 0,
      rarity: 'rare' as const,
      seller: 'User Listing',
      condition: listing.condition || 'Near Mint',
      year: new Date(listing.created_at).getFullYear(),
      brand: listing.category,
      trending: false,
      priceUpdated: false,
      liquidity: null,
      salesCount: 0,
      source: 'listing',
      listingId: listing.id,
    } as Collectible & { source: string; listingId?: string }));
  }, [listings]);

  // Combine both market items and listings
  const collectiblesWithLivePrices = useMemo(() => {
    // Merge and sort by newest first (listings at top since they're user-created)
    return [...listingCollectibles, ...marketCollectibles];
  }, [marketCollectibles, listingCollectibles]);

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

  // Handle click on collectible - navigate to listing page for user listings, modal for market items
  const handleCollectibleClick = (collectible: Collectible & { source?: string; listingId?: string }) => {
    if (collectible.source === 'listing' && collectible.listingId) {
      navigate(`/listing/${collectible.listingId}`);
    } else {
      setSelectedCollectible(collectible);
    }
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
    { icon: Shield, title: t.whyInvest.secureVault, desc: t.whyInvest.secureVaultDesc },
    { icon: Zap, title: t.whyInvest.instantTrades, desc: t.whyInvest.instantTradesDesc },
    { icon: Wallet, title: t.whyInvest.easyPayments, desc: t.whyInvest.easyPaymentsDesc },
    { icon: Users, title: t.whyInvest.verifiedInvestors, desc: t.whyInvest.verifiedInvestorsDesc },
    { icon: PieChart, title: t.whyInvest.fractionalShares, desc: t.whyInvest.fractionalSharesDesc },
    { icon: Brain, title: t.whyInvest.aiInsights, desc: t.whyInvest.aiInsightsDesc },
  ];

  return (
    <div className="min-h-screen bg-background">
      {showWaitlist && <WaitlistBanner onDismiss={handleDismissWaitlist} />}
      <ActivityAnnouncementBanner />
      <Header cartCount={cartItems.length} onCartClick={() => setIsCartOpen(true)} />
      <MarketTicker />
      
      <main>
        {/* Only show hero for non-logged-in users */}
        {!user && <HeroSection />}
        
        {/* Live Market Section */}
        <ScrollReveal>
          <section ref={marketRef} className="py-12 border-t border-border/50 bg-muted/20">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                    {t.market.popularCollections}
                  </h2>
                  <LiveUpdateIndicator 
                    lastUpdated={lastUpdated} 
                    updateCount={updateCount}
                    className="mt-1"
                  />
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/markets')}
                  className="hidden sm:flex"
                >
                  {t.market.seeAllMarkets}
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

        {/* 2026 Features: AI Insights + Social + Gamification */}
        <ScrollReveal>
          <section className="py-12 border-t border-border/50">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
                    <Brain className="h-7 w-7 text-primary" />
                    {t.smartHub.title}
                  </h2>
                  <p className="text-muted-foreground mt-1">{t.smartHub.subtitle}</p>
                </div>
                <Link to="/fractional">
                  <Button variant="outline" className="gap-2">
                    <PieChart className="w-4 h-4" />
                    {t.smartHub.fractionalMarket}
                  </Button>
                </Link>
              </div>

              <Tabs defaultValue="insights" className="space-y-6">
                <TabsList className="glass w-full sm:w-auto overflow-x-auto flex-nowrap justify-start sm:justify-center p-1 h-auto">
                  <TabsTrigger value="insights" className="gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                    <Brain className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    {t.smartHub.aiInsights}
                  </TabsTrigger>
                  <TabsTrigger value="social" className="gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    {t.smartHub.topTraders}
                  </TabsTrigger>
                  <TabsTrigger value="quests" className="gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                    <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    {t.smartHub.quests}
                  </TabsTrigger>
                  <TabsTrigger value="alerts" className="gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                    <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    {t.smartHub.alerts}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="insights">
                  <AIInsightsPanel />
                </TabsContent>

                <TabsContent value="social">
                  <SocialTradingPanel />
                </TabsContent>

                <TabsContent value="quests">
                  <DailyQuestsPanel xp={1250} level={5} streak={7} />
                </TabsContent>

                <TabsContent value="alerts">
                  <SmartAlertsPanel />
                </TabsContent>
              </Tabs>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal>
          <TrendingSection />
        </ScrollReveal>
        {/* Platform Features */}
        <ScrollReveal>
          <section className="py-16 border-t border-border/50 bg-gradient-to-b from-muted/30 to-transparent">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                  {t.whyInvest.title}
                </h2>
                <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                  {t.whyInvest.subtitle}
                </p>
              </div>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
        <section className="py-12 border-t border-border/50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                  {t.market.explore}
                </h2>
                <p className="text-muted-foreground mt-1">{t.market.browseListings}</p>
              </div>
            </div>
            
            <CategoryFilter
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />

            {isLoading ? (
              <div className="col-span-full flex items-center justify-center py-16">
                <div className="text-muted-foreground">{t.market.loading}</div>
              </div>
            ) : filteredCollectibles.length === 0 ? (
              <div className="col-span-full flex items-center justify-center py-16">
                <div className="text-muted-foreground">{t.market.noItems}</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCollectibles.map((collectible, index) => (
                  <div
                    key={collectible.id}
                    className={cn(
                      "transition-transform duration-300 animate-fade-in hover:scale-[1.02]",
                      (collectible as any).priceUpdated && "animate-pulse"
                    )}
                    style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
                  >
                    <CollectibleCard
                      collectible={collectible}
                      onAddToCart={handleAddToCart}
                      onClick={handleCollectibleClick}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* FAQ Section for non-logged-in users - Great for SEO */}
      {!user && <FAQSection />}

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
