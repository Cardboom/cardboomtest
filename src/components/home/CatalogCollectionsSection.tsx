import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ArrowRight, Sparkles, TrendingUp, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/contexts/CurrencyContext';

interface CatalogGame {
  id: string;
  name: string;
  slug: string;
  gradient: string;
  icon: string;
  cardCount: number;
  pricePreview: { minPrice: number; listingCount: number } | null;
}

const CATALOG_GAMES: Omit<CatalogGame, 'cardCount' | 'pricePreview'>[] = [
  {
    id: 'pokemon',
    name: 'Pokémon',
    slug: 'pokemon',
    gradient: 'from-yellow-500 to-orange-500',
    icon: '⚡',
  },
  {
    id: 'onepiece',
    name: 'One Piece',
    slug: 'onepiece',
    gradient: 'from-red-500 to-rose-600',
    icon: '🏴‍☠️',
  },
  {
    id: 'mtg',
    name: 'Magic: The Gathering',
    slug: 'mtg',
    gradient: 'from-purple-500 to-indigo-600',
    icon: '🔮',
  },
];

const useCatalogStats = () => {
  return useQuery({
    queryKey: ['catalog-stats'],
    queryFn: async (): Promise<CatalogGame[]> => {
      // Get card counts per game
      const { data: cards, error: cardsError } = await supabase
        .from('catalog_cards')
        .select('game');

      const countMap: Record<string, number> = {};
      if (!cardsError && cards) {
        cards.forEach((card: { game: string }) => {
          countMap[card.game] = (countMap[card.game] || 0) + 1;
        });
      }

      // Get min listing prices per game from active listings
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select('price, market_items!inner(category)')
        .eq('status', 'active')
        .gt('price', 0)
        .order('price', { ascending: true });

      const priceMap: Record<string, { minPrice: number; listingCount: number }> = {};
      if (!listingsError && listings) {
        listings.forEach((l: { price: number; market_items: { category: string } | null }) => {
          const game = l.market_items?.category?.toLowerCase();
          if (game) {
            if (!priceMap[game]) {
              priceMap[game] = { minPrice: l.price, listingCount: 0 };
            }
            priceMap[game].listingCount++;
          }
        });
      }

      return CATALOG_GAMES.map(game => ({
        ...game,
        cardCount: countMap[game.id] || 0,
        pricePreview: priceMap[game.id] || null,
      }));
    },
    staleTime: 60000, // 1 minute
  });
};

export const CatalogCollectionsSection = () => {
  const { data: games, isLoading } = useCatalogStats();
  const { formatPrice } = useCurrency();

  const displayGames = games || CATALOG_GAMES.map(g => ({ ...g, cardCount: 0, pricePreview: null }));

  return (
    <section className="py-8 sm:py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              <Package className="w-6 h-6 text-primary" />
              Explore Catalog
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Browse cards by game with real market pricing
            </p>
          </div>
          <Link
            to="/catalog"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Game Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayGames.map((game) => (
            <Link
              key={game.id}
              to={`/catalog/${game.slug}`}
              className={cn(
                "group relative overflow-hidden rounded-2xl border border-border/50",
                "bg-card hover:border-primary/30 transition-all duration-300",
                "hover:shadow-lg hover:shadow-primary/5"
              )}
            >
              {/* Gradient Background */}
              <div
                className={cn(
                  "absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity",
                  `bg-gradient-to-br ${game.gradient}`
                )}
              />

              <div className="relative p-6">
                {/* Icon & Name */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center text-2xl",
                      `bg-gradient-to-br ${game.gradient}`
                    )}
                  >
                    {game.icon}
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {game.name}
                    </h3>
                    {game.cardCount > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {game.cardCount.toLocaleString()} cards
                      </p>
                    )}
                  </div>
                </div>

                {/* Price Preview */}
                {game.pricePreview ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-gain" />
                      <span className="text-muted-foreground">From</span>
                      <span className="font-semibold text-foreground">
                        {formatPrice(game.pricePreview.minPrice)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {game.pricePreview.listingCount} listings
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="w-4 h-4" />
                    <span>Browse catalog</span>
                  </div>
                )}

                {/* Arrow */}
                <ArrowRight className="absolute top-6 right-6 w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CatalogCollectionsSection;
