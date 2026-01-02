import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Zap, Plus, Search, TrendingUp, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BuyOrderCard } from './BuyOrderCard';
import { CreateBuyOrderDialog } from './CreateBuyOrderDialog';
import { AcceptBuyOrderDialog } from './AcceptBuyOrderDialog';

interface BuyOrder {
  id: string;
  buyer_id: string;
  market_item_id: string | null;
  category: string;
  item_name: string;
  condition: string | null;
  grade: string | null;
  max_price: number;
  quantity: number;
  filled_quantity: number;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
  status: string;
  buyer?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export const BuyOrdersSection = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<BuyOrder | null>(null);
  const queryClient = useQueryClient();

  const { data: buyOrders, isLoading } = useQuery({
    queryKey: ['buy-orders', selectedCategory, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('buy_orders')
        .select(`
          *,
          buyer:profiles!buy_orders_buyer_id_fkey(display_name, avatar_url)
        `)
        .eq('status', 'active')
        .order('max_price', { ascending: false });

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      if (searchQuery) {
        query = query.ilike('item_name', `%${searchQuery}%`);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as BuyOrder[];
    },
  });

  const { data: myOrders } = useQuery({
    queryKey: ['my-buy-orders'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];

      const { data, error } = await supabase
        .from('buy_orders')
        .select('*')
        .eq('buyer_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BuyOrder[];
    },
  });

  const handleAcceptOrder = (orderId: string) => {
    const order = buyOrders?.find((o) => o.id === orderId);
    if (order) {
      setSelectedOrder(order);
      setAcceptDialogOpen(true);
    }
  };

  const totalVolume = buyOrders?.reduce((sum, order) => 
    sum + (order.max_price * (order.quantity - order.filled_quantity)), 0
  ) || 0;

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'pokemon', label: 'Pokémon' },
    { value: 'yugioh', label: 'Yu-Gi-Oh!' },
    { value: 'mtg', label: 'MTG' },
    { value: 'sports', label: 'Sports' },
    { value: 'onepiece', label: 'One Piece' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Zap className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{buyOrders?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Active Buy Orders</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                ${totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}K` : totalVolume.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Total Buy Volume</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Button className="w-full gap-2" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              Create Buy Order
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search buy orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <Button
              key={cat.value}
              variant={selectedCategory === cat.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.value)}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="marketplace">
        <TabsList>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="my-orders">
            My Orders
            {myOrders && myOrders.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {myOrders.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace" className="mt-4">
          {isLoading ? (
            <div className="grid gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="h-32" />
                </Card>
              ))}
            </div>
          ) : buyOrders && buyOrders.length > 0 ? (
            <div className="grid gap-4">
              {buyOrders.map((order) => (
                <BuyOrderCard
                  key={order.id}
                  order={order}
                  onAccept={handleAcceptOrder}
                  showAcceptButton={true}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No Buy Orders Found</h3>
                <p className="text-muted-foreground mb-4">
                  Be the first to post a buy order and get instant offers from sellers.
                </p>
                <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Buy Order
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="my-orders" className="mt-4">
          {myOrders && myOrders.length > 0 ? (
            <div className="grid gap-4">
              {myOrders.map((order) => (
                <BuyOrderCard
                  key={order.id}
                  order={order}
                  showAcceptButton={false}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  You haven't created any buy orders yet.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <CreateBuyOrderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['buy-orders'] })}
      />

      {selectedOrder && (
        <AcceptBuyOrderDialog
          open={acceptDialogOpen}
          onOpenChange={setAcceptDialogOpen}
          order={selectedOrder}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['buy-orders'] });
            setSelectedOrder(null);
          }}
        />
      )}
    </div>
  );
};
