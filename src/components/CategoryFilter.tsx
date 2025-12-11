import { categories } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export const CategoryFilter = ({ selectedCategory, onCategoryChange }: CategoryFilterProps) => {
  return (
    <div className="flex flex-wrap gap-3 mb-8">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium transition-all duration-300',
            selectedCategory === category.id
              ? 'bg-primary text-primary-foreground glow-primary'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          )}
        >
          <span className="mr-2">{category.icon}</span>
          {category.name}
        </button>
      ))}
    </div>
  );
};
