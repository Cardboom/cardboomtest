import { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MarketExplorerFilters } from '@/components/market/MarketExplorerFilters';
import { MarketExplorerTable } from '@/components/market/MarketExplorerTable';
import { MarketExplorerStats } from '@/components/market/MarketExplorerStats';
import { ListingsTable } from '@/components/market/ListingsTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, BarChart3, Award, Layers, ShoppingBag, Sparkles, Trophy, Gamepad2 } from 'lucide-react';

export type MarketTab = 'all' | 'tcg' | 'sports' | 'gamepoints' | 'graded' | 'figures' | 'trending' | 'gainers' | 'losers' | 'forsale';
export type SortOption = 'change_24h' | 'change_7d' | 'change_30d' | 'price' | 'volume' | 'views' | 'liquidity' | 'recent';

export interface MarketFilters {
  category: string;
  setName: string;
  character: string;
  rarity: string;
  condition: string;
  grade: string;
  priceMin: number | null;
  priceMax: number | null;
  liquidityLevel: string;
  search: string;
}

const Explorer = () => {
  const [cartItems, setCartItems] = useState([]);
  const [activeTab, setActiveTab] = useState<MarketTab>('forsale');
  const [sortBy, setSortBy] = useState<SortOption>('change_24h');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<MarketFilters>({
    category: 'all',
    setName: '',
    character: '',
    rarity: '',
    condition: '',
    grade: 'all',
    priceMin: null,
    priceMax: null,
    liquidityLevel: 'all',
    search: '',
  });

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Market Explorer | Cardboom - Browse Trading Cards & Collectibles</title>
        <meta name="description" content="Explore thousands of trading cards and collectibles. Filter by category, grade, price, and more. Find Pokemon, sports cards, Yu-Gi-Oh!, and rare figures on Cardboom." />
        <meta name="keywords" content="trading card marketplace, buy trading cards, sell trading cards, Pokemon cards for sale, sports cards for sale, graded cards, PSA cards, BGS cards" />
        <link rel="canonical" href="https://cardboom.com/explorer" />
        <meta property="og:title" content="Market Explorer | Cardboom" />
        <meta property="og:description" content="Explore thousands of trading cards and collectibles. Filter by category, grade, price, and more." />
        <meta property="og:url" content="https://cardboom.com/explorer" />
        <meta property="og:type" content="website" />
      </Helmet>
      <Header cartCount={cartItems.length} onCartClick={() => {}} />
        
        <main className="container mx-auto px-4 py-6">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              Market Explorer
            </h1>
            <p className="text-muted-foreground">
              Track real-time prices across TCG, sports cards, and collectibles
            </p>
          </div>

          {/* Stats Overview */}
          <MarketExplorerStats />

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MarketTab)} className="mt-6">
            <TabsList className="bg-secondary/50 p-1 rounded-xl mb-4 flex-wrap h-auto gap-1">
              <TabsTrigger value="forsale" className="rounded-lg data-[state=active]:bg-gold data-[state=active]:text-gold-foreground">
                <ShoppingBag className="w-4 h-4 mr-2" />
                For Sale
              </TabsTrigger>
              <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Layers className="w-4 h-4 mr-2" />
                All Cards
              </TabsTrigger>
              <TabsTrigger value="tcg" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Sparkles className="w-4 h-4 mr-2" />
                TCG Collectibles
              </TabsTrigger>
              <TabsTrigger value="sports" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Trophy className="w-4 h-4 mr-2" />
                Sports Cards
              </TabsTrigger>
              <TabsTrigger value="gamepoints" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Gamepad2 className="w-4 h-4 mr-2" />
                Game Points
              </TabsTrigger>
              <TabsTrigger value="graded" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Award className="w-4 h-4 mr-2" />
                Graded (PSA)
              </TabsTrigger>
              <TabsTrigger value="figures" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <BarChart3 className="w-4 h-4 mr-2" />
                Figures
              </TabsTrigger>
              <TabsTrigger value="trending" className="rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                <TrendingUp className="w-4 h-4 mr-2" />
                Trending
              </TabsTrigger>
              <TabsTrigger value="gainers" className="rounded-lg data-[state=active]:bg-gain/20 data-[state=active]:text-gain">
                <TrendingUp className="w-4 h-4 mr-2" />
                Top Gainers
              </TabsTrigger>
              <TabsTrigger value="losers" className="rounded-lg data-[state=active]:bg-loss/20 data-[state=active]:text-loss">
                <TrendingDown className="w-4 h-4 mr-2" />
                Top Losers
              </TabsTrigger>
            </TabsList>

            {/* Filters - hide for forsale tab */}
            {activeTab !== 'forsale' && (
              <MarketExplorerFilters 
                filters={filters} 
                setFilters={setFilters}
                sortBy={sortBy}
                setSortBy={setSortBy}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                activeTab={activeTab}
              />
            )}

            {/* Table Content */}
            <TabsContent value="forsale" className="mt-0">
              <ListingsTable 
                category={filters.category === 'all' ? undefined : filters.category}
                search={filters.search}
              />
            </TabsContent>
            <TabsContent value="all" className="mt-0">
              <MarketExplorerTable 
                filters={filters} 
                sortBy={sortBy} 
                sortOrder={sortOrder}
                filterType="all"
              />
            </TabsContent>
            <TabsContent value="tcg" className="mt-0">
              <MarketExplorerTable 
                filters={filters} 
                sortBy={sortBy} 
                sortOrder={sortOrder}
                filterType="tcg"
              />
            </TabsContent>
            <TabsContent value="sports" className="mt-0">
              <MarketExplorerTable 
                filters={filters} 
                sortBy={sortBy} 
                sortOrder={sortOrder}
                filterType="sports"
              />
            </TabsContent>
            <TabsContent value="gamepoints" className="mt-0">
              <MarketExplorerTable 
                filters={filters} 
                sortBy={sortBy} 
                sortOrder={sortOrder}
                filterType="gamepoints"
              />
            </TabsContent>
            <TabsContent value="graded" className="mt-0">
              <MarketExplorerTable 
                filters={filters} 
                sortBy={sortBy} 
                sortOrder={sortOrder}
                filterType="graded"
              />
            </TabsContent>
            <TabsContent value="figures" className="mt-0">
              <MarketExplorerTable 
                filters={filters} 
                sortBy={sortBy} 
                sortOrder={sortOrder}
                filterType="figures"
              />
            </TabsContent>
            <TabsContent value="trending" className="mt-0">
              <MarketExplorerTable 
                filters={filters} 
                sortBy={sortBy} 
                sortOrder={sortOrder}
                filterType="trending"
              />
            </TabsContent>
            <TabsContent value="gainers" className="mt-0">
              <MarketExplorerTable 
                filters={filters} 
                sortBy="change_24h" 
                sortOrder="desc"
                filterType="gainers"
              />
            </TabsContent>
            <TabsContent value="losers" className="mt-0">
              <MarketExplorerTable 
                filters={filters} 
                sortBy="change_24h" 
                sortOrder="asc"
                filterType="losers"
              />
            </TabsContent>
          </Tabs>
        </main>

        <Footer />
      </div>
  );
};

export default Explorer;