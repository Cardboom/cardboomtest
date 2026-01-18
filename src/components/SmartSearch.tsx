import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, TrendingUp, Clock, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getCategoryIcon } from '@/lib/categoryLabels';
import { generateCardUrl } from '@/lib/seoSlug';

interface SearchResult {
  id: string;
  name: string;
  category: string;
  current_price: number;
  change_24h: number | null;
  image_url: string | null;
  is_trending: boolean | null;
  set_name: string | null;
  series: string | null;
  external_id: string | null;
}

interface SmartSearchProps {
  placeholder?: string;
  className?: string;
  onSearch?: (query: string) => void;
  autoFocus?: boolean;
}

export const SmartSearch = ({ placeholder = "Search cards, collectibles...", className, onSearch, autoFocus }: SmartSearchProps) => {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cardboom_recent_searches');
      if (saved) {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      }
    } catch {
      // Silent fail for private browsing or invalid JSON
    }
  }, []);

  // Save recent search
  const saveRecentSearch = (term: string) => {
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    try {
      localStorage.setItem('cardboom_recent_searches', JSON.stringify(updated));
    } catch {
      // Silent fail for private browsing
    }
  };

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        // Maximize search results - include items even without images
        const { data, error } = await supabase
          .from('market_items')
          .select('id, name, category, current_price, change_24h, image_url, is_trending, set_name, series, external_id')
          .ilike('name', `%${query}%`)
          .gt('current_price', 0)
          .order('is_trending', { ascending: false })
          .order('current_price', { ascending: false })
          .limit(12);

        if (!error && data) {
          setResults(data);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        handleSelectResult(results[selectedIndex]);
      } else if (query.trim()) {
        handleSearch();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    saveRecentSearch(result.name);
    setIsOpen(false);
    setQuery('');
    // Use SEO-friendly URL directly instead of /item/:id
    const seoUrl = generateCardUrl({
      name: result.name,
      category: result.category,
      set_name: result.set_name || undefined,
      series: result.series || undefined,
      external_id: result.external_id || undefined,
    });
    navigate(seoUrl);
  };

  const handleSearch = () => {
    if (query.trim()) {
      saveRecentSearch(query.trim());
      onSearch?.(query.trim());
      navigate(`/markets?search=${encodeURIComponent(query.trim())}`);
      setIsOpen(false);
    }
  };

  const handleRecentClick = (term: string) => {
    setQuery(term);
    navigate(`/markets?search=${encodeURIComponent(term)}`);
    setIsOpen(false);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  const CategoryIcon = ({ category }: { category: string }) => {
    const icon = getCategoryIcon(category);
    return <span className="text-lg">{icon}</span>;
  };

  return (
    <div ref={containerRef} className={cn("relative w-full max-w-lg", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="pl-10 pr-10 bg-secondary/50 border-border/50 focus:border-primary/50"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7"
            onClick={clearSearch}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (query || recentSearches.length > 0) && (
        <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Loading state */}
          {isLoading && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4 inline animate-pulse mr-2" />
              Searching...
            </div>
          )}

          {/* Results */}
          {!isLoading && results.length > 0 && (
            <div className="py-2">
              <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase">Results</div>
              {results.map((result, idx) => (
                <button
                  key={result.id}
                  className={cn(
                    "w-full px-3 py-2 flex items-center gap-3 hover:bg-secondary/50 transition-colors text-left",
                    selectedIndex === idx && "bg-secondary/50"
                  )}
                  onClick={() => handleSelectResult(result)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  {result.image_url ? (
                    <img 
                      src={result.image_url} 
                      alt="" 
                      className="w-10 h-10 rounded object-cover bg-secondary"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
                      <CategoryIcon category={result.category} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{result.name}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatPrice(result.current_price)}</span>
                      {result.change_24h !== null && (
                        <span className={result.change_24h >= 0 ? 'text-gain' : 'text-loss'}>
                          {result.change_24h >= 0 ? '+' : ''}{result.change_24h.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                  {result.is_trending && (
                    <TrendingUp className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {!isLoading && query && results.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No results for "{query}"
            </div>
          )}

          {/* Recent searches */}
          {!query && recentSearches.length > 0 && (
            <div className="py-2">
              <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Recent Searches
              </div>
              {recentSearches.map((term, idx) => (
                <button
                  key={idx}
                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-secondary/50 transition-colors text-left text-sm"
                  onClick={() => handleRecentClick(term)}
                >
                  <Search className="w-4 h-4 text-muted-foreground" />
                  {term}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
