import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Store, 
  Plus, 
  RefreshCw, 
  Package,
  DollarSign,
  Eye,
  Edit,
  ExternalLink,
  Image as ImageIcon,
  Wallet,
  ShoppingBag,
  Users
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Switch } from '@/components/ui/switch';

interface AdminStorefront {
  id: string;
  slug: string;
  display_name: string;
  tagline: string | null;
  logo_url: string | null;
  banner_url: string | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  total_sales: number | null;
  total_revenue: number | null;
  follower_count: number | null;
  created_at: string;
  user_id: string;
  creator_id: string;
  profile?: {
    display_name: string | null;
    email: string | null;
    is_fan_account: boolean | null;
    system_account_wallet_balance: number | null;
  };
}

interface MarketItem {
  id: string;
  name: string;
  category: string;
  current_price: number | null;
  image_url: string | null;
}

export function AdminStorefrontsManager() {
  const [storefronts, setStorefronts] = useState<AdminStorefront[]>([]);
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showListingDialog, setShowListingDialog] = useState(false);
  const [selectedStorefront, setSelectedStorefront] = useState<AdminStorefront | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isListing, setIsListing] = useState(false);
  const { formatPrice } = useCurrency();

  // Create storefront form state
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newTagline, setNewTagline] = useState('');
  const [newBio, setNewBio] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [newBannerUrl, setNewBannerUrl] = useState('');
  const [newAccountEmail, setNewAccountEmail] = useState('');
  const [fundAmount, setFundAmount] = useState('1000');

  // Listing form state
  const [selectedMarketItem, setSelectedMarketItem] = useState<string>('');
  const [listingPrice, setListingPrice] = useState('');
  const [listingCondition, setListingCondition] = useState('near_mint');
  const [listingDescription, setListingDescription] = useState('');
  const [listingImageUrl, setListingImageUrl] = useState('');

  const fetchStorefronts = async () => {
    setIsLoading(true);
    try {
      // Fetch storefronts with profile data
      const { data, error } = await supabase
        .from('creator_storefronts')
        .select(`
          *,
          profile:profiles!creator_storefronts_user_id_fkey(
            display_name,
            email,
            is_fan_account,
            system_account_wallet_balance
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStorefronts((data || []) as AdminStorefront[]);
    } catch (error) {
      console.error('Error fetching storefronts:', error);
      toast.error('Failed to fetch storefronts');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMarketItems = async () => {
    try {
      const { data, error } = await supabase
        .from('market_items')
        .select('id, name, category, current_price, image_url')
        .order('name', { ascending: true })
        .limit(500);

      if (error) throw error;
      setMarketItems(data || []);
    } catch (error) {
      console.error('Error fetching market items:', error);
    }
  };

  useEffect(() => {
    fetchStorefronts();
    fetchMarketItems();
  }, []);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleCreateStorefront = async () => {
    if (!newDisplayName || !newSlug || !newAccountEmail) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    try {
      // 1. Create the profile (fake user account)
      const profileId = crypto.randomUUID();
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: profileId,
          display_name: newDisplayName,
          email: newAccountEmail,
          bio: newBio,
          account_type: 'seller',
          is_fan_account: true,
          is_verified_seller: true, // Pre-verify admin storefronts
          system_account_role: 'seller',
          system_account_wallet_balance: parseFloat(fundAmount) || 0,
          auto_actions_count: 0,
          account_status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      // 2. Create the creator profile
      const creatorProfileId = crypto.randomUUID();
      const { error: creatorError } = await supabase
        .from('creator_profiles')
        .insert({
          id: creatorProfileId,
          user_id: profileId,
          creator_name: newDisplayName,
          bio: newBio || null,
          platform: 'cardboom',
          is_verified: true,
          is_public: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (creatorError) throw creatorError;

      // 3. Create the storefront
      const { error: storefrontError } = await supabase
        .from('creator_storefronts')
        .insert({
          creator_id: creatorProfileId,
          user_id: profileId,
          slug: newSlug,
          display_name: newDisplayName,
          tagline: newTagline || null,
          logo_url: newLogoUrl || null,
          banner_url: newBannerUrl || null,
          is_active: true,
          is_featured: false,
          total_sales: 0,
          total_revenue: 0,
          follower_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (storefrontError) throw storefrontError;

      toast.success(`Storefront "${newDisplayName}" created!`);
      setShowCreateDialog(false);
      resetCreateForm();
      fetchStorefronts();
    } catch (error: any) {
      console.error('Error creating storefront:', error);
      toast.error(error.message || 'Failed to create storefront');
    } finally {
      setIsCreating(false);
    }
  };

  const resetCreateForm = () => {
    setNewDisplayName('');
    setNewSlug('');
    setNewTagline('');
    setNewBio('');
    setNewLogoUrl('');
    setNewBannerUrl('');
    setNewAccountEmail('');
    setFundAmount('1000');
  };

  const handleCreateListing = async () => {
    if (!selectedStorefront || !selectedMarketItem || !listingPrice) {
      toast.error('Please fill in all required fields');
      return;
    }

    const price = parseFloat(listingPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setIsListing(true);
    try {
      const selectedItem = marketItems.find(m => m.id === selectedMarketItem);
      
      const { error } = await supabase
        .from('listings')
        .insert({
          seller_id: selectedStorefront.user_id,
          market_item_id: selectedMarketItem,
          title: selectedItem?.name || 'Card Listing',
          description: listingDescription || null,
          price: price,
          condition: listingCondition,
          image_url: listingImageUrl || selectedItem?.image_url || null,
          category: selectedItem?.category || 'pokemon',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success('Listing created successfully!');
      setShowListingDialog(false);
      resetListingForm();
    } catch (error: any) {
      console.error('Error creating listing:', error);
      toast.error(error.message || 'Failed to create listing');
    } finally {
      setIsListing(false);
    }
  };

  const resetListingForm = () => {
    setSelectedMarketItem('');
    setListingPrice('');
    setListingCondition('near_mint');
    setListingDescription('');
    setListingImageUrl('');
  };

  const handleToggleActive = async (storefront: AdminStorefront) => {
    try {
      const { error } = await supabase
        .from('creator_storefronts')
        .update({ is_active: !storefront.is_active })
        .eq('id', storefront.id);

      if (error) throw error;
      toast.success(storefront.is_active ? 'Storefront deactivated' : 'Storefront activated');
      fetchStorefronts();
    } catch (error) {
      console.error('Error toggling storefront:', error);
      toast.error('Failed to update storefront');
    }
  };

  const handleToggleFeatured = async (storefront: AdminStorefront) => {
    try {
      const { error } = await supabase
        .from('creator_storefronts')
        .update({ is_featured: !storefront.is_featured })
        .eq('id', storefront.id);

      if (error) throw error;
      toast.success(storefront.is_featured ? 'Removed from featured' : 'Added to featured');
      fetchStorefronts();
    } catch (error) {
      console.error('Error toggling featured:', error);
      toast.error('Failed to update storefront');
    }
  };

  // Stats
  const activeStorefronts = storefronts.filter(s => s.is_active);
  const featuredStorefronts = storefronts.filter(s => s.is_featured);
  const totalRevenue = storefronts.reduce((sum, s) => sum + (s.total_revenue || 0), 0);
  const totalSales = storefronts.reduce((sum, s) => sum + (s.total_sales || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Store className="w-6 h-6 text-primary" />
            Admin Storefronts
          </h2>
          <p className="text-muted-foreground">Create and manage storefronts with fake seller accounts</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Storefront
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Admin Storefront</DialogTitle>
                <DialogDescription>
                  Create a new storefront with a system seller account
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Display Name *</Label>
                    <Input
                      placeholder="CardMaster Pro Shop"
                      value={newDisplayName}
                      onChange={(e) => {
                        setNewDisplayName(e.target.value);
                        setNewSlug(generateSlug(e.target.value));
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL Slug *</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">/store/</span>
                      <Input
                        placeholder="cardmaster-pro"
                        value={newSlug}
                        onChange={(e) => setNewSlug(generateSlug(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Tagline</Label>
                  <Input
                    placeholder="Premium cards, trusted quality"
                    value={newTagline}
                    onChange={(e) => setNewTagline(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Account Email *</Label>
                  <Input
                    type="email"
                    placeholder="seller@cardboom.internal"
                    value={newAccountEmail}
                    onChange={(e) => setNewAccountEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Bio / Description</Label>
                  <Textarea
                    placeholder="Experienced card seller with 10+ years in the hobby..."
                    value={newBio}
                    onChange={(e) => setNewBio(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <Input
                      placeholder="https://..."
                      value={newLogoUrl}
                      onChange={(e) => setNewLogoUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Banner URL</Label>
                    <Input
                      placeholder="https://..."
                      value={newBannerUrl}
                      onChange={(e) => setNewBannerUrl(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Initial Wallet Balance ($)</Label>
                  <Input
                    type="number"
                    placeholder="1000"
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Fund the seller account for receiving payments
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                <Button onClick={handleCreateStorefront} disabled={isCreating}>
                  {isCreating ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Create Storefront
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="ghost" size="icon" onClick={fetchStorefronts}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Store className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{storefronts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gain/10">
                <Eye className="w-5 h-5 text-gain" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{activeStorefronts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gold/10">
                <ShoppingBag className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">{totalSales}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <DollarSign className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-xl font-bold">{formatPrice(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Storefronts Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Storefronts</CardTitle>
          <CardDescription>Manage admin-created storefronts and their listings</CardDescription>
        </CardHeader>
        <CardContent>
          {storefronts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No storefronts yet. Create one to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Storefront</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Stats</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {storefronts.map((storefront) => (
                  <TableRow key={storefront.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {storefront.logo_url ? (
                          <img 
                            src={storefront.logo_url} 
                            alt="" 
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <Store className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{storefront.display_name}</p>
                          {storefront.tagline && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {storefront.tagline}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        /store/{storefront.slug}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{storefront.profile?.display_name || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{storefront.profile?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(storefront.profile?.system_account_wallet_balance || 0)}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1">
                        <p>{storefront.total_sales || 0} sales</p>
                        <p className="text-muted-foreground">{formatPrice(storefront.total_revenue || 0)} revenue</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={storefront.is_active || false}
                            onCheckedChange={() => handleToggleActive(storefront)}
                          />
                          <span className="text-xs">{storefront.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={storefront.is_featured || false}
                            onCheckedChange={() => handleToggleFeatured(storefront)}
                          />
                          <span className="text-xs text-muted-foreground">Featured</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedStorefront(storefront);
                            setShowListingDialog(true);
                          }}
                          className="gap-1"
                        >
                          <Package className="w-3 h-3" />
                          List Card
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(`/store/${storefront.slug}`, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Listing Dialog */}
      <Dialog open={showListingDialog} onOpenChange={setShowListingDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Listing</DialogTitle>
            <DialogDescription>
              List a card from {selectedStorefront?.display_name}'s storefront
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Card *</Label>
              <Select value={selectedMarketItem} onValueChange={setSelectedMarketItem}>
                <SelectTrigger>
                  <SelectValue placeholder="Search for a card..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {marketItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      <div className="flex items-center gap-2">
                        <span>{item.name}</span>
                        <span className="text-xs text-muted-foreground">({item.category})</span>
                        {item.current_price && (
                          <span className="text-xs text-gain">${item.current_price}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price ($) *</Label>
                <Input
                  type="number"
                  placeholder="100"
                  value={listingPrice}
                  onChange={(e) => setListingPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Condition</Label>
                <Select value={listingCondition} onValueChange={setListingCondition}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mint">Mint</SelectItem>
                    <SelectItem value="near_mint">Near Mint</SelectItem>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="played">Played</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Image URL (optional)</Label>
              <Input
                placeholder="https://... (will use card image if empty)"
                value={listingImageUrl}
                onChange={(e) => setListingImageUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Excellent condition, never played..."
                value={listingDescription}
                onChange={(e) => setListingDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowListingDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateListing} disabled={isListing}>
              {isListing ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Package className="w-4 h-4 mr-2" />}
              Create Listing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
