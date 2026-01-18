import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  RefreshCw, 
  TrendingUp, 
  Search, 
  Edit2,
  Save,
  X,
  Database,
  Zap,
} from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { WireTransferManagement } from '@/components/admin/WireTransferManagement';
import { UserManagement } from '@/components/admin/UserManagement';
import { FractionalManagement } from '@/components/admin/FractionalManagement';
import { APIAnalytics } from '@/components/admin/APIAnalytics';
import { SupportTickets } from '@/components/admin/SupportTickets';
import { AutoBuyManager } from '@/components/admin/AutoBuyManager';
import { DataSyncManager } from '@/components/admin/DataSyncManager';
import { DiagnosticsDashboard } from '@/components/admin/DiagnosticsDashboard';
import { GradingManagement } from '@/components/admin/GradingManagement';
import { CardWarsManager } from '@/components/admin/CardWarsManager';
import { CommunityVotesManager } from '@/components/admin/CommunityVotesManager';
import { FanAccountsManager } from '@/components/admin/FanAccountsManager';
import { RevenueDashboard } from '@/components/admin/RevenueDashboard';
import { OrderManagement } from '@/components/admin/OrderManagement';
import { SellerVerificationQueue } from '@/components/admin/SellerVerificationQueue';
import { ListingModeration } from '@/components/admin/ListingModeration';
import { PromoManager } from '@/components/admin/PromoManager';
import { NotificationSender } from '@/components/admin/NotificationSender';
import { FeaturedManager } from '@/components/admin/FeaturedManager';
import { MarketControlPanel } from '@/components/admin/MarketControlPanel';
import { CurrencyRatesManager } from '@/components/admin/CurrencyRatesManager';
import { VaultManagement } from '@/components/admin/VaultManagement';
import { EmailManager } from '@/components/admin/EmailManager';
import { ConversionDashboard } from '@/components/analytics/ConversionDashboard';
import { DisputeManagement } from '@/components/admin/DisputeManagement';
import { PayoutManager } from '@/components/admin/PayoutManager';
import { AuctionManager } from '@/components/admin/AuctionManager';
import { PointsManager } from '@/components/admin/PointsManager';
import { WhaleInviteManager } from '@/components/admin/WhaleInviteManager';
import { SystemAccountsManager } from '@/components/admin/SystemAccountsManager';
import { AdminStorefrontsManager } from '@/components/admin/AdminStorefrontsManager';
import { InventoryIntegrityDashboard } from '@/components/admin/InventoryIntegrityDashboard';
import { DigitalProductsManager } from '@/components/admin/DigitalProductsManager';
import { EscalationManagement } from '@/components/admin/EscalationManagement';
import { LaunchCheckDashboard } from '@/components/admin/LaunchCheckDashboard';
import { SystemStatusDashboard } from '@/components/admin/SystemStatusDashboard';
import { BountyManager } from '@/components/admin/BountyManager';
import { MarketItemsManager } from '@/components/admin/MarketItemsManager';
import { GradingCalibrationDashboard } from '@/components/admin/GradingCalibrationDashboard';
import { AdminListingsManager } from '@/components/admin/AdminListingsManager';
import { CreatorManagement } from '@/components/admin/CreatorManagement';
import { BoomCoinsPricingManager } from '@/components/admin/BoomCoinsPricingManager';
import { CoachVerificationQueue } from '@/components/admin/CoachVerificationQueue';
import { ImageNormalizationManager } from '@/components/admin/ImageNormalizationManager';
import { CatalogOpsPanel } from '@/components/admin/CatalogOpsPanel';
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
  const [activeSection, setActiveSection] = useState('revenue');

  // Redirect if not admin - only after auth check is complete
  useEffect(() => {
    // Wait for auth check to complete before redirecting
    if (isCheckingAdmin) return;
    
    // Small delay to ensure session is fully established
    const timer = setTimeout(() => {
      if (!isAdmin) {
        toast.error('Access denied. Admin privileges required.');
        navigate('/');
      }
    }, 500);
    
    return () => clearTimeout(timer);
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
    if (isAdmin && activeSection === 'prices') {
      fetchItems();
    }
  }, [isAdmin, activeSection]);

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
          image_url: editedItem.image_url,
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

  const renderContent = () => {
    switch (activeSection) {
      case 'revenue':
        return <RevenueDashboard />;
      case 'analytics':
        return <ConversionDashboard />;
      case 'orders':
        return <OrderManagement />;
      case 'wire-transfers':
        return <WireTransferManagement />;
      case 'payouts':
        return <PayoutManager />;
      case 'disputes':
        return <DisputeManagement />;
      case 'users':
        return <UserManagement />;
      case 'creators':
        return <CreatorManagement />;
      case 'verification':
        return <SellerVerificationQueue />;
      case 'coach-verification':
        return <CoachVerificationQueue />;
      case 'whale':
        return <WhaleInviteManager />;
      case 'system-accounts':
        return <SystemAccountsManager />;
      case 'admin-storefronts':
        return <AdminStorefrontsManager />;
      case 'moderation':
        return <ListingModeration />;
      case 'featured':
        return <FeaturedManager />;
      case 'items-manager':
        return <MarketItemsManager />;
      case 'listings-manager':
        return <AdminListingsManager />;
      case 'prices':
        return renderPricesSection();
      case 'controls':
        return <MarketControlPanel />;
      case 'fractional':
        return <FractionalManagement />;
      case 'cardwars':
        return <CardWarsManager />;
      case 'communityvotes':
        return <CommunityVotesManager />;
      case 'fanaccounts':
        return <FanAccountsManager />;
      case 'auctions':
        return <AuctionManager />;
      case 'points':
        return <PointsManager />;
      case 'coins-pricing':
        return <BoomCoinsPricingManager />;
      case 'promos':
        return <PromoManager />;
      case 'support':
        return <SupportTickets />;
      case 'notifications':
        return <NotificationSender />;
      case 'email':
        return <EmailManager />;
      case 'api':
        return <APIAnalytics />;
      case 'diagnostics':
        return <DiagnosticsDashboard />;
      case 'currency':
        return <CurrencyRatesManager />;
      case 'vault':
        return <VaultManagement />;
      case 'grading':
        return <GradingManagement />;
      case 'grading-calibration':
        return <GradingCalibrationDashboard />;
      case 'image-normalization':
        return <ImageNormalizationManager />;
      case 'catalog-ops':
        return <CatalogOpsPanel />;
      case 'datasync':
        return <DataSyncManager />;
      case 'autobuy':
        return <AutoBuyManager />;
      case 'inventory':
        return <InventoryIntegrityDashboard />;
      case 'digital-products':
        return <DigitalProductsManager />;
      case 'launch-check':
        return <LaunchCheckDashboard />;
      case 'system-status':
        return <SystemStatusDashboard />;
      case 'bounties':
        return <BountyManager />;
      default:
        return <RevenueDashboard />;
    }
  };

  const renderPricesSection = () => (
    <div className="space-y-6">
      {/* Sync Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Price Management</h2>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <TrendingUp className="w-5 h-5 text-red-500 rotate-180" />
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
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">24h</TableHead>
                  <TableHead className="text-right">7d</TableHead>
                  <TableHead>Liquidity</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No items found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.slice(0, 50).map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="w-20">
                        {editingId === item.id ? (
                          <Input
                            value={editedItem.image_url || ''}
                            onChange={(e) => setEditedItem({ ...editedItem, image_url: e.target.value })}
                            className="h-8 text-xs"
                            placeholder="Image URL"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded overflow-hidden bg-muted">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No img</div>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {editingId === item.id ? (
                          <Input
                            value={editedItem.name || ''}
                            onChange={(e) => setEditedItem({ ...editedItem, name: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          <span className="flex items-center gap-2">
                            {item.name}
                            {item.is_trending && <Badge className="bg-orange-500 text-xs">🔥</Badge>}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId === item.id ? (
                          <Input
                            type="number"
                            value={editedItem.current_price || 0}
                            onChange={(e) => setEditedItem({ ...editedItem, current_price: parseFloat(e.target.value) })}
                            className="h-8 w-24 text-right"
                          />
                        ) : (
                          formatPrice(item.current_price)
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId === item.id ? (
                          <Input
                            type="number"
                            value={editedItem.change_24h || 0}
                            onChange={(e) => setEditedItem({ ...editedItem, change_24h: parseFloat(e.target.value) })}
                            className="h-8 w-20 text-right"
                          />
                        ) : (
                          <span className={item.change_24h && item.change_24h > 0 ? 'text-emerald-500' : item.change_24h && item.change_24h < 0 ? 'text-red-500' : 'text-muted-foreground'}>
                            {item.change_24h ? `${item.change_24h > 0 ? '+' : ''}${item.change_24h.toFixed(1)}%` : '-'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={item.change_7d && item.change_7d > 0 ? 'text-emerald-500' : item.change_7d && item.change_7d < 0 ? 'text-red-500' : 'text-muted-foreground'}>
                          {item.change_7d ? `${item.change_7d > 0 ? '+' : ''}${item.change_7d.toFixed(1)}%` : '-'}
                        </span>
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
                        {editingId === item.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <Button size="icon" variant="ghost" onClick={handleSave} className="h-8 w-8">
                              <Save className="w-4 h-4 text-emerald-500" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8">
                              <X className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(item)} className="h-8 w-8">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur">
          <div className="flex items-center gap-4 px-4 py-3">
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-foreground capitalize">
                {activeSection.replace(/-/g, ' ')}
              </h1>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              Back to Site
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Admin;
