import { useState, useCallback, useEffect } from 'react';
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
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Clock, CheckCircle, AlertCircle, RefreshCw, ChevronRight, Image as ImageIcon, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<GradingOrderStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending_payment: { label: 'Pending', color: 'bg-amber-500', icon: Clock },
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

  // Auth-aware navigation to grading flow
  const handleStartGrading = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.info("Please sign in to grade your cards");
      navigate('/auth?returnTo=/grading/new');
      return;
    }
    navigate('/grading/new');
  }, [navigate]);

  // Redirect to auth if not logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.info("Please sign in to view your grading orders");
        navigate('/auth?returnTo=/grading/orders');
      }
    };
    checkAuth();
  }, [navigate]);

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['pending_payment', 'queued', 'in_review'].includes(order.status);
    if (filter === 'completed') return ['completed', 'failed', 'refunded'].includes(order.status);
    return true;
  });

  const OrderCard = ({ order, index }: { order: GradingOrder; index: number }) => {
    const statusConfig = STATUS_CONFIG[order.status];
    const category = GRADING_CATEGORIES.find(c => c.id === order.category);
    const StatusIcon = statusConfig.icon;

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }}>
        <Card className="cursor-pointer hover:border-primary/30 hover:shadow-md transition-all group" onClick={() => navigate(`/grading/orders/${order.id}`)}>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="w-16 h-20 rounded-lg bg-muted overflow-hidden shrink-0">
                {order.front_image_url ? <img src={order.front_image_url} alt="Card" className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-6 h-6 text-muted-foreground" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <p className="font-medium text-sm truncate">{category?.icon} {category?.name || order.category}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(order.created_at), 'MMM d, yyyy')}</p>
                  </div>
                  <Badge variant="secondary" className={cn('shrink-0 text-white text-xs px-2 py-0.5', statusConfig.color)}><StatusIcon className="w-3 h-3 mr-1" />{statusConfig.label}</Badge>
                </div>
                {order.final_grade && <div className="flex items-center gap-2 mt-2"><span className="text-xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">{order.final_grade.toFixed(1)}</span><span className="text-xs text-muted-foreground">{order.grade_label}</span></div>}
                <div className="flex items-center justify-between mt-2"><span className="text-xs text-muted-foreground">#{order.id.slice(0, 8)}</span><ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" /></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>My Card Grading Orders | Track AI Grading Status | CardBoom</title>
        <meta name="description" content="Track and manage your AI card grading orders. View grading results, subgrades, and order status for your Pokémon, MTG, Yu-Gi-Oh!, and sports cards." />
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      <Header cartCount={cartItems.length} onCartClick={() => setIsCartOpen(true)} />
      <CartDrawer items={cartItems} isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} onRemoveItem={(id) => setCartItems(items => items.filter(item => item.id !== id))} />
      
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/grading')}><ArrowLeft className="w-5 h-5" /></Button>
            <h1 className="text-xl font-bold">My Grading Orders</h1>
          </div>
          <Button onClick={() => navigate('/grading/new')} className="gap-2 rounded-full h-9 px-4"><Plus className="w-4 h-4" />New</Button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-6">
            <TabsList className="w-full grid grid-cols-3 h-10">
              <TabsTrigger value="all" className="text-xs">All ({orders.length})</TabsTrigger>
              <TabsTrigger value="active" className="text-xs">Active ({orders.filter(o => ['pending_payment', 'queued', 'in_review'].includes(o.status)).length})</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs">Done ({orders.filter(o => ['completed', 'failed', 'refunded'].includes(o.status)).length})</TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {[1, 2, 3].map((i) => <Card key={i}><CardContent className="p-4"><div className="flex gap-4"><Skeleton className="w-16 h-20 rounded-lg" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-20" /></div></div></CardContent></Card>)}
            </motion.div>
          ) : filteredOrders.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border-dashed"><CardContent className="py-12 text-center"><Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><h3 className="text-lg font-medium mb-2">No orders yet</h3><p className="text-muted-foreground text-sm mb-6">Submit your first card for AI grading</p><Button onClick={handleStartGrading} className="rounded-full">Start Grading</Button></CardContent></Card>
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">{filteredOrders.map((order, index) => <OrderCard key={order.id} order={order} index={index} />)}</motion.div>
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
