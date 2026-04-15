import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CatalogCardSearch } from '@/components/catalog/CatalogCardSearch';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Loader2, ChevronRight, ArrowLeft, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const gameFilters = [
  { value: '', label: 'All Games', icon: '🎴' },
  { value: 'pokemon', label: 'Pokémon', icon: '⚡' },
  { value: 'mtg', label: 'Magic: The Gathering', icon: '🧙' },
  { value: 'onepiece', label: 'One Piece', icon: '🏴‍☠️' },
  { value: 'yugioh', label: 'Yu-Gi-Oh!', icon: '👁️' },
  { value: 'lorcana', label: 'Disney Lorcana', icon: '✨' },
  { value: 'dbs', label: 'Dragon Ball Super', icon: '🐉' },
  { value: 'digimon', label: 'Digimon', icon: '🦖' },
  { value: 'unionarena', label: 'Union Arena', icon: '⚔️' },
];

// ─── Sets View: shows all sets for a game ───
function SetsView({ game, onSelectSet }: { game: string; onSelectSet: (setCode: string, setName: string) => void }) {
  const [setSearch, setSetSearch] = useState('');
  
  const { data: sets, isLoading } = useQuery({
    queryKey: ['catalog-sets', game],
    queryFn: async () => {
      let query = externalSupabase
        .from('catalog_cards')
        .select('set_code, set_name, game, image_url, rarity');

      if (game) query = query.eq('game', game);

      const { data, error } = await query;
      if (error) throw error;

      // Group by set, collect up to 4 sample images per set
      const setMap = new Map<string, { set_code: string; set_name: string; game: string; card_count: number; sample_images: string[] }>();
      for (const card of (data || [])) {
        const existing = setMap.get(card.set_code);
        if (existing) {
          existing.card_count++;
          if (card.image_url && existing.sample_images.length < 4 && !existing.sample_images.includes(card.image_url)) {
            existing.sample_images.push(card.image_url);
          }
        } else {
          setMap.set(card.set_code, {
            set_code: card.set_code,
            set_name: card.set_name,
            game: card.game,
            card_count: 1,
            sample_images: card.image_url ? [card.image_url] : [],
          });
        }
      }
      return Array.from(setMap.values()).sort((a, b) => a.set_name.localeCompare(b.set_name));
    },
  });

  const filtered = useMemo(() => {
    if (!sets) return [];
    if (!setSearch.trim()) return sets;
    const q = setSearch.toLowerCase();
    return sets.filter(s => s.set_name.toLowerCase().includes(q));
  }, [sets, setSearch]);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-semibold">{game ? gameFilters.find(g => g.value === game)?.label : 'All'} Sets</h2>
        <Badge variant="secondary">{sets?.length || 0} sets</Badge>
      </div>
      
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search sets..."
          value={setSearch}
          onChange={e => setSetSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="glass"><CardContent className="py-12 text-center text-muted-foreground">No sets found</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(set => (
            <Card
              key={set.set_code}
              className="glass cursor-pointer hover:border-primary/50 transition-all group"
              onClick={() => onSelectSet(set.set_code, set.set_name)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  {set.sample_image ? (
                    <img src={set.sample_image} alt={set.set_name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🎴</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">{set.set_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px]">{set.game.toUpperCase()}</Badge>
                    <span className="text-xs text-muted-foreground">{set.card_count} cards</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Cards View: shows cards in a set ───
function CardsView({ setCode, setName, game }: { setCode: string; setName: string; game: string }) {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();

  const { data: cards, isLoading } = useQuery({
    queryKey: ['catalog-set-cards', setCode],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('catalog_cards')
        .select('*')
        .eq('set_code', setCode)
        .order('card_number', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch prices from internal DB by canonical_key
  const canonicalKeys = useMemo(() => (cards || []).map(c => c.canonical_key), [cards]);
  
  const { data: prices } = useQuery({
    queryKey: ['catalog-prices', canonicalKeys],
    enabled: canonicalKeys.length > 0,
    queryFn: async () => {
      if (canonicalKeys.length === 0) return {};
      const { data, error } = await supabase
        .from('card_prices')
        .select('canonical_card_key, price, source, updated_at')
        .in('canonical_card_key', canonicalKeys)
        .order('updated_at', { ascending: false });
      if (error) return {};
      // Group by key, take latest
      const map: Record<string, number> = {};
      for (const row of (data || [])) {
        if (!map[row.canonical_card_key]) {
          map[row.canonical_card_key] = row.price;
        }
      }
      return map;
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-semibold">{setName}</h2>
        <Badge variant="secondary">{cards?.length || 0} cards</Badge>
      </div>

      {cards?.length === 0 ? (
        <Card className="glass"><CardContent className="py-12 text-center text-muted-foreground">No cards in this set yet</CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {cards?.map(card => {
            const price = prices?.[card.canonical_key];
            return (
              <Card
                key={card.id}
                className="group glass cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
                onClick={() => navigate(`/catalog/${card.game}/${card.canonical_key}`)}
              >
                <div className="aspect-[2.5/3.5] relative bg-muted">
                  <img
                    src={card.image_url || '/placeholder.svg'}
                    alt={card.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {card.card_number && (
                    <Badge className="absolute top-2 right-2 text-[10px] font-mono bg-black/60 text-white border-0" variant="outline">
                      #{card.card_number}
                    </Badge>
                  )}
                  {card.rarity && (
                    <Badge className="absolute top-2 left-2 text-[10px]" variant="secondary">
                      {card.rarity}
                    </Badge>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-medium">View Card</div>
                  </div>
                </div>
                <CardContent className="p-3">
                  <p className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">{card.name}</p>
                  {card.variant && card.variant !== 'Normal' && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 mb-1">{card.variant}</Badge>
                  )}
                  {price ? (
                    <p className="font-display font-bold text-primary">{formatPrice(price)}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">—</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Catalog Explorer ───
const CatalogExplorer = () => {
  const navigate = useNavigate();
  const { game: gameParam } = useParams<{ game?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSet = searchParams.get('set');
  const selectedSetName = searchParams.get('setName');
  const [selectedGame, setSelectedGame] = useState(gameParam || '');

  useEffect(() => {
    if (gameParam) setSelectedGame(gameParam);
  }, [gameParam]);

  const handleSelectSet = (setCode: string, setName: string) => {
    setSearchParams({ set: setCode, setName });
  };

  const handleBack = () => {
    setSearchParams({});
  };

  const handleCardSelect = (card: any) => {
    navigate(`/catalog/${card.game}/${card.canonical_key}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{selectedSet ? `${selectedSetName} - Card Catalog` : 'Card Catalog - Price Guide & Market Data'} | CardBoom</title>
        <meta name="description" content="Browse our comprehensive TCG card catalog. Get accurate market prices for Pokémon, Magic, One Piece, and more." />
      </Helmet>

      <Header cartCount={0} onCartClick={() => {}} />

      <main className="container mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Card Catalog</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-6">
            Browse sets and cards with real market prices.
          </p>

          <div className="max-w-xl mx-auto mb-6">
            <CatalogCardSearch placeholder="Search any card by name..." onSelect={handleCardSelect} className="w-full" />
          </div>

          {/* Game Filters */}
          <div className="flex flex-wrap justify-center gap-2">
            {gameFilters.map(filter => (
              <Button
                key={filter.value}
                variant={selectedGame === filter.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedGame(filter.value);
                  setSearchParams({});
                }}
              >
                <span className="mr-1">{filter.icon}</span>
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Breadcrumb */}
        {selectedSet && (
          <div className="flex items-center gap-2 mb-6 text-sm">
            <button onClick={handleBack} className="text-primary hover:underline flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              All Sets
            </button>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground font-medium">{selectedSetName}</span>
          </div>
        )}

        {/* Content */}
        {selectedSet ? (
          <CardsView setCode={selectedSet} setName={selectedSetName || selectedSet} game={selectedGame} />
        ) : (
          <SetsView game={selectedGame} onSelectSet={handleSelectSet} />
        )}
      </main>

      <Footer />
    </div>
  );
};

export default CatalogExplorer;
