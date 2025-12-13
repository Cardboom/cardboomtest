import { categories } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export const CategoryFilter = ({ selectedCategory, onCategoryChange }: CategoryFilterProps) => {
  return (
    <div className="mb-8 -mx-4 px-4 overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 sm:gap-3 min-w-max sm:flex-wrap sm:min-w-0">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              'px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap',
              selectedCategory === category.id
                ? 'bg-primary text-primary-foreground glow-primary'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
          >
            <span className="mr-1.5 sm:mr-2">{category.icon}</span>
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
};
