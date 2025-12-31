import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Gavel, Search, Plus, Clock, TrendingUp } from 'lucide-react';
import { useAuctions } from '@/hooks/useAuctions';
import { AuctionCard } from '@/components/auctions/AuctionCard';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'pokemon', label: 'Pokémon' },
  { value: 'yugioh', label: 'Yu-Gi-Oh!' },
  { value: 'onepiece', label: 'One Piece' },
  { value: 'lorcana', label: 'Lorcana' },
  { value: 'mtg', label: 'Magic: The Gathering' },
  { value: 'sports', label: 'Sports Cards' },
];

const Auctions = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('ending_soon');

  const { auctions, isLoading } = useAuctions(
    selectedCategory === 'all' ? undefined : selectedCategory
  );

  const filteredAuctions = auctions?.filter(auction =>
    auction.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedAuctions = [...(filteredAuctions || [])].sort((a, b) => {
    switch (sortBy) {
      case 'ending_soon':
        return new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime();
      case 'price_low':
        return (a.current_bid || a.starting_price) - (b.current_bid || b.starting_price);
      case 'price_high':
        return (b.current_bid || b.starting_price) - (a.current_bid || a.starting_price);
      case 'most_bids':
        return b.bid_count - a.bid_count;
      default:
        return 0;
    }
  });

  const endingSoonCount = auctions?.filter(a => 
    new Date(a.ends_at).getTime() - Date.now() < 3600000
  ).length || 0;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Live Auctions | CardBoom</title>
        <meta name="description" content="Bid on rare trading cards in live auctions. Find Pokémon, Yu-Gi-Oh!, One Piece and more." />
      </Helmet>

      <Header cartCount={0} onCartClick={() => {}} />

      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground flex items-center gap-3">
              <Gavel className="w-8 h-8 text-primary" />
              Live Auctions
            </h1>
            <p className="text-muted-foreground mt-1">
              {auctions?.length || 0} active auctions
              {endingSoonCount > 0 && (
                <Badge variant="destructive" className="ml-2 gap-1">
                  <Clock className="w-3 h-3" />
                  {endingSoonCount} ending soon
                </Badge>
              )}
            </p>
          </div>
          <Button onClick={() => navigate('/sell')} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Auction
          </Button>
        </div>

        {/* Filters */}
        <div className="glass rounded-xl p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search auctions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ending_soon">Ending Soon</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
                <SelectItem value="most_bids">Most Bids</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Auctions Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="glass rounded-xl aspect-[3/4] animate-pulse" />
            ))}
          </div>
        ) : sortedAuctions.length === 0 ? (
          <div className="text-center py-16">
            <Gavel className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No Auctions Found</h2>
            <p className="text-muted-foreground mb-6">
              {searchQuery || selectedCategory !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Be the first to create an auction!'}
            </p>
            <Button onClick={() => navigate('/sell')} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Auction
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sortedAuctions.map(auction => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Auctions;
