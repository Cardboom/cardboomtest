import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Settings, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Edit2,
  Save,
  X,
  Database,
  Zap,
  Banknote,
  ShieldCheck
} from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { WireTransferManagement } from '@/components/admin/WireTransferManagement';

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
  updated_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const { isAdmin, isLoading: isCheckingAdmin } = useAdminRole();
  const [items, setItems] = useState<MarketItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedItem, setEditedItem] = useState<Partial<MarketItem>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('prices');

  // Redirect if not admin
  useEffect(() => {
    if (!isCheckingAdmin && !isAdmin) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/');
    }
  }, [isAdmin, isCheckingAdmin, navigate]);

  // Fetch market items
  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('market_items')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

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
    if (isAdmin && activeTab === 'prices') {
      fetchItems();
    }
  }, [isAdmin, activeTab]);

  // Get unique categories
  const categories = [...new Set(items.map(item => item.category))];

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Start editing
  const handleEdit = (item: MarketItem) => {
    setEditingId(item.id);
    setEditedItem({ ...item });
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedItem({});
  };

  // Save edited item
  const handleSave = async () => {
    if (!editingId || !editedItem) return;

    try {
      const { error } = await supabase
        .from('market_items')
        .update({
          name: editedItem.name,
          current_price: editedItem.current_price,
          change_24h: editedItem.change_24h,
          change_7d: editedItem.change_7d,
          change_30d: editedItem.change_30d,
          is_trending: editedItem.is_trending,
          liquidity: editedItem.liquidity,
          category: editedItem.category,
          subcategory: editedItem.subcategory,
        })
        .eq('id', editingId);

      if (error) throw error;

      toast.success('Item updated successfully');
      setEditingId(null);
      setEditedItem({} as Partial<MarketItem>);
      fetchItems();
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    }
  };

  // Sync with external API
  const handleSyncPrices = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-pricecharting-listings');
      
      if (error) throw error;

      toast.success(`Synced ${data?.updated || 0} prices from PriceCharting API`);
      fetchItems();
    } catch (error) {
      console.error('Error syncing prices:', error);
      toast.error('Failed to sync prices. Check if API key is configured.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Calculate statistics
  const stats = {
    totalItems: items.length,
    trending: items.filter(i => i.is_trending).length,
    gainers: items.filter(i => (i.change_24h || 0) > 0).length,
    losers: items.filter(i => (i.change_24h || 0) < 0).length,
  };

  if (isCheckingAdmin || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Checking admin privileges...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Simple admin header */}
      <header className="border-b border-border/50 bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">C</span>
            </div>
            <span className="font-bold text-xl">CARDBOOM <span className="text-primary">Admin</span></span>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>Back to Site</Button>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-primary" />
              Admin Panel
            </h1>
            <p className="text-muted-foreground mt-1">Manage wire transfers, prices, and platform settings</p>
          </div>
        </div>

        {/* Admin Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card/50 border border-border/50">
            <TabsTrigger value="wire-transfers" className="gap-2">
              <Banknote className="w-4 h-4" />
              Wire Transfers
            </TabsTrigger>
            <TabsTrigger value="prices" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Price Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wire-transfers">
            <WireTransferManagement />
          </TabsContent>

          <TabsContent value="prices" className="space-y-6">
            {/* Sync Button */}
            <div className="flex justify-end">
              <Button 
                onClick={handleSyncPrices} 
                disabled={isSyncing}
                className="gap-2"
              >
                {isSyncing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                Sync PriceCharting API
              </Button>
            </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Database className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalItems}</p>
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
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gainers (24h)</p>
                  <p className="text-2xl font-bold text-emerald-500">{stats.gainers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Losers (24h)</p>
                  <p className="text-2xl font-bold text-red-500">{stats.losers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search" className="sr-only">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-background/50"
                  />
                </div>
              </div>
              
              <div className="w-full md:w-48">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button variant="outline" onClick={fetchItems} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>Market Items ({filteredItems.length})</CardTitle>
            <CardDescription>Click edit to update prices and details</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">24h %</TableHead>
                      <TableHead className="text-right">7d %</TableHead>
                      <TableHead className="text-center">Trending</TableHead>
                      <TableHead>Liquidity</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        {editingId === item.id ? (
                          <>
                            <TableCell>
                              <Input
                                value={editedItem.name || ''}
                                onChange={(e) => setEditedItem({ ...editedItem, name: e.target.value })}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={editedItem.category || ''}
                                onChange={(e) => setEditedItem({ ...editedItem, category: e.target.value })}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={editedItem.current_price || 0}
                                onChange={(e) => setEditedItem({ ...editedItem, current_price: parseFloat(e.target.value) })}
                                className="h-8 w-24 text-right"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.1"
                                value={editedItem.change_24h || 0}
                                onChange={(e) => setEditedItem({ ...editedItem, change_24h: parseFloat(e.target.value) })}
                                className="h-8 w-20 text-right"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.1"
                                value={editedItem.change_7d || 0}
                                onChange={(e) => setEditedItem({ ...editedItem, change_7d: parseFloat(e.target.value) })}
                                className="h-8 w-20 text-right"
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <input
                                type="checkbox"
                                checked={editedItem.is_trending || false}
                                onChange={(e) => setEditedItem({ ...editedItem, is_trending: e.target.checked })}
                                className="w-4 h-4"
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={editedItem.liquidity || 'medium'}
                                onValueChange={(v) => setEditedItem({ ...editedItem, liquidity: v as LiquidityLevel })}
                              >
                                <SelectTrigger className="h-8 w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="low">Low</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {item.data_source || 'manual'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <Button size="icon" variant="ghost" onClick={handleSave} className="h-8 w-8">
                                  <Save className="w-4 h-4 text-emerald-500" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8">
                                  <X className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {item.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatPrice(item.current_price)}
                            </TableCell>
                            <TableCell className={`text-right font-mono ${
                              (item.change_24h || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'
                            }`}>
                              {(item.change_24h || 0) >= 0 ? '+' : ''}{(item.change_24h || 0).toFixed(1)}%
                            </TableCell>
                            <TableCell className={`text-right font-mono ${
                              (item.change_7d || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'
                            }`}>
                              {(item.change_7d || 0) >= 0 ? '+' : ''}{(item.change_7d || 0).toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-center">
                              {item.is_trending ? (
                                <Badge className="bg-orange-500/20 text-orange-400">🔥</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={
                                  item.liquidity === 'high' ? 'border-emerald-500/50 text-emerald-500' :
                                  item.liquidity === 'medium' ? 'border-yellow-500/50 text-yellow-500' :
                                  'border-red-500/50 text-red-500'
                                }
                              >
                                {item.liquidity || 'low'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {item.data_source || 'manual'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center">
                                <Button size="icon" variant="ghost" onClick={() => handleEdit(item)} className="h-8 w-8">
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Simple footer */}
      <footer className="border-t border-border/50 py-6">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          CardBoom Admin Panel © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
};

export default Admin;
