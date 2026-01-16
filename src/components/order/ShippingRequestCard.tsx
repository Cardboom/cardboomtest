import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Truck, 
  CheckCircle2, 
  Clock, 
  Loader2,
  AlertCircle,
  Send
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface ShippingRequestCardProps {
  orderId: string;
  currentUserId: string;
  isBuyer: boolean;
  isSeller: boolean;
  deliveryOption: string;
  shippingRequestedAt: string | null;
  shippingRequestedBy: string | null;
  buyerApprovedShipping: boolean | null;
  sellerApprovedShipping: boolean | null;
  buyerShippingApprovedAt: string | null;
  sellerShippingApprovedAt: string | null;
  buyerUsername: string | null;
  sellerUsername: string | null;
  buyerId: string;
  sellerId: string;
}

export function ShippingRequestCard({
  orderId,
  currentUserId,
  isBuyer,
  isSeller,
  deliveryOption,
  shippingRequestedAt,
  shippingRequestedBy,
  buyerApprovedShipping,
  sellerApprovedShipping,
  buyerShippingApprovedAt,
  sellerShippingApprovedAt,
  buyerUsername,
  sellerUsername,
  buyerId,
  sellerId,
}: ShippingRequestCardProps) {
  const queryClient = useQueryClient();
  const [isRequestingShipping, setIsRequestingShipping] = useState(false);

  // Determine if shipping has been requested
  const hasShippingRequest = !!shippingRequestedAt;
  
  // Both parties approved
  const bothApproved = buyerApprovedShipping === true && sellerApprovedShipping === true;
  
  // Current user's approval status
  const currentUserApproved = isBuyer ? buyerApprovedShipping : sellerApprovedShipping;
  const otherUserApproved = isBuyer ? sellerApprovedShipping : buyerApprovedShipping;
  
  // Who requested shipping
  const requestedByCurrentUser = shippingRequestedBy === currentUserId;
  const requestedByBuyer = shippingRequestedBy === buyerId;
  const requesterName = requestedByBuyer ? buyerUsername : sellerUsername;

  // Request shipping mutation
  const requestShippingMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('orders')
        .update({
          shipping_requested_at: new Date().toISOString(),
          shipping_requested_by: currentUserId,
          // Auto-approve for the requester
          ...(isBuyer 
            ? { buyer_approved_shipping: true, buyer_shipping_approved_at: new Date().toISOString() }
            : { seller_approved_shipping: true, seller_shipping_approved_at: new Date().toISOString() }
          ),
        })
        .eq('id', orderId);

      if (error) throw error;

      // Create notification for the other party
      const otherUserId = isBuyer ? sellerId : buyerId;
      const requesterName = isBuyer ? (buyerUsername || 'The buyer') : (sellerUsername || 'The seller');
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: otherUserId,
        type: 'shipping_approval_required',
        title: '📦 Shipping Request',
        body: `${requesterName} has requested shipping for your order. Please review and approve.`,
        data: { order_id: orderId },
      });
      
      if (notifError) {
        console.error('Failed to create shipping notification:', notifError);
      }
    },
    onSuccess: () => {
      toast.success('Shipping request sent! Waiting for approval.');
      queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to request shipping: ${error.message}`);
    },
  });

  // Approve shipping mutation
  const approveShippingMutation = useMutation({
    mutationFn: async () => {
      const updateData = isBuyer 
        ? { buyer_approved_shipping: true, buyer_shipping_approved_at: new Date().toISOString() }
        : { seller_approved_shipping: true, seller_shipping_approved_at: new Date().toISOString() };

      // Check if other party already approved
      const otherApproved = isBuyer ? sellerApprovedShipping : buyerApprovedShipping;

      const { error } = await supabase
        .from('orders')
        .update({
          ...updateData,
          // If both now approved, update delivery option to ship
          ...(otherApproved ? { delivery_option: 'ship' } : {}),
        })
        .eq('id', orderId);

      if (error) throw error;

      // Notify the other party
      const otherUserId = isBuyer ? sellerId : buyerId;
      
      if (otherApproved) {
        // Both approved - notify about shipping being ready
        await supabase.from('notifications').insert([
          {
            user_id: otherUserId,
            type: 'shipping_approved',
            title: 'Shipping Approved',
            body: 'Both parties have approved shipping. The order will now be shipped.',
            data: { order_id: orderId },
          },
          {
            user_id: currentUserId,
            type: 'shipping_approved',
            title: 'Shipping Approved',
            body: 'Both parties have approved shipping. The order will now be shipped.',
            data: { order_id: orderId },
          },
        ]);
      } else {
        // Only current user approved - notify other party
        await supabase.from('notifications').insert({
          user_id: otherUserId,
          type: 'shipping_approval_required',
          title: 'Shipping Approval Pending',
          body: `${isBuyer ? buyerUsername : sellerUsername} has approved shipping. Your approval is still needed.`,
          data: { order_id: orderId },
        });
      }
    },
    onSuccess: () => {
      if (otherUserApproved) {
        toast.success('Shipping approved! Both parties have agreed - shipping will proceed.');
      } else {
        toast.success('You approved shipping. Waiting for the other party.');
      }
      queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve shipping: ${error.message}`);
    },
  });

  // If delivery is already set to ship, don't show this card
  if (deliveryOption === 'ship') {
    return null;
  }

  // If both approved, show success state briefly then hide
  if (bothApproved) {
    return (
      <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-900/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle2 className="w-5 h-5" />
            Shipping Approved
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-600 dark:text-green-400">
            Both parties have approved shipping. The order will be updated for shipping.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Truck className="w-5 h-5 text-primary" />
          Request Shipping
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasShippingRequest ? (
          // No shipping request yet
          <>
            <p className="text-sm text-muted-foreground">
              This order is set for vault storage. If you'd like to have the item shipped instead, 
              both you and the {isBuyer ? 'seller' : 'buyer'} must approve the shipping request.
            </p>
            <Button
              onClick={() => requestShippingMutation.mutate()}
              disabled={requestShippingMutation.isPending}
              className="w-full"
            >
              {requestShippingMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Request Shipping
            </Button>
          </>
        ) : (
          // Shipping has been requested
          <>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">
                <span className="font-medium">{requesterName || 'A user'}</span> requested shipping{' '}
                {formatDistanceToNow(new Date(shippingRequestedAt), { addSuffix: true })}
              </p>
            </div>

            {/* Approval Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg border ${buyerApprovedShipping ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-muted'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {buyerApprovedShipping ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">Buyer</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {buyerApprovedShipping 
                    ? buyerShippingApprovedAt 
                      ? `Approved ${formatDistanceToNow(new Date(buyerShippingApprovedAt), { addSuffix: true })}`
                      : 'Approved'
                    : 'Pending'}
                </p>
              </div>
              <div className={`p-3 rounded-lg border ${sellerApprovedShipping ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-muted'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {sellerApprovedShipping ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">Seller</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {sellerApprovedShipping 
                    ? sellerShippingApprovedAt
                      ? `Approved ${formatDistanceToNow(new Date(sellerShippingApprovedAt), { addSuffix: true })}`
                      : 'Approved'
                    : 'Pending'}
                </p>
              </div>
            </div>

            {/* Action Button */}
            {currentUserApproved ? (
              <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span className="text-sm">You've approved shipping. Waiting for {isBuyer ? 'seller' : 'buyer'} approval.</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    Your approval is required for shipping. Once both parties approve, the item will be shipped.
                  </p>
                </div>
                <Button
                  onClick={() => approveShippingMutation.mutate()}
                  disabled={approveShippingMutation.isPending}
                  className="w-full"
                >
                  {approveShippingMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Approve Shipping
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
