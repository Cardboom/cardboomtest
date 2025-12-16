import { mainCategories } from '@/lib/categoryLabels';
import { cn } from '@/lib/utils';

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export const CategoryFilter = ({ selectedCategory, onCategoryChange }: CategoryFilterProps) => {
  return (
    <div className="mb-8 -mx-4 px-4 overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 sm:gap-3 min-w-max sm:flex-wrap sm:min-w-0">
        {mainCategories.map((category) => (
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
            <span>{category.icon}</span>
            <span>{category.label}</span>
            {category.count > 0 && (
              <span className="text-xs opacity-70">
                ({category.count >= 1000 ? `${(category.count / 1000).toFixed(0)}K` : category.count})
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};