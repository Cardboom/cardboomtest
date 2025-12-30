import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Search, 
  RefreshCw, 
  Eye, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  Package,
  DollarSign
} from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-500', icon: <Clock className="w-4 h-4" /> },
  confirmed: { label: 'Confirmed', color: 'bg-blue-500/10 text-blue-500', icon: <CheckCircle className="w-4 h-4" /> },
  shipped: { label: 'Shipped', color: 'bg-purple-500/10 text-purple-500', icon: <Truck className="w-4 h-4" /> },
  delivered: { label: 'Delivered', color: 'bg-emerald-500/10 text-emerald-500', icon: <Package className="w-4 h-4" /> },
  completed: { label: 'Completed', color: 'bg-emerald-500/10 text-emerald-500', icon: <CheckCircle className="w-4 h-4" /> },
  disputed: { label: 'Disputed', color: 'bg-red-500/10 text-red-500', icon: <AlertTriangle className="w-4 h-4" /> },
  refunded: { label: 'Refunded', color: 'bg-gray-500/10 text-gray-500', icon: <DollarSign className="w-4 h-4" /> },
  cancelled: { label: 'Cancelled', color: 'bg-gray-500/10 text-gray-500', icon: <XCircle className="w-4 h-4" /> },
};

export const OrderManagement = () => {
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // Fetch orders
  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['admin-orders', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          listing:listings(title, images),
          buyer:profiles!orders_buyer_id_fkey(display_name, email),
          seller:profiles!orders_seller_id_fkey(display_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch disputes
  const { data: disputes } = useQuery({
    queryKey: ['admin-disputes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_disputes')
        .select('*')
        .in('status', ['open', 'under_review', 'awaiting_seller', 'awaiting_buyer']);
      if (error) throw error;
      return data || [];
    }
  });

  // Update order status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: status as any })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Order status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setSelectedOrder(null);
    },
    onError: (error) => {
      toast.error('Failed to update order: ' + error.message);
    }
  });

  // Issue refund
  const refundMutation = useMutation({
    mutationFn: async ({ orderId, amount }: { orderId: string; amount: number }) => {
      // Update order status to cancelled (closest to refunded)
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' as any })
        .eq('id', orderId);
      if (error) throw error;

      // In production, this would also create a refund transaction
      // and trigger payment provider refund
    },
    onSuccess: () => {
      toast.success('Refund issued successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setSelectedOrder(null);
      setRefundAmount('');
    },
    onError: (error) => {
      toast.error('Failed to issue refund: ' + error.message);
    }
  });

  // Filter orders
  const filteredOrders = orders?.filter(order => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      order.id.toLowerCase().includes(search) ||
      (order.listing as any)?.title?.toLowerCase().includes(search) ||
      (order.buyer as any)?.display_name?.toLowerCase().includes(search) ||
      (order.seller as any)?.display_name?.toLowerCase().includes(search)
    );
  });

  const openDisputes = disputes?.length || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{orders?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-500">
                  {orders?.filter(o => o.status === 'pending').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Open Disputes</p>
                <p className="text-2xl font-bold text-red-500">{openDisputes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-emerald-500">
                  {orders?.filter(o => o.status === 'completed').length || 0}
                </p>
              </div>
            </div>
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
                placeholder="Search by order ID, item, buyer, or seller..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="disputed">Disputed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>Orders ({filteredOrders?.length || 0})</CardTitle>
          <CardDescription>Manage and track all marketplace orders</CardDescription>
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
                    <TableHead>Order ID</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders?.map((order) => {
                    const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">
                          {order.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {(order.listing as any)?.title || 'N/A'}
                        </TableCell>
                        <TableCell>{(order.buyer as any)?.display_name || 'Unknown'}</TableCell>
                        <TableCell>{(order.seller as any)?.display_name || 'Unknown'}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(order.price)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`gap-1 ${status.color}`}>
                            {status.icon}
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(order.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>Order ID: {selectedOrder?.id}</DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Item</p>
                  <p className="font-medium">{(selectedOrder.listing as any)?.title || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="font-medium text-primary">{formatPrice(selectedOrder.price)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Buyer</p>
                  <p className="font-medium">{(selectedOrder.buyer as any)?.display_name}</p>
                  <p className="text-sm text-muted-foreground">{(selectedOrder.buyer as any)?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Seller</p>
                  <p className="font-medium">{(selectedOrder.seller as any)?.display_name}</p>
                  <p className="text-sm text-muted-foreground">{(selectedOrder.seller as any)?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Buyer Fee</p>
                  <p className="font-medium">{formatPrice(selectedOrder.buyer_fee)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Seller Fee</p>
                  <p className="font-medium">{formatPrice(selectedOrder.seller_fee)}</p>
                </div>
              </div>

              {/* Status Update */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {['pending', 'confirmed', 'shipped', 'delivered', 'completed'].map((status) => (
                    <Button
                      key={status}
                      variant={selectedOrder.status === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ orderId: selectedOrder.id, status })}
                      disabled={updateStatusMutation.isPending}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Refund Section */}
              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium text-red-500">Issue Refund</p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Refund amount"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-40"
                  />
                  <Button
                    variant="destructive"
                    onClick={() => refundMutation.mutate({ 
                      orderId: selectedOrder.id, 
                      amount: parseFloat(refundAmount) || selectedOrder.price 
                    })}
                    disabled={refundMutation.isPending}
                  >
                    Issue Refund
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave amount empty for full refund ({formatPrice(selectedOrder.price)})
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
