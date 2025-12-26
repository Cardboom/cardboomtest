import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useGradingAdmin, GradingOrderStatus, GRADING_CATEGORIES } from '@/hooks/useGrading';
import { format } from 'date-fns';
import { RefreshCw, DollarSign, Eye, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<GradingOrderStatus, string> = {
  pending_payment: 'bg-amber-500',
  queued: 'bg-blue-500',
  in_review: 'bg-purple-500',
  completed: 'bg-emerald-500',
  failed: 'bg-destructive',
  refunded: 'bg-gray-500',
};

export function GradingManagement() {
  const { orders, isLoading, fetchAllOrders, updateStatus, refundOrder } = useGradingAdmin();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [refundingId, setRefundingId] = useState<string | null>(null);

  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(o => o.status === statusFilter);

  const handleStatusChange = async (orderId: string, newStatus: GradingOrderStatus) => {
    await updateStatus(orderId, newStatus);
  };

  const handleRefund = async (orderId: string) => {
    setRefundingId(orderId);
    await refundOrder(orderId);
    setRefundingId(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Grading Orders
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending_payment">Pending Payment</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchAllOrders}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : filteredOrders.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No grading orders found</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const category = GRADING_CATEGORIES.find(c => c.id === order.category);
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">
                        {order.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.profiles?.display_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{order.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {category?.icon} {category?.name}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={order.status}
                          onValueChange={(v) => handleStatusChange(order.id, v as GradingOrderStatus)}
                          disabled={order.status === 'refunded'}
                        >
                          <SelectTrigger className="w-32">
                            <Badge className={cn('text-white', STATUS_COLORS[order.status])}>
                              {order.status.replace('_', ' ')}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="queued">Queued</SelectItem>
                            <SelectItem value="in_review">In Review</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {order.final_grade ? (
                          <span className="font-bold text-primary">
                            {order.final_grade.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(order.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {order.status !== 'refunded' && order.paid_at && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                disabled={refundingId === order.id}
                              >
                                <DollarSign className="w-3 h-3 mr-1" />
                                Refund
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Refund Order?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will refund $20 to the user's wallet and mark the order as refunded.
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRefund(order.id)}>
                                  Confirm Refund
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
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
  );
}
