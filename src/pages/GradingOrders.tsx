import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useGrading, GradingOrder, GradingOrderStatus, GRADING_CATEGORIES } from '@/hooks/useGrading';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { Collectible } from '@/types/collectible';
import { Helmet } from 'react-helmet-async';
import { 
  ArrowLeft, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  ChevronRight,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<GradingOrderStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending_payment: { label: 'Pending Payment', color: 'bg-amber-500', icon: Clock },
  queued: { label: 'Queued', color: 'bg-blue-500', icon: Clock },
  in_review: { label: 'In Review', color: 'bg-purple-500', icon: RefreshCw },
  completed: { label: 'Completed', color: 'bg-emerald-500', icon: CheckCircle },
  failed: { label: 'Failed', color: 'bg-destructive', icon: AlertCircle },
  refunded: { label: 'Refunded', color: 'bg-amber-500', icon: RefreshCw },
};

export default function GradingOrders() {
  const navigate = useNavigate();
  const { orders, isLoading } = useGrading();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [cartItems, setCartItems] = useState<Collectible[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['pending_payment', 'queued', 'in_review'].includes(order.status);
    if (filter === 'completed') return ['completed', 'failed', 'refunded'].includes(order.status);
    return true;
  });

  const OrderCard = ({ order }: { order: GradingOrder }) => {
    const statusConfig = STATUS_CONFIG[order.status];
    const category = GRADING_CATEGORIES.find(c => c.id === order.category);
    const StatusIcon = statusConfig.icon;

    return (
      <Card 
        className="cursor-pointer hover:border-primary/50 transition-all"
        onClick={() => navigate(`/grading/orders/${order.id}`)}
      >
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="w-20 h-28 rounded-lg bg-muted overflow-hidden shrink-0">
              {order.front_image_url ? (
                <img 
                  src={order.front_image_url} 
                  alt="Card" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-medium truncate">
                    {category?.icon} {category?.name || order.category}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(order.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <Badge 
                  variant="secondary" 
                  className={cn('shrink-0 text-white', statusConfig.color)}
                >
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusConfig.label}
                </Badge>
              </div>

              {order.final_grade && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-2xl font-bold text-primary">
                    {order.final_grade.toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {order.grade_label}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  Order #{order.id.slice(0, 8)}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>My Grading Orders - CardBoom</title>
        <meta name="description" content="View and manage your CardBoom grading orders. Track status, view results, and submit new cards for grading." />
      </Helmet>
      
      <Header cartCount={cartItems.length} onCartClick={() => setIsCartOpen(true)} />
      <CartDrawer 
        items={cartItems} 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        onRemoveItem={(id) => setCartItems(items => items.filter(item => item.id !== id))}
      />
      
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/grading')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">My Grading Orders</h1>
          </div>
          
          <Button onClick={() => navigate('/grading/new')} className="gap-2">
            <Plus className="w-4 h-4" />
            New Order
          </Button>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All ({orders.length})</TabsTrigger>
            <TabsTrigger value="active">
              Active ({orders.filter(o => ['pending_payment', 'queued', 'in_review'].includes(o.status)).length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({orders.filter(o => ['completed', 'failed', 'refunded'].includes(o.status)).length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Skeleton className="w-20 h-28 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No orders yet</h3>
              <p className="text-muted-foreground mb-4">
                Submit your first card for AI grading
              </p>
              <Button onClick={() => navigate('/grading/new')}>
                Start Grading
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
