import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useUserHoldings, UserHoldingItem } from '@/hooks/useUserHoldings';
import { Search, Package, Tag, Vault, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCategoryLabel } from '@/lib/categoryLabels';

interface CollectionPickerProps {
  userId: string;
  onSelect: (item: UserHoldingItem) => void;
  selectedId?: string;
  filterType?: 'all' | 'listing' | 'vault' | 'card_instance';
}

export const CollectionPicker = ({ 
  userId, 
  onSelect, 
  selectedId,
  filterType = 'all'
}: CollectionPickerProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { holdings, listings, vaultItems, cardInstances, isLoading } = useUserHoldings(userId);

  // Get items based on filter
  const getFilteredItems = () => {
    let items: UserHoldingItem[] = [];
    
    switch (filterType) {
      case 'listing':
        items = listings;
        break;
      case 'vault':
        items = vaultItems;
        break;
      case 'card_instance':
        items = cardInstances;
        break;
      default:
        items = holdings;
    }

    if (searchQuery) {
      items = items.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return items;
  };

  const items = getFilteredItems();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'listing':
        return <Tag className="w-3 h-3" />;
      case 'vault':
        return <Vault className="w-3 h-3" />;
      default:
        return <Package className="w-3 h-3" />;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'listing':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'vault':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    }
  };

  const formatPrice = (value: number) => {
    return `$${value.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search your collection..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Items Grid */}
      <ScrollArea className="h-[300px]">
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No items found in your collection</p>
            <p className="text-xs mt-1">Add items to your vault or create listings first</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                  selectedId === item.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                {/* Image */}
                <div className="w-14 h-20 rounded-md overflow-hidden bg-muted shrink-0">
                  {item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt={item.title} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{item.title}</span>
                    {selectedId === item.id && (
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", getTypeBadgeColor(item.type))}>
                      {getTypeIcon(item.type)}
                      <span className="ml-1 capitalize">{item.type.replace('_', ' ')}</span>
                    </Badge>
                    {item.grade && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {item.grade}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs text-muted-foreground">
                      {getCategoryLabel(item.category)} • {item.condition.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-medium text-foreground">
                      {formatPrice(item.currentValue)}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
        <span>{items.length} items available</span>
        <span>Total: {formatPrice(items.reduce((sum, i) => sum + i.currentValue, 0))}</span>
      </div>
    </div>
  );
};
