import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatCategoryName } from '@/lib/categoryFormatter';
import { 
  RefreshCw, 
  Search, 
  Edit2,
  Save,
  X,
  Database,
  TrendingUp,
  Plus,
  Upload,
  Image as ImageIcon,
  Trash2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Zap,
  Filter,
  Settings,
} from 'lucide-react';

type LiquidityLevel = 'high' | 'medium' | 'low';

interface MarketItem {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  current_price: number;
  base_price: number;
  change_24h: number | null;
  change_7d: number | null;
  change_30d: number | null;
  is_trending: boolean | null;
  liquidity: LiquidityLevel | null;
  data_source: string | null;
  image_url: string | null;
  updated_at: string;
  set_name: string | null;
  rarity: string | null;
  psa10_price: number | null;
  psa9_price: number | null;
  raw_price: number | null;
  // Catalog identity fields
  set_code: string | null;
  card_number: string | null;
  cvi_key: string | null;
  language: string | null;
  variant: string | null;
  normalized_key: string | null;
}

type DataQualityFilter = 'all' | 'missing_set_code' | 'missing_card_number' | 'missing_image';

const ITEMS_PER_PAGE = 25;

export const MarketItemsManager = () => {
  const { formatPrice } = useCurrency();
  const [items, setItems] = useState<MarketItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<MarketItem | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', display_name: '' });
  const [dataQualityFilter, setDataQualityFilter] = useState<DataQualityFilter>('all');
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);
  const [bulkEditField, setBulkEditField] = useState<string>('set_code');
  const [bulkEditValue, setBulkEditValue] = useState<string>('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [newItem, setNewItem] = useState<Partial<MarketItem>>({
    name: '',
    category: 'pokemon',
    current_price: 0,
    base_price: 0,
    liquidity: 'medium',
  });
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Fetch market items with pagination
  const fetchItems = async () => {
    setIsLoading(true);
    try {
      // Get total count
      let countQuery = supabase
        .from('market_items')
        .select('*', { count: 'exact', head: true });
      
      if (categoryFilter !== 'all') {
        countQuery = countQuery.eq('category', categoryFilter);
      }
      if (searchQuery) {
        countQuery = countQuery.ilike('name', `%${searchQuery}%`);
      }
      // Apply data quality filters
      if (dataQualityFilter === 'missing_set_code') {
        countQuery = countQuery.or('set_code.is.null,set_code.eq.');
      } else if (dataQualityFilter === 'missing_card_number') {
        countQuery = countQuery.or('card_number.is.null,card_number.eq.');
      } else if (dataQualityFilter === 'missing_image') {
        countQuery = countQuery.or('image_url.is.null,image_url.eq.');
      }
      
      const { count } = await countQuery;
      setTotalCount(count || 0);

      // Get paginated data
      let query = supabase
        .from('market_items')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }
      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }
      // Apply data quality filters
      if (dataQualityFilter === 'missing_set_code') {
        query = query.or('set_code.is.null,set_code.eq.');
      } else if (dataQualityFilter === 'missing_card_number') {
        query = query.or('card_number.is.null,card_number.eq.');
      } else if (dataQualityFilter === 'missing_image') {
        query = query.or('image_url.is.null,image_url.eq.');
      }

      const { data, error } = await query;

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to fetch market items');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [currentPage, categoryFilter, dataQualityFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchItems();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Get unique categories
  const [categories, setCategories] = useState<string[]>([]);
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('market_items')
        .select('category')
        .order('category');
      
      if (data) {
        const uniqueCategories = [...new Set(data.map(d => d.category))];
        setCategories(uniqueCategories);
      }
    };
    fetchCategories();
  }, []);

  // Stats
  const stats = {
    totalItems: totalCount,
    trending: items.filter(i => i.is_trending).length,
    withImages: items.filter(i => i.image_url).length,
    categories: categories.length,
  };

  // Save edited item
  const handleSave = async () => {
    if (!editingItem) return;

    try {
      const { error } = await supabase
        .from('market_items')
        .update({
          name: editingItem.name,
          current_price: editingItem.current_price,
          base_price: editingItem.base_price,
          change_24h: editingItem.change_24h,
          change_7d: editingItem.change_7d,
          change_30d: editingItem.change_30d,
          is_trending: editingItem.is_trending,
          liquidity: editingItem.liquidity,
          category: editingItem.category,
          subcategory: editingItem.subcategory,
          image_url: editingItem.image_url,
          set_name: editingItem.set_name,
          rarity: editingItem.rarity,
          psa10_price: editingItem.psa10_price,
          psa9_price: editingItem.psa9_price,
          raw_price: editingItem.raw_price,
          // Catalog identity fields
          set_code: editingItem.set_code,
          card_number: editingItem.card_number,
          cvi_key: editingItem.cvi_key,
          language: editingItem.language,
          variant: editingItem.variant,
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      toast.success('Item updated successfully');
      setEditingItem(null);
      fetchItems();
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    }
  };

  // Bulk edit handler
  const handleBulkEdit = async () => {
    if (selectedItems.size === 0 || !bulkEditValue.trim()) {
      toast.error('Select items and enter a value');
      return;
    }

    setIsBulkUpdating(true);
    try {
      const updateData: Record<string, string> = {};
      updateData[bulkEditField] = bulkEditValue.trim();

      const { error } = await supabase
        .from('market_items')
        .update(updateData)
        .in('id', Array.from(selectedItems));

      if (error) throw error;

      toast.success(`Updated ${selectedItems.size} item(s)`);
      setShowBulkEditDialog(false);
      setBulkEditValue('');
      setSelectedItems(new Set());
      fetchItems();
    } catch (error) {
      console.error('Error bulk updating items:', error);
      toast.error('Failed to bulk update items');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Handle image upload for an item
  const handleImageUpload = async (itemId: string, file: File) => {
    setUploadingId(itemId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `market-items/${itemId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('card-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('card-images')
        .getPublicUrl(fileName);

      // Update the item with new image URL
      const { error: updateError } = await supabase
        .from('market_items')
        .update({ image_url: publicUrl })
        .eq('id', itemId);

      if (updateError) throw updateError;

      toast.success('Image uploaded successfully');
      fetchItems();
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingId(null);
    }
  };

  // Add new item
  const handleAddItem = async () => {
    if (!newItem.name || !newItem.category) {
      toast.error('Name and category are required');
      return;
    }

    try {
      const { error } = await supabase
        .from('market_items')
        .insert({
          name: newItem.name,
          category: newItem.category,
          current_price: newItem.current_price || 0,
          base_price: newItem.base_price || 0,
          liquidity: newItem.liquidity || 'medium',
          subcategory: newItem.subcategory,
          set_name: newItem.set_name,
          rarity: newItem.rarity,
          psa10_price: newItem.psa10_price,
          psa9_price: newItem.psa9_price,
          raw_price: newItem.raw_price,
        });

      if (error) throw error;

      toast.success('Item added successfully');
      setShowAddDialog(false);
      setNewItem({
        name: '',
        category: 'pokemon',
        current_price: 0,
        base_price: 0,
        liquidity: 'medium',
      });
      fetchItems();
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    }
  };

  // Delete item
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase
        .from('market_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Item deleted');
      fetchItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  // Batch delete items
  const handleBatchDelete = async () => {
    if (selectedItems.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedItems.size} item(s)? This cannot be undone.`)) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('market_items')
        .delete()
        .in('id', Array.from(selectedItems));

      if (error) throw error;

      toast.success(`Successfully deleted ${selectedItems.size} item(s)`);
      setSelectedItems(new Set());
      fetchItems();
    } catch (error) {
      console.error('Error batch deleting items:', error);
      toast.error('Failed to delete items');
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle item selection
  const toggleItemSelection = (id: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedItems(newSelection);
  };

  // Toggle select all on current page
  const toggleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  };

  // Sync prices
  const handleSyncPrices = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-pricecharting-listings');
      
      if (error) throw error;

      toast.success(`Synced ${data?.updated || 0} prices from PriceCharting API`);
      fetchItems();
    } catch (error) {
      console.error('Error syncing prices:', error);
      toast.error('Failed to sync prices');
    } finally {
      setIsSyncing(false);
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Market Items Manager</h2>
          {selectedItems.size > 0 && (
            <Badge variant="secondary" className="text-sm">
              {selectedItems.size} selected
            </Badge>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedItems.size > 0 && (
            <>
              <Button 
                variant="outline"
                onClick={() => setShowBulkEditDialog(true)}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                Bulk Edit ({selectedItems.size})
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleBatchDelete} 
                disabled={isDeleting}
                className="gap-2"
              >
                {isDeleting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete {selectedItems.size}
              </Button>
            </>
          )}
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Market Item</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="col-span-2 space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={newItem.name || ''}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="Card name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select
                    value={newItem.category || 'pokemon'}
                    onValueChange={(value) => setNewItem({ ...newItem, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Include all known categories plus existing from DB */}
                      {[...new Set([
                        'pokemon', 'mtg', 'yugioh', 'onepiece', 'lorcana', 'digimon', 
                        'dragon-ball', 'star-wars', 'nba', 'fifa', 'baseball', 'football',
                        'sports-nba', 'sports-nfl', 'sports-mlb', 'figures', 'gaming', 'tcg',
                        ...categories
                      ])].sort().map(cat => (
                        <SelectItem key={cat} value={cat}>{formatCategoryName(cat)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subcategory</Label>
                  <Input
                    value={newItem.subcategory || ''}
                    onChange={(e) => setNewItem({ ...newItem, subcategory: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Set Name</Label>
                  <Input
                    value={newItem.set_name || ''}
                    onChange={(e) => setNewItem({ ...newItem, set_name: e.target.value })}
                    placeholder="Base Set, Neo Genesis, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rarity</Label>
                  <Input
                    value={newItem.rarity || ''}
                    onChange={(e) => setNewItem({ ...newItem, rarity: e.target.value })}
                    placeholder="Common, Rare, Ultra Rare, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Price ($)</Label>
                  <Input
                    type="number"
                    value={newItem.current_price || 0}
                    onChange={(e) => setNewItem({ ...newItem, current_price: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Base Price ($)</Label>
                  <Input
                    type="number"
                    value={newItem.base_price || 0}
                    onChange={(e) => setNewItem({ ...newItem, base_price: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>PSA 10 Price ($)</Label>
                  <Input
                    type="number"
                    value={newItem.psa10_price || ''}
                    onChange={(e) => setNewItem({ ...newItem, psa10_price: parseFloat(e.target.value) || null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>PSA 9 Price ($)</Label>
                  <Input
                    type="number"
                    value={newItem.psa9_price || ''}
                    onChange={(e) => setNewItem({ ...newItem, psa9_price: parseFloat(e.target.value) || null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Raw Price ($)</Label>
                  <Input
                    type="number"
                    value={newItem.raw_price || ''}
                    onChange={(e) => setNewItem({ ...newItem, raw_price: parseFloat(e.target.value) || null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Liquidity</Label>
                  <Select
                    value={newItem.liquidity || 'medium'}
                    onValueChange={(value: LiquidityLevel) => setNewItem({ ...newItem, liquidity: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                <Button onClick={handleAddItem}>Add Item</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button 
            onClick={handleSyncPrices} 
            disabled={isSyncing}
            variant="outline"
            className="gap-2"
          >
            {isSyncing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Sync Prices
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Database className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalItems.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <TrendingUp className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trending</p>
                <p className="text-2xl font-bold text-foreground">{stats.trending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <ImageIcon className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">With Images</p>
                <p className="text-2xl font-bold text-foreground">{stats.withImages}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/10">
                <Filter className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold text-foreground">{stats.categories}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={(value) => {
            setCategoryFilter(value);
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{formatCategoryName(cat)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dataQualityFilter} onValueChange={(value: DataQualityFilter) => {
            setDataQualityFilter(value);
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Data Quality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="missing_set_code">⚠️ Missing Set Code</SelectItem>
              <SelectItem value="missing_card_number">⚠️ Missing Card #</SelectItem>
              <SelectItem value="missing_image">⚠️ Missing Image</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchItems} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </CardContent>
      </Card>

      {/* Bulk Edit Dialog */}
      <Dialog open={showBulkEditDialog} onOpenChange={setShowBulkEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Edit {selectedItems.size} Items</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Field to Update</Label>
              <Select value={bulkEditField} onValueChange={setBulkEditField}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="set_code">Set Code</SelectItem>
                  <SelectItem value="card_number">Card Number</SelectItem>
                  <SelectItem value="set_name">Set Name</SelectItem>
                  <SelectItem value="language">Language</SelectItem>
                  <SelectItem value="variant">Variant</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="rarity">Rarity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>New Value</Label>
              <Input
                value={bulkEditValue}
                onChange={(e) => setBulkEditValue(e.target.value)}
                placeholder={`Enter ${bulkEditField.replace('_', ' ')}...`}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowBulkEditDialog(false)}>Cancel</Button>
            <Button onClick={handleBulkEdit} disabled={isBulkUpdating}>
              {isBulkUpdating ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Update {selectedItems.size} Items
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Items Table */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={items.length > 0 && selectedItems.size === items.length}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="w-24">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Set</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">PSA 10</TableHead>
                  <TableHead className="text-right">PSA 9</TableHead>
                  <TableHead className="text-right">Raw</TableHead>
                  <TableHead>Liquidity</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No items found
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map(item => (
                    <TableRow key={item.id} className={selectedItems.has(item.id) ? 'bg-muted/50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => toggleItemSelection(item.id)}
                          aria-label={`Select ${item.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="relative group w-16 h-16">
                          <div className="w-16 h-16 rounded overflow-hidden bg-muted">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <ImageIcon className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            ref={(el) => { fileInputRefs.current[item.id] = el; }}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(item.id, file);
                            }}
                          />
                          <button
                            onClick={() => fileInputRefs.current[item.id]?.click()}
                            disabled={uploadingId === item.id}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded"
                          >
                            {uploadingId === item.id ? (
                              <RefreshCw className="w-4 h-4 text-white animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4 text-white" />
                            )}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px]">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{item.name}</span>
                          {item.is_trending && <Badge className="bg-orange-500 text-xs shrink-0">🔥</Badge>}
                        </div>
                        {item.rarity && (
                          <span className="text-xs text-muted-foreground">{item.rarity}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{formatCategoryName(item.category)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[120px] truncate">
                        {item.set_name || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(item.current_price)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {item.psa10_price ? formatPrice(item.psa10_price) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {item.psa9_price ? formatPrice(item.psa9_price) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {item.raw_price ? formatPrice(item.raw_price) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={
                            item.liquidity === 'high' ? 'border-emerald-500 text-emerald-500' :
                            item.liquidity === 'medium' ? 'border-yellow-500 text-yellow-500' :
                            'border-red-500 text-red-500'
                          }
                        >
                          {item.liquidity || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={() => setEditingItem({ ...item })}
                                className="h-8 w-8"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Edit Market Item</DialogTitle>
                              </DialogHeader>
                              {editingItem && (
                                <div className="grid grid-cols-2 gap-4 py-4">
                                  <div className="col-span-2 space-y-2">
                                    <Label>Name</Label>
                                    <Input
                                      value={editingItem.name}
                                      onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Select
                                      value={editingItem.category}
                                      onValueChange={(value) => setEditingItem({ ...editingItem, category: value })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {categories.map(cat => (
                                          <SelectItem key={cat} value={cat}>{formatCategoryName(cat)}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Subcategory</Label>
                                    <Input
                                      value={editingItem.subcategory || ''}
                                      onChange={(e) => setEditingItem({ ...editingItem, subcategory: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Set Name</Label>
                                    <Input
                                      value={editingItem.set_name || ''}
                                      onChange={(e) => setEditingItem({ ...editingItem, set_name: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Rarity</Label>
                                    <Input
                                      value={editingItem.rarity || ''}
                                      onChange={(e) => setEditingItem({ ...editingItem, rarity: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Current Price ($)</Label>
                                    <Input
                                      type="number"
                                      value={editingItem.current_price}
                                      onChange={(e) => setEditingItem({ ...editingItem, current_price: parseFloat(e.target.value) })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Base Price ($)</Label>
                                    <Input
                                      type="number"
                                      value={editingItem.base_price}
                                      onChange={(e) => setEditingItem({ ...editingItem, base_price: parseFloat(e.target.value) })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>PSA 10 Price ($)</Label>
                                    <Input
                                      type="number"
                                      value={editingItem.psa10_price || ''}
                                      onChange={(e) => setEditingItem({ ...editingItem, psa10_price: parseFloat(e.target.value) || null })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>PSA 9 Price ($)</Label>
                                    <Input
                                      type="number"
                                      value={editingItem.psa9_price || ''}
                                      onChange={(e) => setEditingItem({ ...editingItem, psa9_price: parseFloat(e.target.value) || null })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Raw Price ($)</Label>
                                    <Input
                                      type="number"
                                      value={editingItem.raw_price || ''}
                                      onChange={(e) => setEditingItem({ ...editingItem, raw_price: parseFloat(e.target.value) || null })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>24h Change (%)</Label>
                                    <Input
                                      type="number"
                                      value={editingItem.change_24h || ''}
                                      onChange={(e) => setEditingItem({ ...editingItem, change_24h: parseFloat(e.target.value) || null })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>7d Change (%)</Label>
                                    <Input
                                      type="number"
                                      value={editingItem.change_7d || ''}
                                      onChange={(e) => setEditingItem({ ...editingItem, change_7d: parseFloat(e.target.value) || null })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>30d Change (%)</Label>
                                    <Input
                                      type="number"
                                      value={editingItem.change_30d || ''}
                                      onChange={(e) => setEditingItem({ ...editingItem, change_30d: parseFloat(e.target.value) || null })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Liquidity</Label>
                                    <Select
                                      value={editingItem.liquidity || 'medium'}
                                      onValueChange={(value: LiquidityLevel) => setEditingItem({ ...editingItem, liquidity: value })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="low">Low</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={editingItem.is_trending || false}
                                      onCheckedChange={(checked) => setEditingItem({ ...editingItem, is_trending: checked })}
                                    />
                                    <Label>Trending</Label>
                                  </div>
                                  
                                  {/* Catalog Identity Fields */}
                                  <div className="col-span-2 border-t pt-4 mt-2">
                                    <p className="text-sm font-medium text-muted-foreground mb-3">📋 Catalog Identity (Quick Fix)</p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Set Code</Label>
                                    <Input
                                      value={editingItem.set_code || ''}
                                      onChange={(e) => setEditingItem({ ...editingItem, set_code: e.target.value })}
                                      placeholder="OP05, SV01, etc."
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Card Number</Label>
                                    <Input
                                      value={editingItem.card_number || ''}
                                      onChange={(e) => setEditingItem({ ...editingItem, card_number: e.target.value })}
                                      placeholder="001, 016, etc."
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Language</Label>
                                    <Select
                                      value={editingItem.language || 'en'}
                                      onValueChange={(value) => setEditingItem({ ...editingItem, language: value })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="en">English</SelectItem>
                                        <SelectItem value="jp">Japanese</SelectItem>
                                        <SelectItem value="kr">Korean</SelectItem>
                                        <SelectItem value="de">German</SelectItem>
                                        <SelectItem value="fr">French</SelectItem>
                                        <SelectItem value="es">Spanish</SelectItem>
                                        <SelectItem value="it">Italian</SelectItem>
                                        <SelectItem value="pt">Portuguese</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Variant</Label>
                                    <Input
                                      value={editingItem.variant || ''}
                                      onChange={(e) => setEditingItem({ ...editingItem, variant: e.target.value })}
                                      placeholder="Alt Art, Full Art, SP, etc."
                                    />
                                  </div>
                                  <div className="col-span-2 space-y-2">
                                    <Label>CVI Key (auto-generated or manual)</Label>
                                    <Input
                                      value={editingItem.cvi_key || ''}
                                      onChange={(e) => setEditingItem({ ...editingItem, cvi_key: e.target.value })}
                                      placeholder="pokemon:en:sv01:001"
                                    />
                                  </div>
                                  {editingItem.normalized_key && (
                                    <div className="col-span-2">
                                      <p className="text-xs text-muted-foreground">Normalized Key: {editingItem.normalized_key}</p>
                                    </div>
                                  )}
                                  
                                  <div className="col-span-2 space-y-2">
                                    <Label>Image URL</Label>
                                    <Input
                                      value={editingItem.image_url || ''}
                                      onChange={(e) => setEditingItem({ ...editingItem, image_url: e.target.value })}
                                      placeholder="https://..."
                                    />
                                    {editingItem.image_url && (
                                      <div className="mt-2 w-24 h-24 rounded overflow-hidden">
                                        <img src={editingItem.image_url} alt="Preview" className="w-full h-full object-cover" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
                                <Button onClick={handleSave}>Save Changes</Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => handleDelete(item.id)}
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border/50">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount.toLocaleString()} items
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <span className="text-sm px-3">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
