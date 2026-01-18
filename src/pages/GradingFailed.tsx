import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { useGrading, GradingOrder } from '@/hooks/useGrading';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, RefreshCcw, HelpCircle, ArrowLeft } from 'lucide-react';

export default function GradingFailed() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const reason = searchParams.get('reason');
  
  const [order, setOrder] = useState<GradingOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const { getOrder } = useGrading();

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth', { replace: true });
        return;
      }

      const fetchedOrder = await getOrder(orderId);
      if (fetchedOrder && fetchedOrder.user_id === user.id) {
        setOrder(fetchedOrder);
      }
      setLoading(false);
    };

    loadOrder();
  }, [orderId, navigate, getOrder]);

  const getErrorMessage = () => {
    if (reason === 'insufficient_balance') {
      return 'Your wallet balance was insufficient to complete this payment.';
    }
    if (reason === 'payment_declined') {
      return 'The payment was declined. Please try again or use a different payment method.';
    }
    if (order?.error_message) {
      return order.error_message;
    }
    return 'There was an issue processing your grading order payment.';
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Payment Failed | CardBoom Grading</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>
      
      <Header cartCount={0} onCartClick={() => {}} />
      
      <main className="container max-w-2xl py-8 md:py-16 px-4">
        {/* Failed Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/20 mb-6">
            <XCircle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Payment Failed
          </h1>
          <p className="text-muted-foreground text-lg">
            We couldn't process your grading order payment
          </p>
        </div>

        {/* Error Details Card */}
        <Card className="mb-6 border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">What Happened</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {getErrorMessage()}
            </p>
            
            {order && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order ID</span>
                  <code className="font-mono">{order.id.slice(0, 8).toUpperCase()}</code>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span>${order.price_usd.toFixed(2)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* What To Do Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              What You Can Do
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                1
              </div>
              <div>
                <p className="font-medium">Check Your Wallet Balance</p>
                <p className="text-sm text-muted-foreground">
                  Ensure you have sufficient funds in your CardBoom wallet.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                2
              </div>
              <div>
                <p className="font-medium">Add Funds If Needed</p>
                <p className="text-sm text-muted-foreground">
                  Top up your wallet with credit card or wire transfer.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                3
              </div>
              <div>
                <p className="font-medium">Try Again</p>
                <p className="text-sm text-muted-foreground">
                  Submit your grading order again once you're ready.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={() => navigate('/wallet')}
            className="flex-1"
          >
            Add Funds to Wallet
            <RefreshCcw className="ml-2 h-4 w-4" />
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate('/grading/new')}
            className="flex-1"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>

        <div className="mt-6 text-center">
          <Button variant="link" onClick={() => navigate('/help')}>
            Need help? Contact Support
          </Button>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
