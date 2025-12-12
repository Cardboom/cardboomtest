import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, TrendingDown, Eye, Heart, ShoppingCart, 
  MessageSquare, ArrowLeftRight, Clock, Users, ChevronLeft,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ItemPriceChart } from '@/components/item/ItemPriceChart';
import { ItemSalesHistory } from '@/components/item/ItemSalesHistory';
import { ItemListings } from '@/components/item/ItemListings';
import { ItemGradeComparison } from '@/components/item/ItemGradeComparison';
import { WhatIfSimulator } from '@/components/item/WhatIfSimulator';
import { TimeToSell } from '@/components/item/TimeToSell';
import { SentimentIndicator } from '@/components/item/SentimentIndicator';
import { mockCollectibles } from '@/data/mockData';

const ItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [isWatching, setIsWatching] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [selectedGrade, setSelectedGrade] = useState('psa10');

  // Find item from mock data or use default
  const item = mockCollectibles.find(c => c.id === id) || {
    id: id || '1',
    name: 'Charizard 1st Edition Holo',
    category: 'pokemon',
    image: '/placeholder.svg',
    price: 420000,
    previousPrice: 374000,
    priceChange: 12.3,
    rarity: 'grail',
    seller: 'PokéVault',
    condition: 'BGS 9.5',
    year: 1999,
    brand: 'Pokémon Base Set',
    trending: true,
  };

  // Calculate realistic metrics
  const change24h = item.priceChange * 0.3;
  const change7d = item.priceChange * 0.6;
  const change30d = item.priceChange;
  const views24h = Math.floor(800 + Math.random() * 600);
  const views7d = views24h * 6;
  const watchlistCount = Math.floor(200 + Math.random() * 300);
  const salesCount30d = Math.floor(20 + Math.random() * 40);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`;
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`;
    return `$${price.toLocaleString()}`;
  };

  const toggleWatchlist = async () => {
    if (!user) {
      toast.error('Please sign in to add to watchlist');
      navigate('/auth');
      return;
    }
    setIsWatching(!isWatching);
    toast.success(isWatching ? 'Removed from watchlist' : 'Added to watchlist');
  };

  const addToPortfolio = () => {
    if (!user) {
      toast.error('Please sign in to add to portfolio');
      navigate('/auth');
      return;
    }
    toast.success('Added to portfolio');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header cartCount={cartItems.length} onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-6">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4 gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>

        {/* Item Header */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Image */}
          <div className="lg:col-span-1">
            <div className="glass rounded-2xl p-4 aspect-square">
              <img 
                src={item.image} 
                alt={item.name}
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="capitalize">
                  {item.category.replace('-', ' ')}
                </Badge>
                {item.trending && (
                  <Badge className="bg-accent text-accent-foreground">
                    🔥 Trending
                  </Badge>
                )}
                <Badge variant="outline">{item.condition}</Badge>
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
                {item.name}
              </h1>
              <p className="text-muted-foreground text-lg">
                {item.brand} • {item.year}
              </p>
            </div>

            {/* Price & Change */}
            <div className="glass rounded-xl p-6">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Current Price</p>
                  <p className="font-display text-4xl font-bold text-foreground">
                    {formatPrice(item.price)}
                  </p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">24h</p>
                    <span className={cn(
                      "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold",
                      change24h >= 0 ? "bg-gain/20 text-gain" : "bg-loss/20 text-loss"
                    )}>
                      {change24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {change24h >= 0 ? '+' : ''}{change24h.toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">7d</p>
                    <span className={cn(
                      "text-sm font-semibold",
                      change7d >= 0 ? "text-gain" : "text-loss"
                    )}>
                      {change7d >= 0 ? '+' : ''}{change7d.toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">30d</p>
                    <span className={cn(
                      "text-sm font-semibold",
                      change30d >= 0 ? "text-gain" : "text-loss"
                    )}>
                      {change30d >= 0 ? '+' : ''}{change30d.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass rounded-xl p-4 text-center">
                <Eye className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-foreground font-semibold">{views24h.toLocaleString()}</p>
                <p className="text-muted-foreground text-xs">Views (24h)</p>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <Eye className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-foreground font-semibold">{views7d.toLocaleString()}</p>
                <p className="text-muted-foreground text-xs">Views (7d)</p>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <Users className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-foreground font-semibold">{watchlistCount}</p>
                <p className="text-muted-foreground text-xs">Watching</p>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <Clock className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-foreground font-semibold">{salesCount30d}</p>
                <p className="text-muted-foreground text-xs">Sales (30d)</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={toggleWatchlist}
                variant={isWatching ? "secondary" : "outline"}
                className="gap-2"
              >
                <Heart className={cn("w-4 h-4", isWatching && "fill-current text-loss")} />
                {isWatching ? 'Watching' : 'Add to Watchlist'}
              </Button>
              <Button onClick={addToPortfolio} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Add to Portfolio
              </Button>
            </div>
          </div>
        </div>

        {/* New: Investment Intelligence Section */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <WhatIfSimulator currentPrice={item.price} itemName={item.name} />
          <TimeToSell category={item.category} rarity={item.rarity} />
          <SentimentIndicator 
            priceChange24h={change24h}
            priceChange7d={change7d}
            views24h={views24h}
            salesCount30d={salesCount30d}
            watchlistCount={watchlistCount}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="chart" className="space-y-6">
          <TabsList className="bg-secondary/50 p-1 rounded-xl">
            <TabsTrigger value="chart" className="rounded-lg">Price Chart</TabsTrigger>
            <TabsTrigger value="grades" className="rounded-lg">Grade Comparison</TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg">Sales History</TabsTrigger>
            <TabsTrigger value="listings" className="rounded-lg">Active Listings</TabsTrigger>
          </TabsList>

          <TabsContent value="chart">
            <ItemPriceChart itemId={id || '1'} />
          </TabsContent>

          <TabsContent value="grades">
            <ItemGradeComparison 
              itemId={id || '1'} 
              selectedGrade={selectedGrade}
              onGradeChange={setSelectedGrade}
            />
          </TabsContent>

          <TabsContent value="history">
            <ItemSalesHistory itemId={id || '1'} />
          </TabsContent>

          <TabsContent value="listings">
            <ItemListings itemId={id || '1'} />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default ItemDetail;
