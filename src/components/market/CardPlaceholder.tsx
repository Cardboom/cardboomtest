import { cn } from '@/lib/utils';
import { getCategoryIcon, getCategoryLabel } from '@/lib/categoryLabels';
import { ImageOff, Sparkles, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CardPlaceholderProps {
  name: string;
  category: string;
  setName?: string | null;
  rarity?: string | null;
  className?: string;
  showSearchAction?: boolean;
  onSearchClick?: () => void;
}

// Get rarity color
function getRarityColor(rarity?: string | null): string {
  if (!rarity) return 'text-muted-foreground';
  
  const r = rarity.toLowerCase();
  if (r.includes('secret') || r.includes('starlight') || r.includes('ghost')) return 'text-rainbow';
  if (r.includes('ultra') || r.includes('ultimate')) return 'text-gold';
  if (r.includes('super') || r.includes('holo')) return 'text-primary';
  if (r.includes('rare')) return 'text-blue-400';
  return 'text-muted-foreground';
}

// Get gradient based on category
function getCategoryGradient(category: string): string {
  switch (category) {
    case 'pokemon':
      return 'from-yellow-500/20 via-red-500/10 to-blue-500/20';
    case 'mtg':
      return 'from-purple-500/20 via-amber-500/10 to-green-500/20';
    case 'yugioh':
      return 'from-amber-500/20 via-orange-500/10 to-red-500/20';
    case 'gaming':
      return 'from-green-500/20 via-emerald-500/10 to-cyan-500/20';
    case 'one-piece':
      return 'from-red-500/20 via-orange-500/10 to-yellow-500/20';
    case 'lorcana':
      return 'from-blue-500/20 via-purple-500/10 to-pink-500/20';
    default:
      return 'from-primary/20 via-secondary/10 to-accent/20';
  }
}

export function CardPlaceholder({ 
  name, 
  category, 
  setName, 
  rarity,
  className,
  showSearchAction = false,
  onSearchClick
}: CardPlaceholderProps) {
  const categoryIcon = getCategoryIcon(category);
  const categoryLabel = getCategoryLabel(category);
  const rarityColor = getRarityColor(rarity);
  const gradient = getCategoryGradient(category);
  
  // Extract short name for display
  const shortName = name.length > 30 ? name.substring(0, 27) + '...' : name;
  
  return (
    <div 
      className={cn(
        "relative flex flex-col items-center justify-center",
        "bg-gradient-to-br",
        gradient,
        "border border-border/50 rounded-lg overflow-hidden",
        "min-h-[180px] p-4",
        className
      )}
    >
      {/* Category icon */}
      <div className="text-4xl mb-2 opacity-70">
        {categoryIcon}
      </div>
      
      {/* Card name */}
      <p className="text-sm font-medium text-center text-foreground/80 line-clamp-2 mb-1 px-2">
        {shortName}
      </p>
      
      {/* Set name if available */}
      {setName && (
        <p className="text-[10px] text-muted-foreground text-center line-clamp-1">
          {setName}
        </p>
      )}
      
      {/* Rarity badge */}
      {rarity && (
        <div className={cn("flex items-center gap-1 mt-1", rarityColor)}>
          <Sparkles className="w-3 h-3" />
          <span className="text-[10px] font-medium capitalize">{rarity}</span>
        </div>
      )}
      
      {/* Missing image indicator */}
      <div className="absolute top-1.5 right-1.5">
        <ImageOff className="w-3 h-3 text-muted-foreground/50" />
      </div>
      
      {/* Search action button */}
      {showSearchAction && onSearchClick && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute bottom-1 right-1 h-6 px-2 text-[10px] gap-1 opacity-0 hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onSearchClick();
          }}
        >
          <Search className="w-3 h-3" />
          Fix
        </Button>
      )}
    </div>
  );
}

// Simple inline placeholder for table cells
export function InlinePlaceholder({ 
  category, 
  className 
}: { 
  category: string; 
  className?: string;
}) {
  const categoryIcon = getCategoryIcon(category);
  const gradient = getCategoryGradient(category);
  
  return (
    <div 
      className={cn(
        "flex items-center justify-center",
        "bg-gradient-to-br",
        gradient,
        "border border-border/30 rounded",
        "w-12 h-12",
        className
      )}
    >
      <span className="text-xl opacity-70">{categoryIcon}</span>
    </div>
  );
}
