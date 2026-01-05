import { useState, useEffect } from 'react';
import { Sparkles, Search, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

interface CollectionItem {
  id: string;
  rawId: string; // The actual UUID without prefix
  name: string;
  grade: string | null;
  image_url: string | null;
  category: string;
  source: 'portfolio' | 'listing';
}

interface FeaturedCardSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFeaturedId: string | null;
  userId: string;
  onSelect: (cardId: string | null) => Promise<boolean>;
}

export const FeaturedCardSelector = ({
  open,
  onOpenChange,
  currentFeaturedId,
  userId,
  onSelect,
}: FeaturedCardSelectorProps) => {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(currentFeaturedId);

  useEffect(() => {
    if (open) {
      fetchAllItems();
      setSelectedId(currentFeaturedId);
    }
  }, [open, userId, currentFeaturedId]);

  const fetchAllItems = async () => {
    setLoading(true);
    try {
      // Fetch portfolio items
      const { data: portfolioData } = await supabase
        .from('portfolio_items')
        .select(`
          id,
          custom_name,
          grade,
          image_url,
          market_items (id, name, image_url, current_price, category)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Fetch user's listings
      const { data: listingsData } = await supabase
        .from('listings')
        .select('id, title, image_url, category')
        .eq('seller_id', userId)
        .in('status', ['active', 'reserved'])
        .order('created_at', { ascending: false });

      // Combine both sources
      const portfolioItems: CollectionItem[] = (portfolioData || []).map(item => ({
        id: item.id,
        rawId: item.id,
        name: item.custom_name || item.market_items?.name || 'Unknown',
        grade: item.grade,
        image_url: item.image_url || item.market_items?.image_url,
        category: item.market_items?.category || 'tcg',
        source: 'portfolio' as const
      }));

      const listingItems: CollectionItem[] = (listingsData || []).map(item => ({
        id: `listing_${item.id}`,
        rawId: item.id, // Store the actual UUID
        name: item.title,
        grade: null,
        image_url: item.image_url,
        category: item.category || 'tcg',
        source: 'listing' as const
      }));

      setItems([...portfolioItems, ...listingItems]);
    } catch (error) {
      console.error('Error fetching collection items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    // Find the selected item and use rawId for saving
    const selectedItem = items.find(item => item.id === selectedId);
    const idToSave = selectedItem?.rawId || selectedId;
    const success = await onSelect(idToSave);
    setSaving(false);
    if (success) {
      onOpenChange(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    const success = await onSelect(null);
    setSaving(false);
    if (success) {
      setSelectedId(null);
      onOpenChange(false);
    }
  };

  const filteredItems = items.filter((item) => {
    return item.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold" />
            Select Featured Card
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose a card from your collection to showcase in stunning 3D on your profile.
          </p>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search your collection..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No items in your collection</p>
              <p className="text-sm">Add items to your portfolio to feature them here</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredItems.map((item) => {
                  const imageUrl = item.image_url || '/placeholder.svg';
                  const isSelected = selectedId === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedId(isSelected ? null : item.id)}
                      className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all ${
                        isSelected
                          ? 'border-primary ring-2 ring-primary/50 scale-[1.02]'
                          : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      <img
                        src={imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      
                      {/* Card info */}
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <p className="text-white text-xs font-medium truncate">{item.name}</p>
                        {item.grade && (
                          <Badge variant="secondary" className="text-[10px] mt-1 bg-gold/20 text-gold">
                            {item.grade}
                          </Badge>
                        )}
                        {item.source === 'listing' && (
                          <Badge variant="outline" className="text-[10px] mt-1 ml-1 border-primary/50 text-primary">
                            For Sale
                          </Badge>
                        )}
                      </div>

                      {/* Selection indicator */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <div>
            {currentFeaturedId && (
              <Button
                variant="ghost"
                onClick={handleRemove}
                disabled={saving}
                className="text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4 mr-2" />
                Remove Featured
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !selectedId}>
              {saving ? 'Saving...' : 'Set as Featured'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
