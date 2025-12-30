import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Package, CheckCircle, Clock, Truck, AlertCircle, Search, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useCurrency } from '@/contexts/CurrencyContext';

interface VaultItem {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  image_url: string;
  estimated_value: number;
  status: string;
  tracking_number: string | null;
  admin_notes: string | null;
  shipped_at: string | null;
  received_at: string | null;
  verified_at: string | null;
  created_at: string;
  owner?: {
    email: string;
    display_name: string;
  };
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending_shipment: { label: 'Pending Shipment', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: <Clock className="w-3 h-3" /> },
  shipped: { label: 'Shipped', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: <Truck className="w-3 h-3" /> },
  received: { label: 'Received', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', icon: <Package className="w-3 h-3" /> },
  verified: { label: 'Verified', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: <CheckCircle className="w-3 h-3" /> },
  issue: { label: 'Issue', color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: <AlertCircle className="w-3 h-3" /> },
};

export const VaultManagement = () => {
  const { formatPrice } = useCurrency();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState({
    status: '',
    tracking_number: '',
    admin_notes: '',
    estimated_value: 0,
  });

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vault_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems((data || []) as VaultItem[]);
    } catch (error) {
      console.error('Error fetching vault items:', error);
      toast.error('Failed to load vault items');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openEditDialog = (item: VaultItem) => {
    setSelectedItem(item);
    setEditData({
      status: item.status || 'pending_shipment',
      tracking_number: item.tracking_number || '',
      admin_notes: item.admin_notes || '',
      estimated_value: item.estimated_value || 0,
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedItem) return;

    try {
      const updateData: Record<string, unknown> = {
        status: editData.status,
        tracking_number: editData.tracking_number || null,
        admin_notes: editData.admin_notes || null,
        estimated_value: editData.estimated_value,
      };

      // Set timestamps based on status changes
      if (editData.status === 'shipped' && selectedItem.status !== 'shipped') {
        updateData.shipped_at = new Date().toISOString();
      }
      if (editData.status === 'received' && selectedItem.status !== 'received') {
        updateData.received_at = new Date().toISOString();
      }
      if (editData.status === 'verified' && selectedItem.status !== 'verified') {
        updateData.verified_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('vault_items')
        .update(updateData)
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast.success('Vault item updated');
      setEditDialogOpen(false);
      fetchItems();
    } catch (error) {
      console.error('Error updating vault item:', error);
      toast.error('Failed to update vault item');
    }
  };

  const stats = {
    total: items.length,
    pending: items.filter(i => i.status === 'pending_shipment').length,
    shipped: items.filter(i => i.status === 'shipped').length,
    received: items.filter(i => i.status === 'received').length,
    verified: items.filter(i => i.status === 'verified').length,
    totalValue: items.reduce((sum, i) => sum + (i.estimated_value || 0), 0),
  };

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-8 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Items</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-500">{stats.shipped}</p>
            <p className="text-xs text-muted-foreground">Shipped</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/5 border-purple-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-500">{stats.received}</p>
            <p className="text-xs text-muted-foreground">Received</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-500">{stats.verified}</p>
            <p className="text-xs text-muted-foreground">Verified</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{formatPrice(stats.totalValue)}</p>
            <p className="text-xs text-muted-foreground">Total Value</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending_shipment">Pending Shipment</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="issue">Issue</SelectItem>
              </SelectContent>
            </Select>
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
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Vault Items
          </CardTitle>
          <CardDescription>
            Manage user vault shipments and verify items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map(item => {
                const status = statusConfig[item.status] || statusConfig.pending_shipment;
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.title}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            <Package className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <span className="font-medium truncate max-w-[200px]">{item.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {item.owner?.display_name || item.owner?.email || item.owner_id.slice(0, 8)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.category}</Badge>
                    </TableCell>
                    <TableCell>{item.condition}</TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(item.estimated_value || 0)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`gap-1 ${status.color}`}>
                        {status.icon}
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => openEditDialog(item)}
                        className="gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No vault items found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Vault Item Details</DialogTitle>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                {selectedItem.image_url ? (
                  <img 
                    src={selectedItem.image_url} 
                    alt={selectedItem.title}
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center">
                    <Package className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold">{selectedItem.title}</h3>
                  <p className="text-sm text-muted-foreground">{selectedItem.category} • {selectedItem.condition}</p>
                  {selectedItem.description && (
                    <p className="text-sm mt-2">{selectedItem.description}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending_shipment">Pending Shipment</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="issue">Issue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tracking Number</Label>
                  <Input
                    value={editData.tracking_number}
                    onChange={(e) => setEditData({ ...editData, tracking_number: e.target.value })}
                    placeholder="Enter tracking number if available"
                  />
                </div>

                <div>
                  <Label>Estimated Value (USD)</Label>
                  <Input
                    type="number"
                    value={editData.estimated_value}
                    onChange={(e) => setEditData({ ...editData, estimated_value: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <Label>Admin Notes</Label>
                  <Textarea
                    value={editData.admin_notes}
                    onChange={(e) => setEditData({ ...editData, admin_notes: e.target.value })}
                    placeholder="Internal notes about this item..."
                    rows={3}
                  />
                </div>

                {/* Timeline */}
                <div className="border-t pt-4">
                  <Label className="mb-2 block">Timeline</Label>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Submitted:</span>
                      <span>{new Date(selectedItem.created_at).toLocaleDateString()}</span>
                    </div>
                    {selectedItem.shipped_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shipped:</span>
                        <span>{new Date(selectedItem.shipped_at).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedItem.received_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Received:</span>
                        <span>{new Date(selectedItem.received_at).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedItem.verified_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Verified:</span>
                        <span>{new Date(selectedItem.verified_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};