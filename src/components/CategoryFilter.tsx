import { mainCategories } from '@/lib/categoryLabels';
import { useCategoryCounts } from '@/hooks/useCategoryCounts';
import { cn } from '@/lib/utils';

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export const CategoryFilter = ({ selectedCategory, onCategoryChange }: CategoryFilterProps) => {
  const { counts, totalCount, loading } = useCategoryCounts();

  const formatCount = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Get count for a category, handling various category ID formats
  const getCategoryCount = (categoryId: string): number => {
    if (categoryId === 'all') return totalCount;
    
    // Check direct match
    if (counts[categoryId] !== undefined) return counts[categoryId];
    
    // Handle onepiece vs one-piece
    if (categoryId === 'one-piece' && counts['onepiece'] !== undefined) {
      return counts['onepiece'] + (counts['one-piece'] || 0);
    }
    
    return 0;
  };

  // Show all main categories - don't filter based on count
  // Categories may have listings even if no market_items

  return (
    <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm py-4 mb-4 -mx-4 px-4 overflow-x-auto scrollbar-hide border-b border-border/20">
      <div className="flex gap-2 sm:gap-3 min-w-max sm:flex-wrap sm:min-w-0">
        {mainCategories.map((category) => {
          const count = getCategoryCount(category.id);
          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={cn(
                'px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap flex items-center gap-1.5',
                selectedCategory === category.id
                  ? 'bg-primary text-primary-foreground glow-primary'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              <span>{category.label}</span>
              {!loading && count > 0 && (
                <span className="text-xs opacity-70">
                  ({formatCount(count)})
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
