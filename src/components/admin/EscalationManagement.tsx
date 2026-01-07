import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle, Clock, User, DollarSign, Loader2, RefreshCw, ShieldAlert, MessageSquare } from 'lucide-react';
import { useAdminEscalations, useAutoEscalateOverdueOrders } from '@/hooks/useOrderConfirmation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

export const EscalationManagement = () => {
  const { data: escalations, isLoading, refetch } = useAdminEscalations();
  const autoEscalate = useAutoEscalateOverdueOrders();
  const [selectedEscalation, setSelectedEscalation] = useState<any>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const queryClient = useQueryClient();

  const resolveMutation = useMutation({
    mutationFn: async ({ escalationId, action, notes }: { escalationId: string; action: 'resolved' | 'refunded' | 'released'; notes: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update escalation as resolved
      const { error: escalationError } = await supabase
        .from('order_escalations')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          resolution_notes: notes,
        })
        .eq('id', escalationId);

      if (escalationError) throw escalationError;

      // Update order status based on action
      const orderId = selectedEscalation?.order?.id;
      if (orderId) {
        const orderUpdate: Record<string, any> = {
          escrow_status: action === 'refunded' ? 'refunded' : 'released',
        };

        if (action === 'released') {
          orderUpdate.status = 'completed';
          orderUpdate.buyer_confirmed_at = new Date().toISOString();
          orderUpdate.seller_confirmed_at = new Date().toISOString();
        }

        const { error: orderError } = await supabase
          .from('orders')
          .update(orderUpdate)
          .eq('id', orderId);

        if (orderError) throw orderError;

        // Notify both parties
        const notifications = [
          {
            user_id: selectedEscalation.order.buyer_id,
            type: 'escalation_resolved',
            title: 'Order Dispute Resolved',
            body: `Admin has resolved the dispute: ${action}`,
            data: { order_id: orderId },
          },
          {
            user_id: selectedEscalation.order.seller_id,
            type: 'escalation_resolved',
            title: 'Order Dispute Resolved',
            body: `Admin has resolved the dispute: ${action}`,
            data: { order_id: orderId },
          },
        ];

        await supabase.from('notifications').insert(notifications);
      }
    },
    onSuccess: () => {
      toast.success('Escalation resolved');
      setSelectedEscalation(null);
      setResolutionNotes('');
      queryClient.invalidateQueries({ queryKey: ['admin-escalations'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to resolve: ${error.message}`);
    },
  });

  const getEscalationTypeBadge = (type: string) => {
    switch (type) {
      case 'buyer_no_confirm':
        return <Badge variant="outline" className="text-amber-600 border-amber-500">Buyer No Confirm</Badge>;
      case 'seller_no_confirm':
        return <Badge variant="outline" className="text-amber-600 border-amber-500">Seller No Confirm</Badge>;
      case 'buyer_dispute':
        return <Badge variant="destructive">Buyer Dispute</Badge>;
      case 'seller_dispute':
        return <Badge variant="destructive">Seller Dispute</Badge>;
      case 'timeout':
        return <Badge variant="outline" className="text-orange-600 border-orange-500">Timeout</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const formatPrice = (price: number) => `$${price?.toFixed(2) || '0.00'}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-500" />
            Order Escalations
          </h2>
          <p className="text-muted-foreground">
            Orders requiring admin intervention
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            variant="secondary"
            onClick={() => autoEscalate.mutate()}
            disabled={autoEscalate.isPending}
          >
            {autoEscalate.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Auto-Escalate Overdue
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{escalations?.length || 0}</div>
            <p className="text-sm text-muted-foreground">Pending Escalations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-500">
              {escalations?.filter(e => e.escalation_type.includes('no_confirm')).length || 0}
            </div>
            <p className="text-sm text-muted-foreground">No Confirmations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-500">
              {escalations?.filter(e => e.escalation_type.includes('dispute')).length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Active Disputes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-500">
              {escalations?.filter(e => e.escalation_type === 'timeout').length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Timeouts</p>
          </CardContent>
        </Card>
      </div>

      {/* Escalation List */}
      {escalations && escalations.length > 0 ? (
        <div className="space-y-3">
          {escalations.map((escalation) => (
            <Card 
              key={escalation.id}
              className="hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => setSelectedEscalation(escalation)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <AlertTriangle className="w-8 h-8 text-amber-500" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {escalation.order?.listing?.title || `Order #${escalation.order_id.slice(0, 8)}`}
                        </span>
                        {getEscalationTypeBadge(escalation.escalation_type)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {formatPrice(escalation.order?.price)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(escalation.created_at), { addSuffix: true })}
                        </span>
                        {escalation.reason && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {escalation.reason.slice(0, 50)}...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium">All Clear!</h3>
            <p className="text-muted-foreground">No pending escalations to review.</p>
          </CardContent>
        </Card>
      )}

      {/* Resolution Dialog */}
      <Dialog open={!!selectedEscalation} onOpenChange={() => setSelectedEscalation(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Resolve Escalation</DialogTitle>
            <DialogDescription>
              Review the details and take action on this escalation.
            </DialogDescription>
          </DialogHeader>

          {selectedEscalation && (
            <div className="space-y-4">
              {/* Order Details */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Order</span>
                  <span className="font-mono text-sm">#{selectedEscalation.order_id.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="font-medium">{formatPrice(selectedEscalation.order?.price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  {getEscalationTypeBadge(selectedEscalation.escalation_type)}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Buyer Confirmed</span>
                  <span>{selectedEscalation.order?.buyer_confirmed_at ? '✅ Yes' : '❌ No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Seller Confirmed</span>
                  <span>{selectedEscalation.order?.seller_confirmed_at ? '✅ Yes' : '❌ No'}</span>
                </div>
              </div>

              {/* Reason */}
              {selectedEscalation.reason && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">
                    Escalation Reason:
                  </p>
                  <p className="text-sm">{selectedEscalation.reason}</p>
                </div>
              )}

              {/* Resolution Notes */}
              <div>
                <label className="text-sm font-medium mb-2 block">Resolution Notes</label>
                <Textarea
                  placeholder="Document how this was resolved..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => resolveMutation.mutate({
                    escalationId: selectedEscalation.id,
                    action: 'released',
                    notes: resolutionNotes,
                  })}
                  disabled={resolveMutation.isPending}
                >
                  {resolveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Release Funds
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => resolveMutation.mutate({
                    escalationId: selectedEscalation.id,
                    action: 'refunded',
                    notes: resolutionNotes,
                  })}
                  disabled={resolveMutation.isPending}
                >
                  Refund Buyer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
