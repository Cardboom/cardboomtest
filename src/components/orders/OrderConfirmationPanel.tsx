import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, CheckCircle, Package, DollarSign, Clock, ShieldAlert, ThumbsUp, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, addDays, isPast } from 'date-fns';

interface OrderConfirmationPanelProps {
  order: {
    id: string;
    status: string;
    buyer_id: string;
    seller_id: string;
    price: number;
    buyer_confirmed_at?: string | null;
    seller_confirmed_at?: string | null;
    confirmation_deadline?: string | null;
    delivered_at?: string | null;
    escrow_status?: string | null;
  };
  currentUserId: string;
  onConfirmationComplete?: () => void;
}

export const OrderConfirmationPanel = ({ 
  order, 
  currentUserId,
  onConfirmationComplete 
}: OrderConfirmationPanelProps) => {
  const [disputeReason, setDisputeReason] = useState('');
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const queryClient = useQueryClient();

  const isBuyer = currentUserId === order.buyer_id;
  const isSeller = currentUserId === order.seller_id;
  const myConfirmed = isBuyer ? order.buyer_confirmed_at : order.seller_confirmed_at;
  const otherConfirmed = isBuyer ? order.seller_confirmed_at : order.buyer_confirmed_at;
  const bothConfirmed = order.buyer_confirmed_at && order.seller_confirmed_at;
  
  // Calculate deadline (7 days after delivery if not set)
  const deadline = order.confirmation_deadline 
    ? new Date(order.confirmation_deadline)
    : order.delivered_at 
      ? addDays(new Date(order.delivered_at), 7)
      : null;
  
  const isOverdue = deadline && isPast(deadline);

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const updateField = isBuyer 
        ? { buyer_confirmed_at: new Date().toISOString() }
        : { seller_confirmed_at: new Date().toISOString() };

      const { error } = await supabase
        .from('orders')
        .update({
          ...updateField,
          // If both parties have now confirmed, update status
          ...(otherConfirmed ? { status: 'completed', escrow_status: 'released' } : {})
        })
        .eq('id', order.id);

      if (error) throw error;

      // Create notification for the other party
      const otherPartyId = isBuyer ? order.seller_id : order.buyer_id;
      await supabase.from('notifications').insert({
        user_id: otherPartyId,
        type: 'order_confirmed',
        title: isBuyer ? 'Buyer Confirmed Receipt' : 'Seller Confirmed Payment',
        body: isBuyer 
          ? 'The buyer has confirmed they received the item.' 
          : 'The seller has confirmed they received payment.',
        data: { order_id: order.id },
      });

      return { bothConfirmed: !!otherConfirmed };
    },
    onSuccess: (data) => {
      toast.success(
        data.bothConfirmed 
          ? 'Transaction complete! Both parties have confirmed.' 
          : 'Confirmation recorded. Waiting for other party.'
      );
      queryClient.invalidateQueries({ queryKey: ['order', order.id] });
      onConfirmationComplete?.();
    },
    onError: (error: Error) => {
      toast.error(`Failed to confirm: ${error.message}`);
    }
  });

  const escalateMutation = useMutation({
    mutationFn: async (reason: string) => {
      // Create escalation record
      const { error: escalationError } = await supabase
        .from('order_escalations')
        .insert({
          order_id: order.id,
          escalation_type: isBuyer ? 'buyer_dispute' : 'seller_dispute',
          escalated_by: currentUserId,
          reason,
        });

      if (escalationError) throw escalationError;

      // Update order with escalation
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          admin_escalated_at: new Date().toISOString(),
          escalation_reason: reason,
          escrow_status: 'disputed',
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      // Notify admins
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'moderator']);

      if (admins && admins.length > 0) {
        const adminNotifications = admins.map(admin => ({
          user_id: admin.user_id,
          type: 'admin_escalation',
          title: '⚠️ Order Escalation Required',
          body: `Order #${order.id.slice(0, 8)} has been escalated: ${reason}`,
          data: { order_id: order.id, escalated_by: currentUserId },
        }));
        
        await supabase.from('notifications').insert(adminNotifications);
      }
    },
    onSuccess: () => {
      toast.success('Issue escalated to admin team. They will review shortly.');
      setShowDisputeForm(false);
      queryClient.invalidateQueries({ queryKey: ['order', order.id] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to escalate: ${error.message}`);
    }
  });

  // Don't show panel if order isn't in shipped/delivered state
  if (!['shipped', 'delivered'].includes(order.status) && order.escrow_status !== 'shipped') {
    return null;
  }

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Transaction Confirmation</CardTitle>
          </div>
          {bothConfirmed && (
            <Badge className="bg-green-500">
              <CheckCircle className="w-3 h-3 mr-1" /> Complete
            </Badge>
          )}
        </div>
        <CardDescription>
          Both parties must confirm to complete the transaction securely.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Buyer Status */}
          <div className={`p-3 rounded-lg border ${order.buyer_confirmed_at ? 'bg-green-500/10 border-green-500/30' : 'bg-muted/50 border-border'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4" />
              <span className="text-sm font-medium">Buyer</span>
            </div>
            <div className="flex items-center gap-2">
              {order.buyer_confirmed_at ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-green-600 dark:text-green-400">
                    Received item
                  </span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Pending confirmation
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Seller Status */}
          <div className={`p-3 rounded-lg border ${order.seller_confirmed_at ? 'bg-green-500/10 border-green-500/30' : 'bg-muted/50 border-border'}`}>
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm font-medium">Seller</span>
            </div>
            <div className="flex items-center gap-2">
              {order.seller_confirmed_at ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-green-600 dark:text-green-400">
                    Payment received
                  </span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Pending confirmation
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Deadline Warning */}
        {deadline && !bothConfirmed && (
          <div className={`p-3 rounded-lg flex items-start gap-2 ${isOverdue ? 'bg-red-500/10 border border-red-500/30' : 'bg-amber-500/10 border border-amber-500/30'}`}>
            <AlertTriangle className={`w-4 h-4 mt-0.5 ${isOverdue ? 'text-red-500' : 'text-amber-500'}`} />
            <div>
              <p className={`text-sm font-medium ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {isOverdue ? 'Confirmation overdue!' : 'Confirmation deadline'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isOverdue 
                  ? `Was due ${formatDistanceToNow(deadline)} ago`
                  : `Due ${formatDistanceToNow(deadline, { addSuffix: true })} (${format(deadline, 'MMM d, h:mm a')})`
                }
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {(isBuyer || isSeller) && !myConfirmed && (
          <div className="space-y-3">
            <Button
              className="w-full"
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending}
            >
              {confirmMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ThumbsUp className="w-4 h-4 mr-2" />
              )}
              {isBuyer ? 'Confirm I Received the Item' : 'Confirm I Received Payment'}
            </Button>

            {!showDisputeForm ? (
              <Button
                variant="outline"
                className="w-full text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                onClick={() => setShowDisputeForm(true)}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Report an Issue
              </Button>
            ) : (
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                <Textarea
                  placeholder="Describe the issue (e.g., item not received, item damaged, payment not showing)..."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => escalateMutation.mutate(disputeReason)}
                    disabled={!disputeReason.trim() || escalateMutation.isPending}
                  >
                    {escalateMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                    Escalate to Admin
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowDisputeForm(false);
                      setDisputeReason('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Already confirmed message */}
        {myConfirmed && !bothConfirmed && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                You've confirmed!
              </p>
              <p className="text-xs text-muted-foreground">
                Waiting for the {isBuyer ? 'seller' : 'buyer'} to confirm.
              </p>
            </div>
          </div>
        )}

        {/* Transaction complete */}
        {bothConfirmed && (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="font-medium text-green-600 dark:text-green-400">
              Transaction Complete!
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {formatPrice(order.price)} has been released to the seller.
            </p>
          </div>
        )}

        {/* Escrow Protection Notice */}
        <p className="text-xs text-muted-foreground text-center">
          🔒 Protected by CardBoom Escrow+ — Funds secured until both parties confirm
        </p>
      </CardContent>
    </Card>
  );
};
