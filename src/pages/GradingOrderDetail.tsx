import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useGrading, GradingOrder, GRADING_CATEGORIES } from '@/hooks/useGrading';
import { CBGIResultCard } from '@/components/grading/CBGIResultCard';
import { OrderStatusTimeline } from '@/components/grading/OrderStatusTimeline';
import { CardOverlayPreview } from '@/components/grading/CardOverlayPreview';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { Collectible } from '@/types/collectible';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Mail, RefreshCw, Calendar, DollarSign, Award, Timer, Loader2 } from 'lucide-react';
import { format, addHours } from 'date-fns';

export default function GradingOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getOrder } = useGrading();
  const [order, setOrder] = useState<GradingOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cartItems, setCartItems] = useState<Collectible[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      setIsLoading(true);
      const data = await getOrder(id);
      setOrder(data);
      setIsLoading(false);
    };
    fetchOrder();
  }, [id, getOrder]);

  const category = order ? GRADING_CATEGORIES.find(c => c.id === order.category) : null;
  const isCompleted = order?.status === 'completed';
  const isPending = order ? ['queued', 'in_review', 'pending_payment'].includes(order.status) : false;

  // Calculate countdown for pending orders (1 hour from submission) - with live updates
  const [countdown, setCountdown] = useState({ minutes: 60, seconds: 0 });
  
  useEffect(() => {
    if (!isPending || !order?.paid_at) return;
    
    const updateCountdown = () => {
      const paidAt = new Date(order.paid_at!);
      const expectedCompletion = addHours(paidAt, 1);
      const now = new Date();
      const totalSecondsRemaining = Math.max(0, Math.floor((expectedCompletion.getTime() - now.getTime()) / 1000));
      
      setCountdown({
        minutes: Math.floor(totalSecondsRemaining / 60),
        seconds: totalSecondsRemaining % 60
      });
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [isPending, order?.paid_at]);

  const countdownExpired = countdown.minutes === 0 && countdown.seconds === 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={cartItems.length} onCartClick={() => setIsCartOpen(true)} />
        <main className="container mx-auto px-4 pt-24 pb-16 max-w-4xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid lg:grid-cols-2 gap-6"><Skeleton className="h-80" /><Skeleton className="h-80" /></div>
        </main>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={cartItems.length} onCartClick={() => setIsCartOpen(true)} />
        <main className="container mx-auto px-4 pt-24 pb-16 text-center">
          <Award className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
          <Button onClick={() => navigate('/grading/orders')} className="rounded-full">Back to Orders</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Grading Order #{order.id.slice(0, 8)} | Card Grading Result | CardBoom</title>
        <meta name="description" content={`View grading result for your ${category?.name || 'TCG'} card. See detailed subgrades for corners, edges, surface, and centering.`} />
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      <Header cartCount={cartItems.length} onCartClick={() => setIsCartOpen(true)} />
      <CartDrawer items={cartItems} isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} onRemoveItem={(id) => setCartItems(items => items.filter(item => item.id !== id))} />
      
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/grading/orders')}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-xl font-bold">Order Details</h1>
            <p className="text-sm text-muted-foreground">{category?.icon} {category?.name} • #{order.id.slice(0, 8)}</p>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
            {isCompleted ? <CBGIResultCard order={order} /> : (
              <>
                {/* Countdown Timer for Pending Orders */}
                {isPending && order.paid_at && (
                  <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 overflow-hidden">
                    <CardContent className="p-6 text-center relative">
                      {/* Animated background pulse */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-pulse" />
                      
                      <div className="relative z-10">
                        <div className="flex items-center justify-center gap-2 mb-4">
                          {countdownExpired ? (
                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                          ) : (
                            <Timer className="w-6 h-6 text-primary animate-pulse" />
                          )}
                          <span className="text-sm font-semibold text-primary uppercase tracking-widest">
                            {countdownExpired ? 'Finalizing Results' : 'CardBoom Index Processing'}
                          </span>
                        </div>
                        
                        {/* Big countdown display */}
                        <div className="flex items-center justify-center gap-3 mb-3">
                          <div className="bg-background/80 backdrop-blur-sm rounded-xl px-4 py-3 min-w-[80px] shadow-lg border border-primary/20">
                            <p className="text-4xl font-bold text-foreground tabular-nums">
                              {String(countdown.minutes).padStart(2, '0')}
                            </p>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Minutes</p>
                          </div>
                          <span className="text-3xl font-bold text-primary animate-pulse">:</span>
                          <div className="bg-background/80 backdrop-blur-sm rounded-xl px-4 py-3 min-w-[80px] shadow-lg border border-primary/20">
                            <p className="text-4xl font-bold text-foreground tabular-nums">
                              {String(countdown.seconds).padStart(2, '0')}
                            </p>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Seconds</p>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          {countdownExpired ? 'Your result should be ready any moment now' : 'Estimated time remaining'}
                        </p>
                        
                        {!countdownExpired && (
                          <Badge variant="secondary" className="mt-4">
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Auto-refreshes when ready
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
                <Card className="border-border/50">
                  <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><RefreshCw className="w-5 h-5" />Order Status</CardTitle></CardHeader>
                  <CardContent><OrderStatusTimeline status={order.status} paidAt={order.paid_at} submittedAt={order.submitted_at} completedAt={order.completed_at} /></CardContent>
                </Card>
              </>
            )}
            <Card className="border-border/50">
              <CardHeader className="pb-3"><CardTitle className="text-lg">Order Info</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm"><div className="flex items-center gap-2 text-muted-foreground"><Calendar className="w-4 h-4" /><span>Submitted</span></div><span className="font-medium">{format(new Date(order.created_at), 'MMM d, yyyy')}</span></div>
                <div className="flex items-center justify-between text-sm"><div className="flex items-center gap-2 text-muted-foreground"><DollarSign className="w-4 h-4" /><span>Price</span></div><span className="font-medium">${order.price_usd}</span></div>
                {order.paid_at && <div className="flex items-center justify-between text-sm"><div className="flex items-center gap-2 text-muted-foreground"><Clock className="w-4 h-4" /><span>Paid</span></div><span className="font-medium">{format(new Date(order.paid_at), 'MMM d, yyyy')}</span></div>}
                {order.completed_at && <div className="flex items-center justify-between text-sm"><div className="flex items-center gap-2 text-muted-foreground"><Clock className="w-4 h-4" /><span>Completed</span></div><span className="font-medium">{format(new Date(order.completed_at), 'MMM d, yyyy')}</span></div>}
              </CardContent>
            </Card>
            {!isCompleted && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="border-primary/20 bg-primary/5"><CardContent className="p-4 flex items-center justify-between"><div className="flex items-center gap-3"><Mail className="w-5 h-5 text-primary" /><span className="text-sm">Need help?</span></div><Button variant="outline" size="sm" className="rounded-full h-8" onClick={() => navigate('/help')}>Contact Support</Button></CardContent></Card>
              </motion.div>
            )}
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-border/50"><CardHeader className="pb-3"><CardTitle className="text-lg">Card Preview</CardTitle></CardHeader><CardContent className="flex justify-center py-6"><CardOverlayPreview order={order} /></CardContent></Card>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
