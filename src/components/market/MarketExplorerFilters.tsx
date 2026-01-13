import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, SortAsc, SortDesc, X, ChevronDown, ChevronUp } from 'lucide-react';
import { MarketFilters, SortOption, MarketTab } from '@/pages/Explorer';
import { cn } from '@/lib/utils';

interface MarketExplorerFiltersProps {
  filters: MarketFilters;
  setFilters: (filters: MarketFilters) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  activeTab: MarketTab;
}

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'pokemon', label: 'Pokémon' },
  { value: 'mtg', label: 'Magic: The Gathering' },
  { value: 'yugioh', label: 'Yu-Gi-Oh!' },
  { value: 'one-piece', label: 'One Piece' },
  { value: 'lorcana', label: 'Lorcana' },
  { value: 'digimon', label: 'Digimon' },
  { value: 'dragon-ball', label: 'Dragon Ball' },
  { value: 'star-wars', label: 'Star Wars' },
  { value: 'sports-nba', label: 'NBA Cards' },
  { value: 'sports-nfl', label: 'NFL Cards' },
  { value: 'sports-mlb', label: 'MLB Cards' },
  { value: 'sports-soccer', label: 'Soccer Cards' },
  { value: 'fifa', label: 'FIFA' },
  { value: 'nba', label: 'NBA' },
  { value: 'baseball', label: 'Baseball' },
  { value: 'figures', label: 'Figures & Collectibles' },
  { value: 'gaming', label: 'Gaming Points' },
];

const GRADES = [
  { value: 'all', label: 'All Grades' },
  { value: 'raw', label: 'Raw (Ungraded)' },
  { value: 'psa10', label: 'PSA 10' },
  { value: 'psa9', label: 'PSA 9' },
  { value: 'psa8', label: 'PSA 8' },
  { value: 'psa7', label: 'PSA 7' },
  { value: 'bgs10', label: 'BGS 10' },
  { value: 'bgs9_5', label: 'BGS 9.5' },
  { value: 'cgc10', label: 'CGC 10' },
];

const LIQUIDITY = [
  { value: 'all', label: 'All Liquidity' },
  { value: 'high', label: 'High Liquidity' },
  { value: 'medium', label: 'Medium Liquidity' },
  { value: 'low', label: 'Low Liquidity' },
];

const SORT_OPTIONS = [
  { value: 'change_24h', label: '24h Change' },
  { value: 'change_7d', label: '7d Change' },
  { value: 'change_30d', label: '30d Change' },
  { value: 'price', label: 'Price' },
  { value: 'volume', label: 'Volume' },
  { value: 'views', label: 'Most Viewed' },
  { value: 'liquidity', label: 'Liquidity' },
  { value: 'recent', label: 'Recently Listed' },
];

export const MarketExplorerFilters = ({
  filters,
  setFilters,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  activeTab,
}: MarketExplorerFiltersProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = (key: keyof MarketFilters, value: any) => {
    setFilters({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    setFilters({
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
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'priceMin' || key === 'priceMax') return value !== null;
    if (key === 'category' || key === 'grade' || key === 'liquidityLevel') return value !== 'all' && value !== '';
    return value !== '';
  });

  return (
    <div className="glass rounded-xl p-4 mb-4 space-y-4">
      {/* Primary Filters Row */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search cards, sets, characters..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10 bg-secondary/50 border-border/50"
          />
        </div>

        {/* Category */}
        <Select value={filters.category} onValueChange={(v) => updateFilter('category', v)}>
          <SelectTrigger className="w-full md:w-48 bg-secondary/50">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Grade (show prominently for graded tab) */}
        {(activeTab === 'graded' || activeTab === 'all') && (
          <Select value={filters.grade} onValueChange={(v) => updateFilter('grade', v)}>
            <SelectTrigger className="w-full md:w-40 bg-secondary/50">
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent>
              {GRADES.map((grade) => (
                <SelectItem key={grade.value} value={grade.value}>{grade.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Sort */}
        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-full md:w-36 bg-secondary/50">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="shrink-0"
          >
            {sortOrder === 'desc' ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />}
          </Button>
        </div>

        {/* Advanced Toggle */}
        <Button
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="shrink-0"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {showAdvanced ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
        </Button>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-4 border-t border-border/50">
          {/* Set/Series */}
          <Input
            placeholder="Set / Series"
            value={filters.setName}
            onChange={(e) => updateFilter('setName', e.target.value)}
            className="bg-secondary/50"
          />

          {/* Character */}
          <Input
            placeholder="Character"
            value={filters.character}
            onChange={(e) => updateFilter('character', e.target.value)}
            className="bg-secondary/50"
          />

          {/* Rarity */}
          <Input
            placeholder="Rarity"
            value={filters.rarity}
            onChange={(e) => updateFilter('rarity', e.target.value)}
            className="bg-secondary/50"
          />

          {/* Price Range */}
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Min $"
              value={filters.priceMin || ''}
              onChange={(e) => updateFilter('priceMin', e.target.value ? Number(e.target.value) : null)}
              className="bg-secondary/50"
            />
            <Input
              type="number"
              placeholder="Max $"
              value={filters.priceMax || ''}
              onChange={(e) => updateFilter('priceMax', e.target.value ? Number(e.target.value) : null)}
              className="bg-secondary/50"
            />
          </div>

          {/* Liquidity */}
          <Select value={filters.liquidityLevel} onValueChange={(v) => updateFilter('liquidityLevel', v)}>
            <SelectTrigger className="bg-secondary/50">
              <SelectValue placeholder="Liquidity" />
            </SelectTrigger>
            <SelectContent>
              {LIQUIDITY.map((liq) => (
                <SelectItem key={liq.value} value={liq.value}>{liq.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters} className="text-muted-foreground">
              <X className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>
      )}

      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2">
          {filters.category && (
            <span className="px-2 py-1 rounded-md bg-primary/20 text-primary text-xs flex items-center gap-1">
              {CATEGORIES.find(c => c.value === filters.category)?.label}
              <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilter('category', '')} />
            </span>
          )}
          {filters.grade && (
            <span className="px-2 py-1 rounded-md bg-accent/20 text-accent text-xs flex items-center gap-1">
              {GRADES.find(g => g.value === filters.grade)?.label}
              <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilter('grade', '')} />
            </span>
          )}
          {filters.search && (
            <span className="px-2 py-1 rounded-md bg-secondary text-foreground text-xs flex items-center gap-1">
              Search: {filters.search}
              <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilter('search', '')} />
            </span>
          )}
        </div>
      )}
    </div>
  );
};