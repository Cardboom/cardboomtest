import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ScrollReveal } from '@/components/ScrollReveal';
import { ListingsTable } from '@/components/market/ListingsTable';
import { WantedBoard } from '@/components/market/WantedBoard';
import { getCategoryLabel, getCategoryIcon } from '@/lib/categoryLabels';
import { 
  Search, BarChart3, ChevronDown, X, ShoppingBag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Markets = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cartItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || 'all');

  // Category options
  const categories = [
    'all',
    'pokemon',
    'onepiece',
    'yugioh',
    'mtg',
    'lorcana',
    'nba',
    'football',
    'figures',
  ];

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    setSearchParams(params, { replace: true });
  }, [searchQuery, selectedCategory, setSearchParams]);

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Marketplace | CardBoom - Buy Trading Cards & Collectibles</title>
        <meta name="description" content="Browse user-listed trading cards and collectibles for sale. Find Pokemon, One Piece, Yu-Gi-Oh!, MTG cards, and more from verified sellers on CardBoom." />
        <meta name="keywords" content="buy trading cards, Pokemon cards for sale, One Piece cards, collectibles marketplace, TCG marketplace, card sellers" />
        <link rel="canonical" href="https://cardboom.com/markets" />
        <meta property="og:title" content="Marketplace | CardBoom" />
        <meta property="og:description" content="Browse user-listed trading cards and collectibles for sale from verified sellers." />
        <meta property="og:url" content="https://cardboom.com/markets" />
        <meta property="og:type" content="website" />
      </Helmet>
      <Header cartCount={cartItems.length} onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <ScrollReveal>
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <ShoppingBag className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold text-foreground">Marketplace</h1>
                  <p className="text-sm text-muted-foreground">Cards listed by real sellers</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search listings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10 w-72 bg-secondary/30 border-border/50 h-9"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={clearSearch}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5">
                      <BarChart3 className="w-4 h-4" />
                      {getCategoryLabel(selectedCategory)}
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                    {categories.map((cat) => (
                      <DropdownMenuItem 
                        key={cat} 
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(selectedCategory === cat && "bg-accent")}
                      >
                        <span className="mr-2">{getCategoryIcon(cat)}</span>
                        {getCategoryLabel(cat)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Listings Table - Only User Sales */}
        <ScrollReveal delay={100}>
          <ListingsTable 
            category={selectedCategory === 'all' ? undefined : selectedCategory}
            search={searchQuery}
          />
        </ScrollReveal>

        {/* Wanted Board / Buy Orders */}
        <ScrollReveal delay={200}>
          <div className="mt-12">
            <WantedBoard />
          </div>
        </ScrollReveal>
      </main>

      <Footer />
    </div>
  );
};

export default Markets;
