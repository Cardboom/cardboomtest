import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  name: string;
  game: string;
  set_name: string | null;
  canonical_key: string;
  image_url: string | null;
}

interface CatalogCardSearchProps {
  className?: string;
  placeholder?: string;
  onSelect?: (card: SearchResult) => void;
}

export const CatalogCardSearch = ({ 
  className, 
  placeholder = "Search cards...",
  onSelect 
}: CatalogCardSearchProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  const debouncedQuery = useDebounce(query, 300);

  const searchCards = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('catalog_cards')
        .select('id, name, game, set_name, canonical_key, image_url')
        .ilike('name', `%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setResults(data || []);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    searchCards(debouncedQuery);
  }, [debouncedQuery, searchCards]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        resultsRef.current && 
        !resultsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (card: SearchResult) => {
    if (onSelect) {
      onSelect(card);
    } else {
      navigate(`/catalog/${card.game}/${card.canonical_key}`);
    }
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const gameColors: Record<string, string> = {
    pokemon: 'bg-yellow-500/20 text-yellow-600',
    mtg: 'bg-purple-500/20 text-purple-600',
    onepiece: 'bg-red-500/20 text-red-600',
    yugioh: 'bg-blue-500/20 text-blue-600',
    lorcana: 'bg-cyan-500/20 text-cyan-600',
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 max-h-[400px] overflow-y-auto"
        >
          {results.map((card, index) => (
            <button
              key={card.id}
              className={cn(
                "w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left",
                selectedIndex === index && "bg-muted/50"
              )}
              onClick={() => handleSelect(card)}
            >
              <img
                src={card.image_url || '/placeholder.svg'}
                alt={card.name}
                className="w-10 h-14 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{card.name}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {card.set_name}
                </p>
              </div>
              <Badge className={gameColors[card.game] || 'bg-muted'}>
                {card.game.toUpperCase()}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.length >= 2 && !isLoading && results.length === 0 && (
        <div
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 p-4 text-center text-muted-foreground"
        >
          No cards found for "{query}"
        </div>
      )}
    </div>
  );
};
