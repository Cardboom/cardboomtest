import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft, HelpCircle } from 'lucide-react';

export default function GradingCanceled() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Order Canceled | CardBoom Grading</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>
      
      <Header cartCount={0} onCartClick={() => {}} />
      
      <main className="container max-w-2xl py-8 md:py-16 px-4">
        {/* Canceled Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
            <XCircle className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Order Canceled
          </h1>
          <p className="text-muted-foreground text-lg">
            Your grading order was not completed
          </p>
        </div>

        {/* Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              What Happened
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You canceled the grading order before payment was completed. 
              No charges were made to your wallet.
            </p>
            
            {orderId && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order Reference</span>
                  <code className="font-mono">{orderId.slice(0, 8).toUpperCase()}</code>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Encouragement Card */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">Ready to grade your card?</p>
              <p className="text-muted-foreground text-sm mb-4">
                Our AI grading provides instant, accurate assessments with PSA-equivalent estimates.
                Starting at just $15.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={() => navigate('/grading/new')}
            className="flex-1"
          >
            Start Grading
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate('/grading')}
            className="flex-1"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Grading
          </Button>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
