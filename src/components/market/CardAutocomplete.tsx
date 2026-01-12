import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Sparkles, TrendingUp, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';

interface CardSuggestion {
  id: string;
  name: string;
  category: string;
  set_name: string | null;
  current_price: number;
  image_url: string | null;
  liquidity: string | null;
}

interface CardAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectCard?: (card: CardSuggestion) => void;
  category?: string;
  placeholder?: string;
  className?: string;
}

export const CardAutocomplete = ({
  value,
  onChange,
  onSelectCard,
  category,
  placeholder = "Search for a card...",
  className,
}: CardAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<CardSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { formatPrice } = useCurrency();

  // Fetch suggestions based on query
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (value.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        // Build query to search market_items
        let query = supabase
          .from('market_items')
          .select('id, name, category, set_name, current_price, image_url, liquidity')
          .gt('current_price', 0);

        // Multi-word search: split query and match all words
        const words = value.toLowerCase().split(/\s+/).filter(w => w.length > 1);
        if (words.length > 0) {
          // Use ilike for each word
          words.forEach(word => {
            query = query.ilike('name', `%${word}%`);
          });
        }

        // Filter by category if provided
        if (category && category !== 'all') {
          query = query.eq('category', category);
        }

        const { data, error } = await query
          .order('views_24h', { ascending: false, nullsFirst: false })
          .limit(10);

        if (error) throw error;
        setSuggestions(data || []);
      } catch (error) {
        console.error('Error fetching card suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [value, category]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectCard(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleSelectCard = (card: CardSuggestion) => {
    onChange(card.name);
    onSelectCard?.(card);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      pokemon: 'Pokémon',
      yugioh: 'Yu-Gi-Oh!',
      mtg: 'MTG',
      onepiece: 'One Piece',
      lorcana: 'Lorcana',
      nba: 'NBA',
      football: 'Football',
      figures: 'Figures',
    };
    return labels[cat] || cat;
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => value.length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && (value.length >= 2 || suggestions.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {suggestions.length > 0 ? (
            <ScrollArea className="max-h-[280px]">
              <div className="p-1">
                <p className="text-xs text-muted-foreground px-2 py-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Cards from our database
                </p>
                {suggestions.map((card, index) => (
                  <button
                    key={card.id}
                    onClick={() => handleSelectCard(card)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors",
                      index === selectedIndex
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted/50"
                    )}
                  >
                    {/* Card Image */}
                    <div className="w-10 h-14 rounded overflow-hidden bg-muted flex-shrink-0">
                      {card.image_url ? (
                        <img
                          src={card.image_url}
                          alt={card.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    {/* Card Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{card.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {getCategoryLabel(card.category)}
                        </Badge>
                        {card.set_name && (
                          <span className="text-[10px] text-muted-foreground truncate">
                            {card.set_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price & Liquidity */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-medium text-primary">
                        {formatPrice(card.current_price)}
                      </p>
                      {card.liquidity && (
                        <div className="flex items-center gap-1 justify-end">
                          <TrendingUp className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground capitalize">
                            {card.liquidity}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          ) : value.length >= 2 && !isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <p>No matching cards found</p>
              <p className="text-xs mt-1">You can still post this as a custom want</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};