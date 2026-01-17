import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CatalogCardSearch } from '@/components/catalog/CatalogCardSearch';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Loader2, TrendingUp, Flame, Clock } from 'lucide-react';

const gameFilters = [
  { value: '', label: 'All Games' },
  { value: 'pokemon', label: 'Pokémon' },
  { value: 'mtg', label: 'Magic: The Gathering' },
  { value: 'onepiece', label: 'One Piece' },
  { value: 'yugioh', label: 'Yu-Gi-Oh!' },
  { value: 'lorcana', label: 'Disney Lorcana' },
];

const CatalogExplorer = () => {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [selectedGame, setSelectedGame] = useState('');

  // Fetch featured/trending catalog cards
  const { data: featuredCards, isLoading } = useQuery({
    queryKey: ['catalog-featured', selectedGame],
    queryFn: async () => {
      let query = supabase
        .from('catalog_cards')
        .select(`
          id, name, game, canonical_key, set_name, image_url, rarity,
          card_price_snapshots (
            median_usd, liquidity_count, confidence, snapshot_date
          )
        `)
        .order('created_at', { ascending: false })
        .limit(24);

      if (selectedGame) {
        query = query.eq('game', selectedGame);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const handleCardSelect = (card: any) => {
    navigate(`/catalog/${card.game}/${card.canonical_key}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Card Catalog - Price Guide & Market Data | CardBoom</title>
        <meta name="description" content="Browse our comprehensive TCG card catalog. Get accurate market prices, historical data, and active listings for Pokémon, Magic, One Piece, and more." />
      </Helmet>

      <Header cartCount={0} onCartClick={() => {}} />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Card Catalog
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Accurate market prices from verified sales. No portfolio uploads, no manipulation.
          </p>

          {/* Search */}
          <div className="max-w-xl mx-auto mb-8">
            <CatalogCardSearch
              placeholder="Search any card by name..."
              onSelect={handleCardSelect}
              className="w-full"
            />
          </div>

          {/* Game Filters */}
          <div className="flex flex-wrap justify-center gap-2">
            {gameFilters.map((filter) => (
              <Button
                key={filter.value}
                variant={selectedGame === filter.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedGame(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Featured Cards */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Flame className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Recently Added</h2>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : featuredCards?.length === 0 ? (
            <Card className="glass">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No cards in catalog yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Cards are being synced from external sources
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {featuredCards?.map((card: any) => {
                const latestPrice = card.card_price_snapshots?.[0];
                
                return (
                  <Card
                    key={card.id}
                    className="glass cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
                    onClick={() => handleCardSelect(card)}
                  >
                    <div className="aspect-[2.5/3.5] relative bg-muted">
                      <img
                        src={card.image_url || '/placeholder.svg'}
                        alt={card.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <Badge
                        className="absolute top-2 left-2 text-xs"
                        variant="secondary"
                      >
                        {card.game.toUpperCase()}
                      </Badge>
                    </div>
                    <CardContent className="p-3">
                      <p className="font-medium text-sm line-clamp-2 mb-1">
                        {card.name}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                        {card.set_name}
                      </p>
                      {latestPrice?.median_usd ? (
                        <p className="font-display font-bold text-primary">
                          {formatPrice(latestPrice.median_usd)}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Price pending
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default CatalogExplorer;
