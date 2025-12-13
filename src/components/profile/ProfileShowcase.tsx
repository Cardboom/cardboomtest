import { useState, useEffect } from 'react';
import { Plus, X, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface PortfolioItem {
  id: string;
  custom_name: string | null;
  image_url: string | null;
  grade: string | null;
  purchase_price: number | null;
  market_item?: {
    name: string;
    current_price: number;
    image_url: string | null;
  };
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
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [showcasedItems, setShowcasedItems] = useState<PortfolioItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPortfolioItems();
  }, [userId]);

  useEffect(() => {
    if (portfolioItems.length > 0) {
      const items = portfolioItems.filter(p => showcaseItems.includes(p.id));
      setShowcasedItems(items);
    }
  }, [portfolioItems, showcaseItems]);

  const fetchPortfolioItems = async () => {
    try {
      const { data, error } = await supabase
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

      if (error) throw error;
      setPortfolioItems(data || []);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
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

  const getItemName = (item: PortfolioItem) => {
    return item.custom_name || item.market_item?.name || 'Unknown Item';
  };

  const getItemImage = (item: PortfolioItem) => {
    return item.image_url || item.market_item?.image_url || '/placeholder.svg';
  };

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
                  {portfolioItems.map((item) => {
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
                {portfolioItems.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No items in your portfolio yet. Add some to showcase them here!
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
