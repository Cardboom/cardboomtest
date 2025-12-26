import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useGrading, GRADING_CATEGORIES, GRADING_PRICE_USD } from '@/hooks/useGrading';
import { Header } from '@/components/Header';
import { CartDrawer } from '@/components/CartDrawer';
import { Collectible } from '@/types/collectible';
import { Helmet } from 'react-helmet-async';
import { 
  ArrowLeft, 
  ArrowRight, 
  Camera, 
  Upload, 
  Check, 
  Loader2,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type Step = 'category' | 'photos' | 'review' | 'payment' | 'success';

export default function GradingNew() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createOrder, submitAndPay } = useGrading();
  
  const [cartItems, setCartItems] = useState<Collectible[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [step, setStep] = useState<Step>('category');
  const [category, setCategory] = useState<string>('');
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string>('');
  const [backPreview, setBackPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [createdOrder, setCreatedOrder] = useState<any>(null);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const steps: { key: Step; label: string }[] = [
    { key: 'category', label: 'Category' },
    { key: 'photos', label: 'Photos' },
    { key: 'review', label: 'Review' },
    { key: 'payment', label: 'Payment' },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleImageChange = (side: 'front' | 'back', file: File | null) => {
    if (!file) return;
    
    if (side === 'front') {
      setFrontImage(file);
      setFrontPreview(URL.createObjectURL(file));
    } else {
      setBackImage(file);
      setBackPreview(URL.createObjectURL(file));
    }
  };

  const fetchWalletBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      setWalletBalance(data?.balance || 0);
    }
  };

  const handleNext = async () => {
    if (step === 'category' && category) {
      setStep('photos');
    } else if (step === 'photos' && frontImage && backImage) {
      setStep('review');
    } else if (step === 'review') {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Please sign in to continue', variant: 'destructive' });
        navigate('/auth');
        return;
      }
      await fetchWalletBalance();
      setStep('payment');
    } else if (step === 'payment') {
      await handleSubmit();
    }
  };

  const handleBack = () => {
    const stepOrder: Step[] = ['category', 'photos', 'review', 'payment'];
    const currentIndex = stepOrder.indexOf(step);
    if (currentIndex > 0) {
      setStep(stepOrder[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    if (!frontImage || !backImage || !category) return;
    
    setIsSubmitting(true);
    try {
      const order = await createOrder(category, frontImage, backImage);
      if (!order) {
        setIsSubmitting(false);
        return;
      }

      const success = await submitAndPay(order.id, order.idempotency_key);
      
      if (success) {
        setCreatedOrder(order);
        setStep('success');
      }
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasInsufficientBalance = walletBalance !== null && walletBalance < GRADING_PRICE_USD;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Submit Card for Grading - CardBoom</title>
        <meta name="description" content="Submit your trading card for AI-powered grading. Upload photos and get professional results in 1-5 days." />
      </Helmet>
      
      <Header cartCount={cartItems.length} onCartClick={() => setIsCartOpen(true)} />
      <CartDrawer 
        items={cartItems} 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        onRemoveItem={(id) => setCartItems(items => items.filter(item => item.id !== id))}
      />
      
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-2xl">
        <Button 
          variant="ghost" 
          className="mb-6 gap-2"
          onClick={() => step === 'category' ? navigate('/grading') : handleBack()}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        {step !== 'success' && (
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              {steps.map((s, i) => (
                <span 
                  key={s.key}
                  className={cn(
                    'text-xs font-medium',
                    i <= currentStepIndex ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {s.label}
                </span>
              ))}
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {step === 'category' && (
          <Card>
            <CardHeader>
              <CardTitle>Select Card Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {GRADING_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={cn(
                      'p-4 rounded-lg border-2 text-left transition-all hover:border-primary/50',
                      category === cat.id 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border bg-card'
                    )}
                  >
                    <span className="text-2xl mb-2 block">{cat.icon}</span>
                    <span className="font-medium">{cat.name}</span>
                  </button>
                ))}
              </div>
              
              <Button 
                className="w-full mt-6 gap-2" 
                size="lg"
                disabled={!category}
                onClick={handleNext}
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'photos' && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Card Photos</CardTitle>
              <p className="text-sm text-muted-foreground">
                Take clear, well-lit photos of both sides
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Front of Card</label>
                <input
                  ref={frontInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleImageChange('front', e.target.files?.[0] || null)}
                />
                <button
                  onClick={() => frontInputRef.current?.click()}
                  className={cn(
                    'w-full aspect-[3/4] rounded-lg border-2 border-dashed transition-all flex flex-col items-center justify-center',
                    frontPreview 
                      ? 'border-primary p-0 overflow-hidden' 
                      : 'border-border hover:border-primary/50 p-8'
                  )}
                >
                  {frontPreview ? (
                    <img src={frontPreview} alt="Front preview" className="w-full h-full object-contain" />
                  ) : (
                    <>
                      <Camera className="w-12 h-12 text-muted-foreground mb-4" />
                      <span className="text-sm text-muted-foreground">Tap to take or upload photo</span>
                    </>
                  )}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Back of Card</label>
                <input
                  ref={backInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleImageChange('back', e.target.files?.[0] || null)}
                />
                <button
                  onClick={() => backInputRef.current?.click()}
                  className={cn(
                    'w-full aspect-[3/4] rounded-lg border-2 border-dashed transition-all flex flex-col items-center justify-center',
                    backPreview 
                      ? 'border-primary p-0 overflow-hidden' 
                      : 'border-border hover:border-primary/50 p-8'
                  )}
                >
                  {backPreview ? (
                    <img src={backPreview} alt="Back preview" className="w-full h-full object-contain" />
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                      <span className="text-sm text-muted-foreground">Tap to take or upload photo</span>
                    </>
                  )}
                </button>
              </div>
              
              <Button 
                className="w-full gap-2" 
                size="lg"
                disabled={!frontImage || !backImage}
                onClick={handleNext}
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'review' && (
          <Card>
            <CardHeader>
              <CardTitle>Review Submission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">Front</p>
                  <img src={frontPreview} alt="Front" className="w-full rounded-lg border" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">Back</p>
                  <img src={backPreview} alt="Back" className="w-full rounded-lg border" />
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-medium">
                    {GRADING_CATEGORIES.find(c => c.id === category)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-bold text-primary">${GRADING_PRICE_USD}</span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm text-center">
                  ⏱️ Typical turnaround: <span className="font-semibold">1-5 days</span>
                </p>
              </div>
              
              <Button 
                className="w-full gap-2" 
                size="lg"
                onClick={handleNext}
              >
                Proceed to Payment
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'payment' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Pay & Submit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex justify-between mb-4">
                  <span className="text-muted-foreground">Your Wallet Balance</span>
                  <span className="font-bold">${walletBalance?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span>Grading Fee</span>
                  <span className="font-bold text-primary">${GRADING_PRICE_USD}</span>
                </div>
              </div>

              {hasInsufficientBalance && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Insufficient Balance</p>
                    <p className="text-sm text-muted-foreground">
                      You need ${(GRADING_PRICE_USD - (walletBalance || 0)).toFixed(2)} more to submit.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => navigate('/wallet')}
                    >
                      Top Up Wallet
                    </Button>
                  </div>
                </div>
              )}
              
              <Button 
                className="w-full gap-2" 
                size="lg"
                disabled={isSubmitting || hasInsufficientBalance}
                onClick={handleSubmit}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Pay ${GRADING_PRICE_USD} & Submit
                    <Check className="w-4 h-4" />
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                By submitting, you agree to our grading terms. Results typically arrive within 1-5 days.
              </p>
            </CardContent>
          </Card>
        )}

        {step === 'success' && (
          <Card className="text-center">
            <CardContent className="pt-8 pb-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-primary" />
              </div>
              
              <h2 className="text-2xl font-bold mb-2">Order Submitted!</h2>
              <p className="text-muted-foreground mb-6">
                Your card is now in the grading queue. Results typically arrive within 1-5 days.
              </p>

              <Badge variant="secondary" className="mb-6">
                Order ID: {createdOrder?.id?.slice(0, 8)}...
              </Badge>

              <div className="space-y-3">
                <Button 
                  className="w-full"
                  onClick={() => navigate(`/grading/orders/${createdOrder?.id}`)}
                >
                  View Order Status
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate('/grading/orders')}
                >
                  All My Orders
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
