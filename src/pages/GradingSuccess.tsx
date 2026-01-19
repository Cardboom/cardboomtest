import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { useGrading, GradingOrder } from '@/hooks/useGrading';
import { useGradingPricing } from '@/hooks/useGradingPricing';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Package, Clock, FileText, ArrowRight, Sparkles } from 'lucide-react';
import { trackGradingPurchase } from '@/lib/tracking';
import { format, addDays } from 'date-fns';

const CONVERSION_FIRED_KEY = 'grading_conversion_fired';

export default function GradingSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  
  const [order, setOrder] = useState<GradingOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const conversionFiredRef = useRef(false);
  const { getOrder } = useGrading();
  const gradingPricing = useGradingPricing();

  useEffect(() => {
    const verifyAndLoad = async () => {
      if (!orderId) {
        navigate('/grading', { replace: true });
        return;
      }

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth?redirect=/grading/success?order_id=' + orderId, { replace: true });
        return;
      }

      // Fetch the order
      const fetchedOrder = await getOrder(orderId);
      
      if (!fetchedOrder) {
        navigate('/grading', { replace: true });
        return;
      }

      // Verify the order belongs to the current user and is paid
      if (fetchedOrder.user_id !== user.id) {
        navigate('/grading', { replace: true });
        return;
      }

      // Check if order is in a valid paid state
      const validStatuses = ['queued', 'in_review', 'completed'];
      if (!validStatuses.includes(fetchedOrder.status)) {
        // If still pending payment, redirect to grading
        if (fetchedOrder.status === 'pending_payment') {
          navigate('/grading', { replace: true });
          return;
        }
        // If failed, redirect to failed page
        if (fetchedOrder.status === 'failed') {
          navigate('/grading/failed?order_id=' + orderId, { replace: true });
          return;
        }
      }

      setOrder(fetchedOrder);

      // Calculate queue position (orders ahead in queue)
      const { count } = await supabase
        .from('grading_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'queued')
        .lt('paid_at', fetchedOrder.paid_at || fetchedOrder.created_at);
      
      setQueuePosition((count || 0) + 1);
      setLoading(false);

      // Fire conversion tracking ONCE per order
      const firedOrders = JSON.parse(sessionStorage.getItem(CONVERSION_FIRED_KEY) || '[]');
      if (!firedOrders.includes(orderId) && !conversionFiredRef.current) {
        conversionFiredRef.current = true;
        
        // Fire all conversion events
        trackGradingPurchase({
          orderId: fetchedOrder.id,
          value: fetchedOrder.price_usd,
          currency: 'USD',
          cardCount: 1, // Single card per order
          speedTier: fetchedOrder.speed_tier || 'standard',
        });

        // Mark as fired to prevent duplicates
        sessionStorage.setItem(
          CONVERSION_FIRED_KEY, 
          JSON.stringify([...firedOrders, orderId])
        );
      }
    };

    verifyAndLoad();
  }, [orderId, navigate, getOrder]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />
        <div className="container max-w-2xl py-16 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-16 w-16 mx-auto bg-muted rounded-full" />
            <div className="h-8 bg-muted rounded w-1/2 mx-auto" />
            <div className="h-4 bg-muted rounded w-3/4 mx-auto" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const speedTier = order.speed_tier || 'standard';
  const tierConfig = gradingPricing[speedTier];
  const estimatedDate = order.estimated_completion_at 
    ? new Date(order.estimated_completion_at)
    : addDays(new Date(), tierConfig.daysMax);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Grading Order Confirmed | CardBoom</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>
      
      <Header cartCount={0} onCartClick={() => {}} />
      
      <main className="container max-w-2xl py-8 md:py-16 px-4">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gain/20 mb-6">
            <CheckCircle className="h-10 w-10 text-gain" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Grading Order Confirmed
          </h1>
          <p className="text-muted-foreground text-lg">
            Your card has been submitted for professional AI grading
          </p>
        </div>

        {/* Order Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Order Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Order ID</span>
              <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
                {order.id.slice(0, 8).toUpperCase()}
              </code>
            </div>
            
            <Separator />
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Cards Submitted</span>
              <span className="font-semibold">1 Card</span>
            </div>
            
            <Separator />
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Speed Tier</span>
              <Badge variant={speedTier === 'priority' ? 'default' : 'secondary'}>
                {speedTier.charAt(0).toUpperCase() + speedTier.slice(1)}
              </Badge>
            </div>
            
            <Separator />
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Paid</span>
              <span className="font-bold text-lg">${order.price_usd.toFixed(2)}</span>
            </div>
            
            {queuePosition && (
              <>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Queue Position</span>
                  <Badge variant="outline" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    #{queuePosition}
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Timeline Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Estimated Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Expected Completion</p>
                <p className="font-semibold text-lg">
                  {format(estimatedDate, 'MMMM d, yyyy')}
                </p>
              </div>
              <Badge variant="outline">
                {tierConfig.daysMin}-{tierConfig.daysMax} days
              </Badge>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-gain rounded-full" />
                <span className="text-gain font-medium">Payment Confirmed</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-primary font-medium">In Grading Queue</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-muted-foreground/30 rounded-full" />
                <span className="text-muted-foreground">AI Analysis</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-muted-foreground/30 rounded-full" />
                <span className="text-muted-foreground">Grade Assigned</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              What Happens Next
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                1
              </div>
              <div>
                <p className="font-medium">AI Analysis Begins</p>
                <p className="text-sm text-muted-foreground">
                  Our AI will analyze your card images for centering, corners, edges, and surface quality.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                2
              </div>
              <div>
                <p className="font-medium">Grade Assignment</p>
                <p className="text-sm text-muted-foreground">
                  You'll receive a CardBoom Grading Index (CBGI) score with PSA-equivalent estimate.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                3
              </div>
              <div>
                <p className="font-medium">Notification</p>
                <p className="text-sm text-muted-foreground">
                  We'll send you an email and in-app notification when your grade is ready.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={() => navigate('/grading/orders')}
            className="flex-1"
          >
            View My Grading Orders
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate('/grading/new')}
            className="flex-1"
          >
            Grade Another Card
          </Button>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
