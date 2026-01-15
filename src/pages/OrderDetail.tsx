import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldCheck,
  ArrowLeft,
  MessageSquare,
  Loader2,
  User,
  DollarSign,
  Calendar,
  Shield,
  Star
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { OrderReviewSection } from '@/components/OrderReviewSection';
import { ShippingRequestCard } from '@/components/order/ShippingRequestCard';
import { ShippingSelector } from '@/components/order/ShippingSelector';
import { OrderReceipt } from '@/components/order/OrderReceipt';
import { ContactPartyButton } from '@/components/order/ContactPartyButton';
import { useState as useCartState } from 'react';

interface OrderAction {
  id: string;
  action_type: string;
  actor_id: string | null;
  actor_type: string;
  details: Record<string, any>;
  created_at: string;
}

interface Order {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  price: number;
  buyer_fee: number;
  seller_fee: number;
  status: string;
  escrow_status: string | null;
  escrow_held_amount: number | null;
  seller_is_verified: boolean | null;
  delivery_option: string;
  tracking_number: string | null;
  shipping_address: any;
  buyer_confirmed_at: string | null;
  seller_confirmed_at: string | null;
  funds_released_at: string | null;
  refunded_at: string | null;
  admin_escalated_at: string | null;
  escalation_reason: string | null;
  // Shipping request approval fields
  shipping_requested_at: string | null;
  shipping_requested_by: string | null;
  buyer_approved_shipping: boolean | null;
  seller_approved_shipping: boolean | null;
  buyer_shipping_approved_at: string | null;
  seller_shipping_approved_at: string | null;
  created_at: string;
  updated_at: string;
  listing: {
    title: string;
    image_url: string | null;
    condition: string;
    category: string | null;
    description: string | null;
    grade: string | null;
    grading_company: string | null;
    language: string | null;
    set_name: string | null;
  } | null;
  buyer_profile: {
    username: string;
    avatar_url: string | null;
  } | null;
  seller_profile: {
    username: string;
    avatar_url: string | null;
    is_verified_seller: boolean;
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-yellow-500', icon: <Clock className="w-4 h-4" /> },
  paid: { label: 'Paid', color: 'bg-blue-500', icon: <DollarSign className="w-4 h-4" /> },
  shipped: { label: 'Shipped', color: 'bg-purple-500', icon: <Truck className="w-4 h-4" /> },
  delivered: { label: 'Delivered', color: 'bg-green-500', icon: <Package className="w-4 h-4" /> },
  completed: { label: 'Completed', color: 'bg-green-600', icon: <CheckCircle2 className="w-4 h-4" /> },
  disputed: { label: 'Disputed', color: 'bg-red-500', icon: <AlertTriangle className="w-4 h-4" /> },
  refunded: { label: 'Refunded', color: 'bg-gray-500', icon: <DollarSign className="w-4 h-4" /> },
};

const ESCROW_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Funds Held', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' },
  released: { label: 'Funds Released', color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
  disputed: { label: 'Under Dispute', color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
  refunded: { label: 'Refunded', color: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30' },
};

const ACTION_LABELS: Record<string, string> = {
  created: 'Order Created',
  payment_captured: 'Payment Captured',
  shipped: 'Item Shipped',
  delivered: 'Item Delivered',
  buyer_confirmed: 'Buyer Confirmed Receipt',
  seller_confirmed: 'Seller Confirmed Payment',
  disputed: 'Dispute Opened',
  funds_released: 'Funds Released to Seller',
  refunded: 'Order Refunded',
  admin_action: 'Admin Action',
};

export default function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [showDisputeForm, setShowDisputeForm] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  // Fetch order details
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;

      // Fetch listing separately with more details
      const { data: listingData } = data.listing_id 
        ? await supabase.from('listings').select('title, image_url, condition, category, description, grade, grading_company, language, set_name').eq('id', data.listing_id).single()
        : { data: null };

      // Fetch profiles separately using display_name as username
      const [buyerProfile, sellerProfile] = await Promise.all([
        supabase.from('profiles').select('display_name, avatar_url').eq('id', data.buyer_id).single(),
        supabase.from('profiles').select('display_name, avatar_url, instant_sale_eligible').eq('id', data.seller_id).single(),
      ]);

      return {
        ...data,
        listing: listingData,
        buyer_profile: buyerProfile.data ? { username: buyerProfile.data.display_name, avatar_url: buyerProfile.data.avatar_url } : null,
        seller_profile: sellerProfile.data ? { username: sellerProfile.data.display_name, avatar_url: sellerProfile.data.avatar_url, is_verified_seller: sellerProfile.data.instant_sale_eligible } : null,
      } as Order;
    },
    enabled: !!orderId,
  });

  // Fetch order actions timeline
  const { data: actions } = useQuery({
    queryKey: ['order-actions', orderId],
    queryFn: async () => {
      if (!orderId) return [];
      
      const { data, error } = await supabase
        .from('order_actions')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as OrderAction[];
    },
    enabled: !!orderId,
  });

  const isBuyer = currentUserId === order?.buyer_id;
  const isSeller = currentUserId === order?.seller_id;
  const canConfirm = (isBuyer && !order?.buyer_confirmed_at) || (isSeller && !order?.seller_confirmed_at);
  const bothConfirmed = !!order?.buyer_confirmed_at && !!order?.seller_confirmed_at;
  const isDisputed = order?.escrow_status === 'disputed';
  const isCompleted = order?.status === 'completed' || order?.escrow_status === 'released';

  // Confirm receipt/payment mutation
  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!order || !currentUserId) throw new Error('Missing data');

      const updateField = isBuyer 
        ? { buyer_confirmed_at: new Date().toISOString() }
        : { seller_confirmed_at: new Date().toISOString() };

      const otherConfirmed = isBuyer ? order.seller_confirmed_at : order.buyer_confirmed_at;

      // Update order
      const { error } = await supabase
        .from('orders')
        .update({
          ...updateField,
          ...(otherConfirmed ? { status: 'completed' } : {}),
        })
        .eq('id', order.id);

      if (error) throw error;

      // Log action
      await supabase.rpc('log_order_action', {
        p_order_id: order.id,
        p_action_type: isBuyer ? 'buyer_confirmed' : 'seller_confirmed',
        p_actor_id: currentUserId,
        p_actor_type: 'user',
        p_details: {},
      });

      // If both confirmed, release funds and notify
      if (otherConfirmed) {
        await supabase.rpc('release_escrow_funds', {
          p_order_id: order.id,
          p_released_by: currentUserId,
        });

        // Send completion notification to both parties
        const notifyBoth = [order.buyer_id, order.seller_id];
        for (const userId of notifyBoth) {
          try {
            await supabase.functions.invoke('send-notification', {
              body: {
                user_id: userId,
                type: 'order_completed',
                title: 'Order Completed! 🎉',
                body: `Your order for "${order.listing?.title || 'item'}" has been completed. Funds have been released.`,
                data: { order_id: order.id },
              },
            });
          } catch (e) {
            console.error('Failed to send completion notification:', e);
          }
        }
      } else {
        // Notify the other party that confirmation is pending
        const otherPartyId = isBuyer ? order.seller_id : order.buyer_id;
        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              user_id: otherPartyId,
              type: 'order_update',
              title: 'Confirmation Received',
              body: `The ${isBuyer ? 'buyer' : 'seller'} has confirmed. Please confirm to complete the order.`,
              data: { order_id: order.id },
            },
          });
        } catch (e) {
          console.error('Failed to send confirmation notification:', e);
        }
      }
    },
    onSuccess: () => {
      toast.success(isBuyer ? 'Receipt confirmed!' : 'Payment confirmed!');
      queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order-actions', orderId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to confirm: ${error.message}`);
    },
  });

  // Open dispute mutation
  const disputeMutation = useMutation({
    mutationFn: async (reason: string) => {
      if (!order || !currentUserId) throw new Error('Missing data');

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

      // Update order - set escrow_status to disputed
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          admin_escalated_at: new Date().toISOString(),
          escalation_reason: reason,
          escrow_status: 'disputed',
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      // Log action
      await supabase.rpc('log_order_action', {
        p_order_id: order.id,
        p_action_type: 'disputed',
        p_actor_id: currentUserId,
        p_actor_type: 'user',
        p_details: { reason },
      });
    },
    onSuccess: () => {
      toast.success('Dispute submitted. Our team will review it shortly.');
      setShowDisputeForm(false);
      setDisputeReason('');
      queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order-actions', orderId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit dispute: ${error.message}`);
    },
  });

  const [cartCount] = useCartState(0);

  if (orderLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={cartCount} onCartClick={() => {}} />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={cartCount} onCartClick={() => {}} />
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
          <p className="text-muted-foreground mb-6">This order doesn't exist or you don't have access to view it.</p>
          <Link to="/profile">
            <Button>Back to Profile</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const escrowConfig = ESCROW_STATUS_CONFIG[order.escrow_status || 'pending'];

  return (
    <div className="min-h-screen bg-background">
      <Header cartCount={cartCount} onCartClick={() => {}} />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Link to="/profile" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">Order #{order.id.slice(0, 8)}</h1>
              <p className="text-muted-foreground">
                Created {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`${statusConfig.color} text-white`}>
                {statusConfig.icon}
                <span className="ml-1">{statusConfig.label}</span>
              </Badge>
              
              {/* Quick Actions */}
              <OrderReceipt order={order} formatPrice={formatPrice} />
              
              {currentUserId && (isBuyer || isSeller) && order.listing_id && (
                <ContactPartyButton
                  orderId={order.id}
                  listingId={order.listing_id}
                  counterpartyId={isBuyer ? order.seller_id : order.buyer_id}
                  counterpartyName={isBuyer 
                    ? (order.seller_profile?.username || 'Seller')
                    : (order.buyer_profile?.username || 'Buyer')
                  }
                  isBuyer={isBuyer}
                />
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Item Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Item Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  {order.listing?.image_url ? (
                    <img 
                      src={order.listing.image_url} 
                      alt={order.listing.title}
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center">
                      <Package className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{order.listing?.title || 'Unknown Item'}</h3>
                    <p className="text-xl font-bold text-primary mt-1">{formatPrice(order.price)}</p>
                    
                    {/* Item badges */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {order.listing?.condition && (
                        <Badge variant="secondary">{order.listing.condition}</Badge>
                      )}
                      {order.listing?.category && (
                        <Badge variant="outline">{order.listing.category}</Badge>
                      )}
                      {order.listing?.grade && (
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                          {order.listing.grading_company || 'Graded'}: {order.listing.grade}
                        </Badge>
                      )}
                      {order.listing?.language && order.listing.language !== 'English' && (
                        <Badge variant="outline">{order.listing.language}</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {order.listing?.set_name && (
                    <div>
                      <p className="text-muted-foreground text-xs">Set</p>
                      <p className="font-medium">{order.listing.set_name}</p>
                    </div>
                  )}
                  {order.listing?.category && (
                    <div>
                      <p className="text-muted-foreground text-xs">Category</p>
                      <p className="font-medium">{order.listing.category}</p>
                    </div>
                  )}
                  {order.listing?.condition && (
                    <div>
                      <p className="text-muted-foreground text-xs">Condition</p>
                      <p className="font-medium">{order.listing.condition}</p>
                    </div>
                  )}
                  {order.listing?.grade && (
                    <div>
                      <p className="text-muted-foreground text-xs">Grade</p>
                      <p className="font-medium">{order.listing.grading_company} {order.listing.grade}</p>
                    </div>
                  )}
                </div>

                {/* Description */}
                {order.listing?.description && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Description</p>
                      <p className="text-sm">{order.listing.description}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Escrow Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Escrow Protection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${escrowConfig.color}`}>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  {escrowConfig.label}
                </div>

                {order.escrow_held_amount && order.escrow_held_amount > 0 && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Amount in Escrow</p>
                    <p className="text-2xl font-bold">{formatPrice(order.escrow_held_amount)}</p>
                  </div>
                )}

                {/* Confirmation Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-lg border ${order.buyer_confirmed_at ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-muted'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {order.buyer_confirmed_at ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-muted-foreground" />
                      )}
                      <span className="font-medium">Buyer</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.buyer_confirmed_at 
                        ? `Confirmed ${formatDistanceToNow(new Date(order.buyer_confirmed_at), { addSuffix: true })}`
                        : 'Awaiting confirmation'}
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg border ${order.seller_confirmed_at ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-muted'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {order.seller_confirmed_at ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-muted-foreground" />
                      )}
                      <span className="font-medium">Seller</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.seller_confirmed_at 
                        ? `Confirmed ${formatDistanceToNow(new Date(order.seller_confirmed_at), { addSuffix: true })}`
                        : 'Awaiting confirmation'}
                    </p>
                  </div>
                </div>

                {/* Verified Seller Badge */}
                {order.seller_is_verified && (
                  <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">Verified Seller - Instant Payout Eligible</span>
                  </div>
                )}

                {/* Action Buttons */}
                {!isCompleted && !isDisputed && (
                  <div className="flex gap-3 pt-2">
                    {canConfirm && (
                      <Button 
                        onClick={() => confirmMutation.mutate()}
                        disabled={confirmMutation.isPending}
                        className="flex-1"
                      >
                        {confirmMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {isBuyer ? 'Confirm Receipt' : 'Confirm Payment'}
                      </Button>
                    )}
                    {!showDisputeForm && (
                      <Button 
                        variant="outline" 
                        onClick={() => setShowDisputeForm(true)}
                        className="flex-1"
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Report Issue
                      </Button>
                    )}
                  </div>
                )}

                {/* Dispute Form */}
                {showDisputeForm && (
                  <div className="p-4 border border-destructive/30 rounded-lg space-y-3">
                    <h4 className="font-medium text-destructive">Report an Issue</h4>
                    <Textarea
                      placeholder="Describe the issue in detail..."
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button 
                        variant="destructive"
                        onClick={() => disputeMutation.mutate(disputeReason)}
                        disabled={!disputeReason.trim() || disputeMutation.isPending}
                      >
                        {disputeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Submit Dispute
                      </Button>
                      <Button variant="outline" onClick={() => setShowDisputeForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Dispute Info */}
                {isDisputed && (
                  <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <h4 className="font-medium text-destructive mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Dispute Active
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {order.escalation_reason || 'This order is under review by our support team.'}
                    </p>
                  </div>
                )}

                {/* Review Section - Show after completion */}
                {isCompleted && currentUserId && (
                  <OrderReviewSection
                    orderId={order.id}
                    currentUserId={currentUserId}
                    isBuyer={isBuyer}
                    counterpartyId={isBuyer ? order.seller_id : order.buyer_id}
                    counterpartyName={isBuyer 
                      ? (order.seller_profile?.username || 'the seller')
                      : (order.buyer_profile?.username || 'the buyer')
                    }
                  />
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Default created action if no actions yet */}
                  {(!actions || actions.length === 0) && (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-primary"></div>
                        <div className="w-0.5 flex-1 bg-border"></div>
                      </div>
                      <div className="pb-4">
                        <p className="font-medium">Order Created</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(order.created_at), 'PPpp')}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {actions?.map((action, index) => (
                    <div key={action.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${
                          action.action_type === 'disputed' ? 'bg-destructive' :
                          action.action_type === 'funds_released' ? 'bg-green-500' :
                          'bg-primary'
                        }`}></div>
                        {index < actions.length - 1 && (
                          <div className="w-0.5 flex-1 bg-border"></div>
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="font-medium">{ACTION_LABELS[action.action_type] || action.action_type}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(action.created_at), 'PPpp')}
                        </p>
                        {action.details && Object.keys(action.details).length > 0 && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {action.details.reason || action.details.amount ? formatPrice(action.details.amount) : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Parties */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Parties</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Buyer</p>
                  <div className="flex items-center gap-3">
                    {order.buyer_profile?.avatar_url ? (
                      <img src={order.buyer_profile.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{order.buyer_profile?.username || 'Unknown'}</p>
                      {isBuyer && <Badge variant="secondary" className="text-xs">You</Badge>}
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Seller</p>
                  <div className="flex items-center gap-3">
                    {order.seller_profile?.avatar_url ? (
                      <img src={order.seller_profile.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium flex items-center gap-1">
                        {order.seller_profile?.username || 'Unknown'}
                        {order.seller_profile?.is_verified_seller && (
                          <ShieldCheck className="w-4 h-4 text-primary" />
                        )}
                      </p>
                      {isSeller && <Badge variant="secondary" className="text-xs">You</Badge>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Item Price</span>
                  <span>{formatPrice(order.price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Buyer Fee</span>
                  <span>{formatPrice(order.buyer_fee)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total Paid</span>
                  <span>{formatPrice(order.price + order.buyer_fee)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Seller Fee</span>
                  <span className="text-muted-foreground">-{formatPrice(order.seller_fee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Seller Receives</span>
                  <span className="text-green-600">{formatPrice(order.price - order.seller_fee)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Shipping & Delivery */}
            {order.delivery_option === 'ship' && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Truck className="w-5 h-5 text-primary" />
                      Shipping Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Tracking Number */}
                    {order.tracking_number ? (
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Tracking Number</p>
                        <p className="font-mono text-sm font-medium break-all">{order.tracking_number}</p>
                        <Badge variant="secondary" className="mt-2 text-xs">
                          <Truck className="w-3 h-3 mr-1" />
                          In Transit
                        </Badge>
                      </div>
                    ) : (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Awaiting shipping from seller
                        </p>
                      </div>
                    )}

                    {/* Shipping Address */}
                    {order.shipping_address && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Delivery Address</p>
                        <div className="text-sm space-y-0.5">
                          <p className="font-medium">{order.shipping_address.name}</p>
                          <p>{order.shipping_address.address}</p>
                          <p>{order.shipping_address.district}, {order.shipping_address.city}</p>
                          <p>{order.shipping_address.postalCode}</p>
                          {order.shipping_address.phone && (
                            <p className="text-muted-foreground">{order.shipping_address.phone}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Shipping Selector - Show for seller if no tracking yet */}
                {!order.tracking_number && currentUserId && (
                  <ShippingSelector
                    orderId={order.id}
                    shippingAddress={order.shipping_address}
                    isSeller={isSeller}
                    onShipmentCreated={() => {
                      queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
                      queryClient.invalidateQueries({ queryKey: ['order-actions', orderId] });
                    }}
                  />
                )}
              </>
            )}

            {/* Vault Delivery */}
            {order.delivery_option === 'vault' && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="w-5 h-5 text-primary" />
                      Vault Storage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <p className="text-sm">
                        This item will be stored securely in the CardBoom Vault.
                      </p>
                      <Badge variant="secondary" className="mt-2 text-xs">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        Secure Storage
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Shipping Request Card - only for vault orders */}
                {currentUserId && (isBuyer || isSeller) && (
                  <ShippingRequestCard
                    orderId={order.id}
                    currentUserId={currentUserId}
                    isBuyer={isBuyer}
                    isSeller={isSeller}
                    deliveryOption={order.delivery_option}
                    shippingRequestedAt={order.shipping_requested_at}
                    shippingRequestedBy={order.shipping_requested_by}
                    buyerApprovedShipping={order.buyer_approved_shipping}
                    sellerApprovedShipping={order.seller_approved_shipping}
                    buyerShippingApprovedAt={order.buyer_shipping_approved_at}
                    sellerShippingApprovedAt={order.seller_shipping_approved_at}
                    buyerUsername={order.buyer_profile?.username || null}
                    sellerUsername={order.seller_profile?.username || null}
                    buyerId={order.buyer_id}
                    sellerId={order.seller_id}
                  />
                )}
              </>
            )}

            {/* Contact Support */}
            <Card>
              <CardContent className="pt-6">
                <Link to="/help">
                  <Button variant="outline" className="w-full">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}