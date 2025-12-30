import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Star, 
  Plus, 
  Trash2, 
  GripVertical,
  Eye,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Award,
  Zap
} from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { format } from 'date-fns';

const FEATURE_TYPES = [
  { value: 'homepage', label: 'Homepage Featured', icon: Star },
  { value: 'category_spotlight', label: 'Category Spotlight', icon: Sparkles },
  { value: 'trending', label: 'Trending', icon: TrendingUp },
  { value: 'staff_pick', label: 'Staff Pick', icon: Award },
  { value: 'deal_of_day', label: 'Deal of the Day', icon: Zap },
];

export const FeaturedManager = () => {
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [newFeatured, setNewFeatured] = useState({
    feature_type: 'homepage',
    featured_until: '',
    is_sponsored: false,
    sponsor_fee: 0
  });

  // Fetch featured items
  const { data: featuredItems, isLoading, refetch } = useQuery({
    queryKey: ['admin-featured-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('featured_items')
        .select(`
          *,
          market_item:market_items(id, name, current_price, image_url, category),
          listing:listings(id, title, price, images)
        `)
        .eq('is_active', true)
        .order('position', { ascending: true });

      if (error) throw error;
      return data || [];
    }
  });

  // Search market items
  const { data: searchResults } = useQuery({
    queryKey: ['admin-search-items', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];

      const { data, error } = await supabase
        .from('market_items')
        .select('id, name, current_price, image_url, category')
        .ilike('name', `%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: searchQuery.length >= 2
  });

  // Add featured item
  const addFeaturedMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const maxPosition = featuredItems?.reduce((max, item) => 
        item.position > max ? item.position : max, 0) || 0;

      const { error } = await supabase
        .from('featured_items')
        .insert({
          market_item_id: selectedItem.id,
          feature_type: newFeatured.feature_type,
          position: maxPosition + 1,
          featured_until: newFeatured.featured_until || null,
          is_sponsored: newFeatured.is_sponsored,
          sponsor_fee: newFeatured.sponsor_fee || 0,
          created_by: user?.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Item featured successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-featured-items'] });
      setIsAddOpen(false);
      setSelectedItem(null);
      setSearchQuery('');
      setNewFeatured({
        feature_type: 'homepage',
        featured_until: '',
        is_sponsored: false,
        sponsor_fee: 0
      });
    },
    onError: (error) => {
      toast.error('Failed to feature item: ' + error.message);
    }
  });

  // Remove featured item
  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('featured_items')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Item removed from featured');
      queryClient.invalidateQueries({ queryKey: ['admin-featured-items'] });
    },
    onError: (error) => {
      toast.error('Failed to remove: ' + error.message);
    }
  });

  // Update position
  const updatePositionMutation = useMutation({
    mutationFn: async ({ id, position }: { id: string; position: number }) => {
      const { error } = await supabase
        .from('featured_items')
        .update({ position })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-featured-items'] });
    }
  });

  // Group by feature type
  const groupedItems = FEATURE_TYPES.reduce((acc, type) => {
    acc[type.value] = featuredItems?.filter(item => item.feature_type === type.value) || [];
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {FEATURE_TYPES.map((type) => {
          const Icon = type.icon;
          const count = groupedItems[type.value]?.length || 0;
          return (
            <Card key={type.value} className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{type.label}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Featured Items Manager */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              Featured Items
            </CardTitle>
            <CardDescription>Curate homepage and category spotlights</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Featured
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Featured Item</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Search Item</Label>
                    <Input
                      placeholder="Search by name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchResults && searchResults.length > 0 && (
                      <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                        {searchResults.map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-accent transition-colors ${
                              selectedItem?.id === item.id ? 'bg-accent' : ''
                            }`}
                            onClick={() => {
                              setSelectedItem(item);
                              setSearchQuery(item.name);
                            }}
                          >
                            <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden">
                              {item.image_url && (
                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{item.category}</p>
                            </div>
                            <p className="font-medium text-primary">{formatPrice(item.current_price)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedItem && (
                    <>
                      <div className="p-3 rounded-lg border bg-accent/50">
                        <p className="font-medium">{selectedItem.name}</p>
                        <p className="text-sm text-muted-foreground">{selectedItem.category}</p>
                      </div>

                      <div className="space-y-2">
                        <Label>Feature Type</Label>
                        <Select 
                          value={newFeatured.feature_type} 
                          onValueChange={(v) => setNewFeatured({ ...newFeatured, feature_type: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FEATURE_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Featured Until (Optional)</Label>
                        <Input
                          type="datetime-local"
                          value={newFeatured.featured_until}
                          onChange={(e) => setNewFeatured({ ...newFeatured, featured_until: e.target.value })}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Sponsored Placement</p>
                          <p className="text-sm text-muted-foreground">Paid promotion by seller</p>
                        </div>
                        <Switch
                          checked={newFeatured.is_sponsored}
                          onCheckedChange={(checked) => setNewFeatured({ ...newFeatured, is_sponsored: checked })}
                        />
                      </div>

                      {newFeatured.is_sponsored && (
                        <div className="space-y-2">
                          <Label>Sponsor Fee ($)</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={newFeatured.sponsor_fee}
                            onChange={(e) => setNewFeatured({ ...newFeatured, sponsor_fee: parseFloat(e.target.value) })}
                          />
                        </div>
                      )}

                      <Button 
                        className="w-full" 
                        onClick={() => addFeaturedMutation.mutate()}
                        disabled={addFeaturedMutation.isPending}
                      >
                        <Star className="w-4 h-4 mr-2" />
                        Add to Featured
                      </Button>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              {FEATURE_TYPES.map((type) => {
                const items = groupedItems[type.value];
                if (!items || items.length === 0) return null;

                const Icon = type.icon;
                return (
                  <div key={type.value}>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="w-4 h-4 text-primary" />
                      <h3 className="font-medium">{type.label}</h3>
                      <Badge variant="outline">{items.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {items.map((item, index) => {
                        const marketItem = item.market_item;
                        const listing = item.listing;
                        const displayItem = marketItem || listing;
                        const title = marketItem?.name || listing?.title;
                        const price = marketItem?.current_price || listing?.price;
                        const image = marketItem?.image_url || listing?.images?.[0];

                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-3 rounded-lg border bg-background/50"
                          >
                            <div className="cursor-grab text-muted-foreground">
                              <GripVertical className="w-4 h-4" />
                            </div>
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden">
                              {image && (
                                <img src={image} alt={title} className="w-full h-full object-cover" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{title}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-primary">{formatPrice(price)}</p>
                                {item.is_sponsored && (
                                  <Badge variant="outline" className="text-xs">Sponsored</Badge>
                                )}
                                {item.featured_until && (
                                  <span className="text-xs text-muted-foreground">
                                    Until {format(new Date(item.featured_until), 'MMM dd')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-600"
                              onClick={() => removeMutation.mutate(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {featuredItems?.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No featured items. Add some to curate your homepage!
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
