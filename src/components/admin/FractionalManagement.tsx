import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  PieChart, 
  RefreshCw, 
  Edit2, 
  Save, 
  X, 
  Plus,
  Search,
  Shield,
  DollarSign,
  Users
} from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';

interface FractionalListing {
  id: string;
  listing_id: string | null;
  market_item_id: string | null;
  total_shares: number;
  available_shares: number;
  share_price: number;
  min_shares: number;
  status: string;
  daily_verification_required: boolean;
  owner_id: string;
  created_at: string;
  listing?: { title: string; image_url: string | null };
  market_item?: { name: string; image_url: string | null };
}

interface MarketItem {
  id: string;
  name: string;
  category: string;
  current_price: number;
  image_url: string | null;
}

export const FractionalManagement = () => {
  const { formatPrice } = useCurrency();
  const [listings, setListings] = useState<FractionalListing[]>([]);
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Partial<FractionalListing>>({});
  
  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedMarketItem, setSelectedMarketItem] = useState<MarketItem | null>(null);
  const [newTotalShares, setNewTotalShares] = useState(100);
  const [newMinShares, setNewMinShares] = useState(10);
  const [newDailyVerification, setNewDailyVerification] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fractional_listings')
        .select(`
          *,
          listing:listings(title, image_url),
          market_item:market_items(name, image_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error fetching fractional listings:', error);
      toast.error('Failed to fetch fractional listings');
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketItems = async () => {
    try {
      const { data, error } = await supabase
        .from('market_items')
        .select('id, name, category, current_price, image_url')
        .order('name', { ascending: true })
        .limit(100);

      if (error) throw error;
      setMarketItems(data || []);
    } catch (error) {
      console.error('Error fetching market items:', error);
    }
  };

  useEffect(() => {
    fetchListings();
    fetchMarketItems();
  }, []);

  const handleEdit = (listing: FractionalListing) => {
    setEditingId(listing.id);
    setEditedValues({
      total_shares: listing.total_shares,
      share_price: listing.share_price,
      min_shares: listing.min_shares,
      status: listing.status,
      daily_verification_required: listing.daily_verification_required,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedValues({});
  };

  const handleSave = async () => {
    if (!editingId) return;

    try {
      const { error } = await supabase
        .from('fractional_listings')
        .update({
          total_shares: editedValues.total_shares,
          share_price: editedValues.share_price,
          min_shares: editedValues.min_shares,
          status: editedValues.status,
          daily_verification_required: editedValues.daily_verification_required,
        })
        .eq('id', editingId);

      if (error) throw error;

      toast.success('Fractional listing updated');
      setEditingId(null);
      setEditedValues({});
      fetchListings();
    } catch (error) {
      console.error('Error updating fractional listing:', error);
      toast.error('Failed to update listing');
    }
  };

  const handleCreateFromMarketItem = async () => {
    if (!selectedMarketItem) {
      toast.error('Please select a market item');
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const sharePrice = selectedMarketItem.current_price / newTotalShares;

      const { error } = await supabase
        .from('fractional_listings')
        .insert({
          market_item_id: selectedMarketItem.id,
          total_shares: newTotalShares,
          available_shares: newTotalShares,
          share_price: sharePrice,
          min_shares: newMinShares,
          daily_verification_required: newDailyVerification,
          owner_id: user.id,
          next_verification_due: newDailyVerification 
            ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() 
            : null,
        });

      if (error) throw error;

      toast.success('Fractional listing created from market item');
      setCreateOpen(false);
      setSelectedMarketItem(null);
      setNewTotalShares(100);
      setNewMinShares(10);
      fetchListings();
    } catch (error: any) {
      console.error('Error creating fractional listing:', error);
      toast.error(error.message || 'Failed to create listing');
    } finally {
      setCreating(false);
    }
  };

  const filteredListings = listings.filter(listing => {
    const name = listing.listing?.title || listing.market_item?.name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getItemName = (listing: FractionalListing) => {
    return listing.listing?.title || listing.market_item?.name || 'Unknown Item';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-gain text-gain-foreground">Active</Badge>;
      case 'sold':
        return <Badge className="bg-primary text-primary-foreground">Sold</Badge>;
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate stats
  const stats = {
    total: listings.length,
    active: listings.filter(l => l.status === 'active').length,
    totalShares: listings.reduce((acc, l) => acc + l.total_shares, 0),
    soldShares: listings.reduce((acc, l) => acc + (l.total_shares - l.available_shares), 0),
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <PieChart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Listings</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gain/10">
                <Shield className="w-5 h-5 text-gain" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-foreground">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <DollarSign className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Shares</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalShares.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Users className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sold Shares</p>
                <p className="text-2xl font-bold text-foreground">{stats.soldShares.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search fractional listings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchListings} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Fractional
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-primary" />
                  Create Fractional Listing
                </DialogTitle>
                <DialogDescription>
                  Create a fractional listing from a market item
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Select Market Item */}
                <div className="space-y-2">
                  <Label>Select Market Item</Label>
                  <Select
                    value={selectedMarketItem?.id || ''}
                    onValueChange={(id) => {
                      const item = marketItems.find(m => m.id === id);
                      setSelectedMarketItem(item || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a market item..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {marketItems.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} - {formatPrice(item.current_price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedMarketItem && (
                  <>
                    {/* Item Preview */}
                    <div className="flex gap-4 items-center p-3 rounded-lg bg-muted/50">
                      {selectedMarketItem.image_url && (
                        <img 
                          src={selectedMarketItem.image_url} 
                          alt={selectedMarketItem.name} 
                          className="h-16 w-16 rounded-lg object-cover" 
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{selectedMarketItem.name}</p>
                        <p className="text-lg font-bold text-primary">
                          {formatPrice(selectedMarketItem.current_price)}
                        </p>
                      </div>
                    </div>

                    {/* Total Shares */}
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <Label>Total Shares</Label>
                        <span className="text-sm text-muted-foreground">{newTotalShares} shares</span>
                      </div>
                      <Slider
                        value={[newTotalShares]}
                        onValueChange={([value]) => setNewTotalShares(value)}
                        min={10}
                        max={1000}
                        step={10}
                      />
                      <p className="text-sm text-muted-foreground">
                        Each share = {formatPrice(selectedMarketItem.current_price / newTotalShares)}
                      </p>
                    </div>

                    {/* Minimum Purchase */}
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <Label>Minimum Purchase</Label>
                        <span className="text-sm text-muted-foreground">{newMinShares} shares</span>
                      </div>
                      <Slider
                        value={[newMinShares]}
                        onValueChange={([value]) => setNewMinShares(value)}
                        min={1}
                        max={Math.min(100, newTotalShares)}
                        step={1}
                      />
                    </div>

                    {/* Daily Verification */}
                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-primary" />
                        <div>
                          <Label className="text-base">Daily Verification</Label>
                          <p className="text-sm text-muted-foreground">
                            Require photo verification
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={newDailyVerification}
                        onCheckedChange={setNewDailyVerification}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setCreateOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateFromMarketItem} 
                  disabled={creating || !selectedMarketItem}
                  className="flex-1"
                >
                  {creating ? "Creating..." : "Create Listing"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>Fractional Listings ({filteredListings.length})</CardTitle>
          <CardDescription>Manage fractional share offerings</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Total Shares</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Share Price</TableHead>
                    <TableHead className="text-right">Min Purchase</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Verification</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredListings.map((listing) => (
                    <TableRow key={listing.id}>
                      {editingId === listing.id ? (
                        <>
                          <TableCell className="font-medium">{getItemName(listing)}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={editedValues.total_shares || 0}
                              onChange={(e) => setEditedValues({ 
                                ...editedValues, 
                                total_shares: parseInt(e.target.value) 
                              })}
                              className="h-8 w-20 text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right">{listing.available_shares}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={editedValues.share_price || 0}
                              onChange={(e) => setEditedValues({ 
                                ...editedValues, 
                                share_price: parseFloat(e.target.value) 
                              })}
                              className="h-8 w-24 text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={editedValues.min_shares || 0}
                              onChange={(e) => setEditedValues({ 
                                ...editedValues, 
                                min_shares: parseInt(e.target.value) 
                              })}
                              className="h-8 w-16 text-right"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Select
                              value={editedValues.status}
                              onValueChange={(v) => setEditedValues({ ...editedValues, status: v })}
                            >
                              <SelectTrigger className="h-8 w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="paused">Paused</SelectItem>
                                <SelectItem value="sold">Sold</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-center">
                            <input
                              type="checkbox"
                              checked={editedValues.daily_verification_required || false}
                              onChange={(e) => setEditedValues({ 
                                ...editedValues, 
                                daily_verification_required: e.target.checked 
                              })}
                              className="w-4 h-4"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-center gap-1">
                              <Button size="icon" variant="ghost" onClick={handleSave}>
                                <Save className="w-4 h-4 text-gain" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={handleCancelEdit}>
                                <X className="w-4 h-4 text-loss" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="font-medium">{getItemName(listing)}</TableCell>
                          <TableCell className="text-right">{listing.total_shares}</TableCell>
                          <TableCell className="text-right">{listing.available_shares}</TableCell>
                          <TableCell className="text-right">{formatPrice(listing.share_price)}</TableCell>
                          <TableCell className="text-right">{listing.min_shares}</TableCell>
                          <TableCell className="text-center">{getStatusBadge(listing.status)}</TableCell>
                          <TableCell className="text-center">
                            {listing.daily_verification_required ? (
                              <Shield className="w-4 h-4 text-gain mx-auto" />
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-center">
                              <Button size="icon" variant="ghost" onClick={() => handleEdit(listing)}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                  {filteredListings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No fractional listings found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
