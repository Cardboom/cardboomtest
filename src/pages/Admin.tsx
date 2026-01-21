import { useState, useEffect, useRef } from 'react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { APIAnalytics } from '@/components/admin/APIAnalytics';
import { SupportTickets } from '@/components/admin/SupportTickets';
import { AutoBuyManager } from '@/components/admin/AutoBuyManager';
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
import { GradingPricingManager } from '@/components/admin/GradingPricingManager';
import { AdminListingsManager } from '@/components/admin/AdminListingsManager';
import { CreatorManagement } from '@/components/admin/CreatorManagement';
import { BoomCoinsPricingManager } from '@/components/admin/BoomCoinsPricingManager';
import { CoachVerificationQueue } from '@/components/admin/CoachVerificationQueue';
import { ImageNormalizationManager } from '@/components/admin/ImageNormalizationManager';
import { CatalogOpsPanel } from '@/components/admin/CatalogOpsPanel';
import { BoomPacksManager } from '@/components/admin/BoomPacksManager';
import { TCGDropsManager } from '@/components/admin/TCGDropsManager';
import { PriceReportsPanel } from '@/components/admin/PriceReportsPanel';
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
  const [priceSearchQuery, setPriceSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedItem, setEditedItem] = useState<Partial<MarketItem>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeSection, setActiveSection] = useState('revenue');
  const [showSearch, setShowSearch] = useState(false);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Handle section change with scroll to top
  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    // Scroll main content to top
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // All admin sections for search
  const allSections = [
    { id: 'revenue', label: 'Revenue Dashboard' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'orders', label: 'Order Management' },
    { id: 'wire-transfers', label: 'Wire Transfers' },
    { id: 'payouts', label: 'Withdrawals' },
    { id: 'disputes', label: 'Disputes' },
    { id: 'users', label: 'User Management' },
    { id: 'creators', label: 'Creator Management' },
    { id: 'verification', label: 'Seller KYC' },
    { id: 'coach-verification', label: 'Coach Verification' },
    { id: 'whale', label: 'Whale Program' },
    { id: 'system-accounts', label: 'System Accounts' },
    { id: 'admin-storefronts', label: 'Admin Storefronts' },
    { id: 'moderation', label: 'Moderation' },
    { id: 'featured', label: 'Featured' },
    { id: 'items-manager', label: 'Items Manager' },
    { id: 'listings-manager', label: 'Listings Manager' },
    { id: 'catalog-ops', label: 'Catalog Ops' },
    { id: 'price-reports', label: 'Price Reports' },
    { id: 'controls', label: 'Market Controls' },
    { id: 'cardwars', label: 'Card Wars' },
    { id: 'communityvotes', label: 'Community Votes' },
    { id: 'fanaccounts', label: 'Boom Reels' },
    { id: 'auctions', label: 'Auctions' },
    { id: 'points', label: 'Points Manager' },
    { id: 'coins-pricing', label: 'Coins Pricing' },
    { id: 'bounties', label: 'Boom Challenges' },
    { id: 'promos', label: 'Promos' },
    { id: 'support', label: 'Support Tickets' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'email', label: 'Email' },
    { id: 'digital-products', label: 'Digital Products' },
    { id: 'boom-packs', label: 'Boom Packs' },
    { id: 'launch-check', label: 'Launch Check' },
    { id: 'system-status', label: 'System Status' },
    { id: 'api', label: 'API' },
    { id: 'diagnostics', label: 'Diagnostics' },
    { id: 'currency', label: 'Currency' },
    { id: 'vault', label: 'Vault' },
    { id: 'grading', label: 'Grading' },
    { id: 'grading-pricing', label: 'Grading Pricing' },
    { id: 'grading-calibration', label: 'AI Calibration' },
    { id: 'image-normalization', label: 'Image AI' },
    { id: 'autobuy', label: 'Deal Scooper' },
    { id: 'inventory', label: 'Inventory Integrity' },
    { id: 'tcg-drops', label: 'TCG Drops' },
  ];

  const filteredSections = allSections.filter(s => 
    s.label.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(adminSearchQuery.toLowerCase())
  );

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
    const matchesSearch = item.name.toLowerCase().includes(priceSearchQuery.toLowerCase()) ||
                          item.category.toLowerCase().includes(priceSearchQuery.toLowerCase());
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
      case 'controls':
        return <MarketControlPanel />;
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
      case 'grading-pricing':
        return <GradingPricingManager />;
      case 'grading-calibration':
        return <GradingCalibrationDashboard />;
      case 'image-normalization':
        return <ImageNormalizationManager />;
      case 'catalog-ops':
        return <CatalogOpsPanel />;
      case 'price-reports':
        return <PriceReportsPanel />;
      case 'autobuy':
        return <AutoBuyManager />;
      case 'inventory':
        return <InventoryIntegrityDashboard />;
      case 'digital-products':
        return <DigitalProductsManager />;
      case 'boom-packs':
        return <BoomPacksManager />;
      case 'launch-check':
        return <LaunchCheckDashboard />;
      case 'system-status':
        return <SystemStatusDashboard />;
      case 'bounties':
        return <BountyManager />;
      case 'tcg-drops':
        return <TCGDropsManager />;
      default:
        return <RevenueDashboard />;
    }
  };


  return (
    <div className="min-h-screen flex w-full bg-background">
      <AdminSidebar 
        activeSection={activeSection} 
        onSectionChange={handleSectionChange}
        onSearch={() => setShowSearch(true)}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur">
          <div className="flex items-center gap-4 px-4 py-3">
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-foreground capitalize">
                {activeSection.replace(/-/g, ' ')}
              </h1>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowSearch(true)}
              className="gap-2"
            >
              <Search className="h-4 w-4" />
              Search
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              Back to Site
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main ref={mainContentRef} className="flex-1 p-4 md:p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>

      {/* Search Dialog */}
      <Dialog open={showSearch} onOpenChange={setShowSearch}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Navigation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search admin sections..."
              value={adminSearchQuery}
              onChange={(e) => setAdminSearchQuery(e.target.value)}
              autoFocus
            />
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredSections.map((section) => (
                <Button
                  key={section.id}
                  variant={activeSection === section.id ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => {
                    handleSectionChange(section.id);
                    setShowSearch(false);
                    setAdminSearchQuery('');
                  }}
                >
                  {section.label}
                </Button>
              ))}
              {filteredSections.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No sections found
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
