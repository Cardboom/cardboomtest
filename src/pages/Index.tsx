import { useState, useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
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

import { ScrollReveal } from '@/components/ScrollReveal';
import { DailyQuestsPanel } from '@/components/DailyQuestsPanel';
import { AIInsightsPanel } from '@/components/AIInsightsPanel';
import { SocialTradingPanel } from '@/components/SocialTradingPanel';
import { SmartAlertsPanel } from '@/components/SmartAlertsPanel';
import { ActivityAnnouncementBanner } from '@/components/ActivityAnnouncementBanner';
import { DailyXPClaimNotification } from '@/components/DailyXPClaimNotification';
import { DailyCardVotePopup } from '@/components/DailyCardVotePopup';
import { GlobalTCGStats } from '@/components/GlobalTCGStats';
import { useMarketItems, useListings } from '@/hooks/useMarketItems';
import { LiveUpdateIndicator } from '@/components/LiveUpdateIndicator';
import { Collectible } from '@/types/collectible';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, Brain, Trophy, Bell, Users, PieChart, Sparkles, Clock } from 'lucide-react';
import { PopularCardsPanel } from '@/components/PopularCardsPanel';
import { WhatsNewPanel } from '@/components/WhatsNewPanel';
import { GradingCTA } from '@/components/GradingCTA';
import { FeatureShowcase } from '@/components/FeatureShowcase';
import { useNavigate, Link } from 'react-router-dom';
import { ReelsPreviewSection } from '@/components/reels/ReelsPreviewSection';
import { CardWarsSection } from '@/components/CardWarsSection';
import { TopListingsChart } from '@/components/TopListingsChart';
import { LiveMarketPanel } from '@/components/home/LiveMarketPanel';
import { PersonalizedInsightsPanel } from '@/components/home/PersonalizedInsightsPanel';
import { NewsPanel } from '@/components/home/NewsPanel';
import { BountiesPanel } from '@/components/home/BountiesPanel';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { FAQSection } from '@/components/FAQSection';
import { SEOFeaturesSection } from '@/components/SEOFeaturesSection';



const Index = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const marketRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cartItems, setCartItems] = useState<Collectible[]>([]);
  const [selectedCollectible, setSelectedCollectible] = useState<Collectible | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  

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
  

  // Fetch items from database with real-time updates - prioritize items with images
  const { items: marketItems, isLoading: marketLoading, lastUpdated, updateCount } = useMarketItems({ 
    limit: 100, 
    refreshInterval: 30000,
    requireImage: true // Only fetch items that have images
  });
  
  // Also fetch active listings (user-created)
  const { listings, isLoading: listingsLoading } = useListings({ status: 'active' });

  const isLoading = marketLoading || listingsLoading;

  // Transform database market items to Collectible format
  // Extract year from item name/set or use category-based defaults
  const getItemYear = (item: typeof marketItems[0]): number => {
    // Try to extract 4-digit year from name or set_name
    const yearMatch = (item.name + ' ' + (item.set_name || '')).match(/\b(19[89]\d|20[0-2]\d)\b/);
    if (yearMatch) return parseInt(yearMatch[1]);
    
    // Category-based defaults for vintage items
    const categoryDefaults: Record<string, number> = {
      'pokemon': 1999,
      'mtg': 1993,
      'yugioh': 2002,
      'nba': 1996,
      'nfl': 2000,
      'mlb': 2000,
      'onepiece': 2022,
      'lorcana': 2023,
      'lol-riftbound': 2024,
    };
    return categoryDefaults[item.category] || new Date().getFullYear();
  };

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
      year: getItemYear(item),
      brand: item.set_name || item.subcategory || item.category,
      trending: item.is_trending ?? false,
      priceUpdated: false,
      liquidity: item.liquidity,
      salesCount: item.sales_count_30d,
      source: 'market_item',
      listingId: undefined,
    } as Collectible & { source: string; listingId?: string }));
  }, [marketItems]);

  // Transform user listings to Collectible format with seller info
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
      seller: listing.seller_username || 'Seller',
      sellerUsername: listing.seller_username || 'Seller',
      sellerCountryCode: listing.seller_country_code || 'TR',
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
    // Only show items with real images (not placeholder)
    let items = collectiblesWithLivePrices.filter((item) => 
      item.image && item.image !== '/placeholder.svg' && !item.image.includes('placeholder')
    );
    
    if (selectedCategory !== 'all') {
      items = items.filter((item) => item.category === selectedCategory);
    }
    return items;
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

  // Helper to diversify results by limiting items per category
  const diversifyByCategory = (items: typeof collectiblesWithLivePrices, maxPerCategory: number = 2) => {
    const categoryCount: Record<string, number> = {};
    return items.filter((item) => {
      const cat = item.category || 'unknown';
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      return categoryCount[cat] <= maxPerCategory;
    });
  };

  const topGainers = diversifyByCategory(
    collectiblesWithLivePrices
      .filter((item) => item.priceChange > 0 && item.image && item.image !== '/placeholder.svg' && !item.image.includes('placeholder'))
      .sort((a, b) => b.priceChange - a.priceChange)
  ).slice(0, 5);

  const topLosers = diversifyByCategory(
    collectiblesWithLivePrices
      .filter((item) => item.priceChange < 0 && item.image && item.image !== '/placeholder.svg' && !item.image.includes('placeholder'))
      .sort((a, b) => a.priceChange - b.priceChange)
  ).slice(0, 5);

  // Platform features now handled by FeatureShowcase component

  return (
    <div className="min-h-screen relative">
      {/* Refined ambient background */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: -1 }}>
        <div className="absolute inset-0 bg-background" />
        
        {/* Single subtle gradient wash - GPU accelerated */}
        <div 
          className="absolute inset-0 opacity-40 dark:opacity-30"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% -20%, hsl(var(--primary) / 0.15), transparent)',
            willChange: 'transform'
          }}
        />
        
        {/* Minimal accent glow */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-[60vh] opacity-20 dark:opacity-15"
          style={{
            background: 'radial-gradient(ellipse 60% 40% at 50% 100%, hsl(var(--accent) / 0.1), transparent)',
            willChange: 'transform'
          }}
        />
      </div>
      
      {/* Main content with transparent/semi-transparent backgrounds */}
      <div className="relative z-0">
      <Helmet>
        <title>Cardboom - Premier Collectibles Trading Exchange | Buy & Sell Trading Cards</title>
        <meta name="description" content="Trade NBA cards, football cards, Pokemon TCG, Yu-Gi-Oh!, and rare collectible figures with real-time pricing, secure transactions, and instant settlements. Join 10,000+ collectors on Cardboom." />
        <meta name="keywords" content="trading cards, NBA cards, football cards, TCG, Pokemon cards, Yu-Gi-Oh cards, collectibles, figures, marketplace, live prices, card grading, PSA, BGS, sports cards" />
        <link rel="canonical" href="https://cardboom.com/" />
        <meta property="og:title" content="Cardboom - Premier Collectibles Trading Exchange" />
        <meta property="og:description" content="Trade collectible cards and figures with real-time pricing, secure transactions, and instant settlements." />
        <meta property="og:url" content="https://cardboom.com/" />
        <meta property="og:type" content="website" />
      </Helmet>
      
      <ActivityAnnouncementBanner />
      {user && <DailyXPClaimNotification />}
      {user && <DailyCardVotePopup />}
      <Header cartCount={cartItems.length} onCartClick={() => setIsCartOpen(true)} />
      <MarketTicker />
      
      <main>
        {/* Boom Challenges - Full width at top */}
        {user && (
          <div className="container mx-auto px-4 pt-6 space-y-3">
            {/* Full-width Bounties Panel with explanation */}
            <BountiesPanel userId={user.id} />
            
            {/* Two column layout for market panels */}
            <div className="grid md:grid-cols-2 gap-3">
              <LiveMarketPanel />
              <PersonalizedInsightsPanel userId={user.id} />
            </div>
            
            {/* Full-width News Panel */}
            <NewsPanel />
          </div>
        )}
        
        {/* Global Stats Bar - Hero at top (hide hero for logged in users) */}
        <GlobalTCGStats hideHero={!!user} />

        {/* Feature Showcase - Why CardBoom (only for non-logged-in users) */}
        {!user && <FeatureShowcase />}

        {/* Grading CTA Section (only for non-logged-in users) */}
        {!user && <GradingCTA />}

        {/* Top Listings Chart - CoinMarketCap style */}
        <TopListingsChart />

        {/* Smart Trading Hub - moved directly below Top Listings */}
        <ScrollReveal>
          <section className="py-8 sm:py-12 border-t border-border/20 bg-transparent">
            <div className="container mx-auto px-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-8">
                <div>
                  <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
                    <Brain className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
                    {t.smartHub.title}
                  </h2>
                  <p className="text-muted-foreground text-sm sm:text-base mt-1">{t.smartHub.subtitle}</p>
                </div>
              </div>

              <Tabs defaultValue="popular" className="space-y-4 sm:space-y-6">
                <TabsList className="glass w-full sm:w-auto overflow-x-auto flex-nowrap justify-start sm:justify-center p-1 h-auto">
                  <TabsTrigger value="popular" className="gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-sm whitespace-nowrap">
                    <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                    Popular Cards
                  </TabsTrigger>
                  <TabsTrigger value="whatsnew" className="gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-sm whitespace-nowrap">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                    What's New
                  </TabsTrigger>
                  <TabsTrigger value="insights" className="gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-sm whitespace-nowrap">
                    <Brain className="w-3 h-3 sm:w-4 sm:h-4" />
                    {t.smartHub.aiInsights}
                  </TabsTrigger>
                  <TabsTrigger value="social" className="gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-sm whitespace-nowrap">
                    <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                    {t.smartHub.topTraders}
                  </TabsTrigger>
                  <TabsTrigger value="quests" className="gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-sm whitespace-nowrap">
                    <Trophy className="w-3 h-3 sm:w-4 sm:h-4" />
                    {t.smartHub.quests}
                  </TabsTrigger>
                  <TabsTrigger value="alerts" className="gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-sm whitespace-nowrap">
                    <Bell className="w-3 h-3 sm:w-4 sm:h-4" />
                    {t.smartHub.alerts}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="popular">
                  <PopularCardsPanel />
                </TabsContent>

                <TabsContent value="whatsnew">
                  <WhatsNewPanel />
                </TabsContent>

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
        
        {/* Live Market Section */}
        <ScrollReveal>
          <section ref={marketRef} className="py-8 sm:py-12 border-t border-border/20 bg-transparent">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-4 sm:mb-8">
                <div>
                  <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
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
              
              <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
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

        {/* Reels Preview Section */}
        <ScrollReveal>
          <ReelsPreviewSection />
        </ScrollReveal>

        {/* Card Wars Section - aligned with container */}
        <ScrollReveal>
          <section className="py-8 sm:py-12 border-t border-border/20 bg-transparent">
            <div className="container mx-auto px-4">
              <CardWarsSection />
            </div>
          </section>
        </ScrollReveal>

        {/* Listings */}
        <section className="py-8 sm:py-12 border-t border-border/20 bg-transparent">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div>
                <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                  {t.market.explore}
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base mt-1">{t.market.browseListings}</p>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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

      {/* SEO Features Section - Comprehensive feature listing for search engines */}
      {!user && <SEOFeaturesSection />}

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
    </div>
  );
};

export default Index;
