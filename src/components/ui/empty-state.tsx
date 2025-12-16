import { cn } from '@/lib/utils';
import { Button } from './button';
import { LucideIcon, Search, Plus, Upload, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  suggestions?: string[];
  examples?: { name: string; image?: string }[];
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState = ({
  icon: Icon = Search,
  title,
  description,
  suggestions,
  examples,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: EmptyStateProps) => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-6 text-center",
      className
    )}>
      {/* Animated Icon */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
        <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/20">
          <Icon className="w-8 h-8 text-primary" />
        </div>
      </div>

      {/* Title & Description */}
      <h3 className="font-display text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mb-6">{description}</p>

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className="mb-6 space-y-2">
          <p className="text-sm text-muted-foreground">Try searching for:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                className="px-3 py-1.5 text-sm rounded-full bg-secondary/50 hover:bg-secondary text-foreground transition-colors border border-border/50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Examples */}
      {examples && examples.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-3">Popular items:</p>
          <div className="flex gap-3 justify-center">
            {examples.slice(0, 4).map((example, i) => (
              <div 
                key={i}
                className="w-16 h-16 rounded-lg bg-secondary/50 border border-border/50 flex items-center justify-center overflow-hidden"
              >
                {example.image ? (
                  <img src={example.image} alt={example.name} className="w-full h-full object-cover" />
                ) : (
                  <Sparkles className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        {actionLabel && onAction && (
          <Button onClick={onAction} className="gap-2">
            <Plus className="w-4 h-4" />
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button variant="outline" onClick={onSecondaryAction} className="gap-2">
            <Upload className="w-4 h-4" />
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  );
};

// Specific empty states for common scenarios
export const EmptySearchState = ({ query }: { query: string }) => (
  <EmptyState
    icon={Search}
    title={`No results for "${query}"`}
    description="Try adjusting your search or filters to find what you're looking for."
    suggestions={['Charizard', 'PSA 10', 'Jordan Rookie', 'Black Lotus']}
  />
);

export const EmptyPortfolioState = ({ onAdd, onImport }: { onAdd?: () => void; onImport?: () => void }) => (
  <EmptyState
    icon={Sparkles}
    title="Start Your Collection"
    description="Add items to track their value over time. Import from CSV or add manually."
    actionLabel="Add First Item"
    onAction={onAdd}
    secondaryActionLabel="Import CSV"
    onSecondaryAction={onImport}
  />
);

export const EmptyWatchlistState = ({ onBrowse }: { onBrowse?: () => void }) => (
  <EmptyState
    icon={Sparkles}
    title="Your Watchlist is Empty"
    description="Add items you're interested in to get price alerts and track changes."
    actionLabel="Browse Market"
    onAction={onBrowse}
  />
);
