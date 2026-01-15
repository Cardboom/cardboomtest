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
  ExternalLink
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
  listing: {
    title: string;
    image_url: string | null;
  } | null;
  seller_profile: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-yellow-500', icon: <Clock className="w-3 h-3" /> },
  paid: { label: 'Paid', color: 'bg-blue-500', icon: <Package className="w-3 h-3" /> },
  shipped: { label: 'Shipped', color: 'bg-purple-500', icon: <Truck className="w-3 h-3" /> },
  delivered: { label: 'Delivered', color: 'bg-green-500', icon: <Package className="w-3 h-3" /> },
  completed: { label: 'Completed', color: 'bg-green-600', icon: <CheckCircle2 className="w-3 h-3" /> },
  disputed: { label: 'Disputed', color: 'bg-red-500', icon: <AlertTriangle className="w-3 h-3" /> },
  refunded: { label: 'Refunded', color: 'bg-gray-500', icon: <Package className="w-3 h-3" /> },
};

export default function Purchases() {
  const { formatPrice } = useCurrency();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('active');

  const { data: orders, isLoading } = useQuery({
    queryKey: ['my-purchases'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          price,
          status,
          escrow_status,
          created_at,
          seller_id,
          listing_id
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch listing data separately for reliability
      const listingIds = data.filter(o => o.listing_id).map(o => o.listing_id);
      const { data: listingsData } = await supabase
        .from('listings')
        .select('id, title, image_url')
        .in('id', listingIds);
      
      const listingMap = new Map(listingsData?.map(l => [l.id, l]) || []);

      // Fetch seller profiles
      const sellerIds = [...new Set(data.map(o => o.seller_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', sellerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(order => {
        const listingData = listingMap.get(order.listing_id);
        
        return {
          id: order.id,
          price: order.price,
          status: order.status,
          escrow_status: order.escrow_status,
          created_at: order.created_at,
          listing: listingData ? {
            title: listingData.title,
            image_url: listingData.image_url
          } : null,
          seller_profile: profileMap.get(order.seller_id) || null,
        };
      }) as Order[];
    },
  });

  const activeOrders = orders?.filter(o => 
    !['completed', 'refunded'].includes(o.status)
  ) || [];
  
  const completedOrders = orders?.filter(o => 
    ['completed', 'refunded'].includes(o.status)
  ) || [];

  const OrderCard = ({ order }: { order: Order }) => {
    const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
    
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
                <h3 className="font-semibold truncate">{order.listing?.title || 'Purchased Item'}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  {order.seller_profile?.avatar_url ? (
                    <img 
                      src={order.seller_profile.avatar_url} 
                      alt={order.seller_profile.display_name || 'Seller'}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px]">
                      {(order.seller_profile?.display_name?.[0] || 'S').toUpperCase()}
                    </div>
                  )}
                  <span className="truncate">From: {order.seller_profile?.display_name || 'Seller'}</span>
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
                    Escrow
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
        <h1 className="text-2xl font-bold mb-6">{t.nav.myPurchases || 'My Purchases'}</h1>

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
                  <p className="text-muted-foreground mb-4">Your active purchases will appear here</p>
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
                  <p className="text-muted-foreground">Your completed purchases will appear here</p>
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