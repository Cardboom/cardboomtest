import { useState, useEffect } from 'react';
import { Plus, X, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface CollectionItem {
  id: string;
  name: string;
  image_url: string | null;
  grade: string | null;
  purchase_price: number | null;
  source: 'portfolio' | 'listing';
}

interface ProfileShowcaseProps {
  userId: string;
  showcaseItems: string[];
  isOwnProfile: boolean;
  onUpdateShowcase: (items: string[]) => Promise<boolean>;
}

export const ProfileShowcase = ({
  userId,
  showcaseItems,
  isOwnProfile,
  onUpdateShowcase
}: ProfileShowcaseProps) => {
  const [allItems, setAllItems] = useState<CollectionItem[]>([]);
  const [showcasedItems, setShowcasedItems] = useState<CollectionItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllItems();
  }, [userId]);

  useEffect(() => {
    if (allItems.length > 0) {
      const items = allItems.filter(p => showcaseItems.includes(p.id));
      setShowcasedItems(items);
    }
  }, [allItems, showcaseItems]);

  const fetchAllItems = async () => {
    try {
      // Fetch portfolio items
      const { data: portfolioData } = await supabase
        .from('portfolio_items')
        .select(`
          id,
          custom_name,
          image_url,
          grade,
          purchase_price,
          market_item:market_items(name, current_price, image_url)
        `)
        .eq('user_id', userId);

      // Fetch user's listings
      const { data: listingsData } = await supabase
        .from('listings')
        .select('id, title, image_url, category, price')
        .eq('seller_id', userId)
        .in('status', ['active', 'reserved'])
        .order('created_at', { ascending: false });

      // Combine both sources
      const portfolioItems: CollectionItem[] = (portfolioData || []).map(item => ({
        id: item.id,
        name: item.custom_name || item.market_item?.name || 'Unknown Item',
        image_url: item.image_url || item.market_item?.image_url,
        grade: item.grade,
        purchase_price: item.purchase_price,
        source: 'portfolio' as const
      }));

      const listingItems: CollectionItem[] = (listingsData || []).map(item => ({
        id: `listing_${item.id}`,
        name: item.title,
        image_url: item.image_url,
        grade: null,
        purchase_price: item.price,
        source: 'listing' as const
      }));

      setAllItems([...portfolioItems, ...listingItems]);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToShowcase = async (itemId: string) => {
    if (showcaseItems.length >= 6) return;
    const newItems = [...showcaseItems, itemId];
    await onUpdateShowcase(newItems);
  };

  const removeFromShowcase = async (itemId: string) => {
    const newItems = showcaseItems.filter(id => id !== itemId);
    await onUpdateShowcase(newItems);
  };

  const getItemName = (item: CollectionItem) => item.name;
  const getItemImage = (item: CollectionItem) => item.image_url || '/placeholder.svg';

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Showcase
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Featured Collection
          </span>
          {isOwnProfile && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Items
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add to Showcase</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground mb-4">
                  Select up to 6 items from your portfolio to display on your profile.
                </p>
                <div className="grid grid-cols-3 gap-4">
                  {allItems.map((item) => {
                    const isShowcased = showcaseItems.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                          isShowcased ? 'border-primary' : 'border-border hover:border-muted-foreground'
                        }`}
                        onClick={() => isShowcased ? removeFromShowcase(item.id) : addToShowcase(item.id)}
                      >
                        <img
                          src={getItemImage(item)}
                          alt={getItemName(item)}
                          className="aspect-square object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-2">
                          <p className="text-xs text-white font-medium truncate">{getItemName(item)}</p>
                          {item.grade && (
                            <span className="text-xs text-amber-400">{item.grade.toUpperCase()}</span>
                          )}
                          {item.source === 'listing' && (
                            <span className="text-xs text-primary ml-1">• For Sale</span>
                          )}
                        </div>
                        {isShowcased && (
                          <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                            <X className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {allItems.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No items in your collection yet. Add some to showcase them here!
                  </p>
                )}
              </DialogContent>
            </Dialog>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {showcasedItems.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {showcasedItems.map((item) => (
              <div
                key={item.id}
                className="relative rounded-lg overflow-hidden group"
              >
                <img
                  src={getItemImage(item)}
                  alt={getItemName(item)}
                  className="aspect-square object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-sm text-white font-medium">{getItemName(item)}</p>
                  {item.grade && (
                    <span className="text-xs text-amber-400">{item.grade.toUpperCase()}</span>
                  )}
                </div>
                {isOwnProfile && (
                  <button
                    onClick={() => removeFromShowcase(item.id)}
                    className="absolute top-2 right-2 bg-destructive/80 hover:bg-destructive rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            {isOwnProfile
              ? 'No items showcased yet. Add items from your portfolio to display them here!'
              : 'This user hasn\'t showcased any items yet.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
