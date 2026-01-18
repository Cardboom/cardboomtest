import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldCheck,
  Loader2,
  ExternalLink,
  ArrowDownLeft,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useLanguage } from '@/contexts/LanguageContext';

interface Order {
  id: string;
  price: number;
  status: string;
  escrow_status: string | null;
  created_at: string;
  role: 'buyer' | 'seller';
  listing: {
    title: string;
    image_url: string | null;
  } | null;
  counterparty: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-yellow-500', icon: <Clock className="w-3 h-3" /> },
  paid: { label: 'Paid', color: 'bg-blue-500', icon: <Package className="w-3 h-3" /> },
  processing: { label: 'Processing', color: 'bg-blue-500', icon: <Package className="w-3 h-3" /> },
  shipped: { label: 'Shipped', color: 'bg-purple-500', icon: <Truck className="w-3 h-3" /> },
  delivered: { label: 'Delivered', color: 'bg-green-500', icon: <Package className="w-3 h-3" /> },
  completed: { label: 'Completed', color: 'bg-green-600', icon: <CheckCircle2 className="w-3 h-3" /> },
  disputed: { label: 'Disputed', color: 'bg-red-500', icon: <AlertTriangle className="w-3 h-3" /> },
  refunded: { label: 'Refunded', color: 'bg-gray-500', icon: <Package className="w-3 h-3" /> },
  cancelled: { label: 'Cancelled', color: 'bg-gray-500', icon: <AlertTriangle className="w-3 h-3" /> },
};

export default function Orders() {
  const { formatPrice } = useCurrency();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('active');
  const [roleFilter, setRoleFilter] = useState<'all' | 'buyer' | 'seller'>('all');

  const { data: orders, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Fetch orders where user is buyer - include snapshot columns
      const { data: buyerOrders, error: buyerError } = await supabase
        .from('orders')
        .select(`
          id,
          price,
          status,
          escrow_status,
          created_at,
          seller_id,
          listing_id,
          item_title,
          item_image_url
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (buyerError) throw buyerError;

      // Fetch orders where user is seller - include snapshot columns
      const { data: sellerOrders, error: sellerError } = await supabase
        .from('orders')
        .select(`
          id,
          price,
          status,
          escrow_status,
          created_at,
          buyer_id,
          listing_id,
          item_title,
          item_image_url
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (sellerError) throw sellerError;

      // Collect all listing IDs
      const allListingIds = [
        ...buyerOrders.filter(o => o.listing_id).map(o => o.listing_id),
        ...sellerOrders.filter(o => o.listing_id).map(o => o.listing_id),
      ];

      const { data: listingsData } = await supabase
        .from('listings')
        .select('id, title, image_url')
        .in('id', allListingIds);
      
      const listingMap = new Map(listingsData?.map(l => [l.id, l]) || []);

      // Collect all counterparty IDs
      const counterpartyIds = [
        ...buyerOrders.map(o => o.seller_id),
        ...sellerOrders.map(o => o.buyer_id),
      ];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', counterpartyIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Transform buyer orders - use snapshot columns as fallback
      const buyerOrdersMapped: Order[] = buyerOrders.map(order => {
        const listingFromDb = listingMap.get(order.listing_id);
        return {
          id: order.id,
          price: order.price,
          status: order.status,
          escrow_status: order.escrow_status,
          created_at: order.created_at,
          role: 'buyer' as const,
          listing: {
            title: listingFromDb?.title || order.item_title || 'Order Item',
            image_url: listingFromDb?.image_url || order.item_image_url || null
          },
          counterparty: profileMap.get(order.seller_id) || null,
        };
      });

      // Transform seller orders - use snapshot columns as fallback
      const sellerOrdersMapped: Order[] = sellerOrders.map(order => {
        const listingFromDb = listingMap.get(order.listing_id);
        return {
          id: order.id,
          price: order.price,
          status: order.status,
          escrow_status: order.escrow_status,
          created_at: order.created_at,
          role: 'seller' as const,
          listing: {
            title: listingFromDb?.title || order.item_title || 'Order Item',
            image_url: listingFromDb?.image_url || order.item_image_url || null
          },
          counterparty: profileMap.get(order.buyer_id) || null,
        };
      });

      // Combine and sort by date
      return [...buyerOrdersMapped, ...sellerOrdersMapped].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
  });

  const filteredOrders = orders?.filter(o => 
    roleFilter === 'all' || o.role === roleFilter
  ) || [];

  const activeOrders = filteredOrders.filter(o => 
    !['completed', 'refunded', 'cancelled'].includes(o.status)
  );
  
  const completedOrders = filteredOrders.filter(o => 
    ['completed', 'refunded', 'cancelled'].includes(o.status)
  );

  const OrderCard = ({ order }: { order: Order }) => {
    const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
    const isBuyer = order.role === 'buyer';
    
    return (
      <Link to={`/order/${order.id}`}>
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardContent className="p-4">
            <div className="flex gap-4">
              {order.listing?.image_url ? (
                <img 
                  src={order.listing.image_url} 
                  alt={order.listing.title || 'Item'}
                  className="w-20 h-20 object-cover rounded-lg"
                />
              ) : (
                <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                  <Package className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate">{order.listing?.title || 'Order Item'}</h3>
                  <Badge 
                    variant="outline" 
                    className={`shrink-0 text-xs ${isBuyer ? 'border-blue-500/50 text-blue-500' : 'border-green-500/50 text-green-500'}`}
                  >
                    {isBuyer ? (
                      <><ArrowUpRight className="w-3 h-3 mr-1" />Buying</>
                    ) : (
                      <><ArrowDownLeft className="w-3 h-3 mr-1" />Selling</>
                    )}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  {order.counterparty?.avatar_url ? (
                    <img 
                      src={order.counterparty.avatar_url} 
                      alt={order.counterparty.display_name || 'User'}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px]">
                      {(order.counterparty?.display_name?.[0] || 'U').toUpperCase()}
                    </div>
                  )}
                  <span className="truncate">
                    {isBuyer ? 'From' : 'To'}: {order.counterparty?.display_name || 'User'}
                  </span>
                </div>
                <p className="text-lg font-bold mt-1">{formatPrice(order.price)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className={`${statusConfig.color} text-white`}>
                  {statusConfig.icon}
                  <span className="ml-1">{statusConfig.label}</span>
                </Badge>
                {order.escrow_status === 'pending' && (
                  <Badge variant="outline" className="text-xs">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    Secured
                  </Badge>
                )}
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header cartCount={0} onCartClick={() => {}} />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">My Orders</h1>
          
          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div className="flex bg-secondary rounded-lg p-1">
              <button
                onClick={() => setRoleFilter('all')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  roleFilter === 'all' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setRoleFilter('buyer')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  roleFilter === 'buyer' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Purchases
              </button>
              <button
                onClick={() => setRoleFilter('seller')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  roleFilter === 'seller' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sales
              </button>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="active">
              Active ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeOrders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No active orders</h3>
                  <p className="text-muted-foreground mb-4">
                    {roleFilter === 'buyer' 
                      ? 'Your active purchases will appear here'
                      : roleFilter === 'seller'
                      ? 'Your active sales will appear here'
                      : 'Your active orders will appear here'
                    }
                  </p>
                  <Link to="/markets">
                    <Button>Browse Marketplace</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              activeOrders.map(order => (
                <OrderCard key={order.id} order={order} />
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedOrders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No completed orders</h3>
                  <p className="text-muted-foreground">Your completed orders will appear here</p>
                </CardContent>
              </Card>
            ) : (
              completedOrders.map(order => (
                <OrderCard key={order.id} order={order} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}
