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
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ArrowRight, 
  Camera, 
  Upload, 
  Check, 
  Loader2,
  CreditCard,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type Step = 'category' | 'photos' | 'review' | 'payment' | 'success';

const containerVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
};

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

  const steps = [
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
      const { data } = await supabase.from('wallets').select('balance').eq('user_id', user.id).single();
      setWalletBalance(data?.balance || 0);
    }
  };

  const handleNext = async () => {
    if (step === 'category' && category) setStep('photos');
    else if (step === 'photos' && frontImage && backImage) setStep('review');
    else if (step === 'review') {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast({ title: 'Please sign in', variant: 'destructive' }); navigate('/auth'); return; }
      await fetchWalletBalance();
      setStep('payment');
    } else if (step === 'payment') await handleSubmit();
  };

  const handleBack = () => {
    const stepOrder: Step[] = ['category', 'photos', 'review', 'payment'];
    const idx = stepOrder.indexOf(step);
    if (idx > 0) setStep(stepOrder[idx - 1]);
  };

  const handleSubmit = async () => {
    if (!frontImage || !backImage || !category) return;
    setIsSubmitting(true);
    try {
      const order = await createOrder(category, frontImage, backImage);
      if (!order) { setIsSubmitting(false); return; }
      const success = await submitAndPay(order.id, order.idempotency_key);
      if (success) { setCreatedOrder(order); setStep('success'); }
    } catch (e) { console.error(e); } finally { setIsSubmitting(false); }
  };

  const hasInsufficientBalance = walletBalance !== null && walletBalance < GRADING_PRICE_USD;

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Submit Card for Grading - CardBoom</title></Helmet>
      <Header cartCount={cartItems.length} onCartClick={() => setIsCartOpen(true)} />
      <CartDrawer items={cartItems} isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} onRemoveItem={(id) => setCartItems(items => items.filter(item => item.id !== id))} />
      
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-lg">
        <Button variant="ghost" className="mb-4 gap-2 -ml-2" onClick={() => step === 'category' ? navigate('/grading') : handleBack()}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        {step !== 'success' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="flex justify-between mb-2">
              {steps.map((s, i) => (
                <span key={s.key} className={cn('text-xs font-medium transition-colors', i <= currentStepIndex ? 'text-primary' : 'text-muted-foreground')}>{s.label}</span>
              ))}
            </div>
            <Progress value={progress} className="h-1.5" />
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {step === 'category' && (
            <motion.div key="category" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
              <Card className="border-border/50">
                <CardHeader className="pb-4"><CardTitle className="text-xl">Select Category</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {GRADING_CATEGORIES.map((cat) => (
                      <motion.button key={cat.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setCategory(cat.id)}
                        className={cn('p-4 rounded-xl border-2 text-left transition-all', category === cat.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/30')}>
                        <span className="text-2xl mb-1 block">{cat.icon}</span>
                        <span className="font-medium text-sm">{cat.name}</span>
                      </motion.button>
                    ))}
                  </div>
                  <Button className="w-full mt-6 gap-2 h-11 rounded-full" disabled={!category} onClick={handleNext}>Continue <ArrowRight className="w-4 h-4" /></Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 'photos' && (
            <motion.div key="photos" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
              <Card className="border-border/50">
                <CardHeader className="pb-4"><CardTitle className="text-xl">Upload Photos</CardTitle><p className="text-sm text-muted-foreground">Clear photos of front and back</p></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {['front', 'back'].map((side) => {
                      const preview = side === 'front' ? frontPreview : backPreview;
                      const inputRef = side === 'front' ? frontInputRef : backInputRef;
                      return (
                        <div key={side}>
                          <label className="block text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wide">{side}</label>
                          <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleImageChange(side as 'front' | 'back', e.target.files?.[0] || null)} />
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => inputRef.current?.click()}
                            className={cn('w-full aspect-[3/4] rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden', preview ? 'border-primary p-0' : 'border-border hover:border-primary/50')}>
                            {preview ? <img src={preview} alt={`${side} preview`} className="w-full h-full object-cover" /> : <>{side === 'front' ? <Camera className="w-8 h-8 text-muted-foreground mb-2" /> : <Upload className="w-8 h-8 text-muted-foreground mb-2" />}<span className="text-xs text-muted-foreground">Tap to upload</span></>}
                          </motion.button>
                        </div>
                      );
                    })}
                  </div>
                  <Button className="w-full gap-2 h-11 rounded-full" disabled={!frontImage || !backImage} onClick={handleNext}>Continue <ArrowRight className="w-4 h-4" /></Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 'review' && (
            <motion.div key="review" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
              <Card className="border-border/50">
                <CardHeader className="pb-4"><CardTitle className="text-xl">Review Submission</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-1"><p className="text-xs text-muted-foreground mb-1 uppercase">Front</p><img src={frontPreview} alt="Front" className="w-full aspect-[3/4] object-cover rounded-lg border" /></div>
                    <div className="flex-1"><p className="text-xs text-muted-foreground mb-1 uppercase">Back</p><img src={backPreview} alt="Back" className="w-full aspect-[3/4] object-cover rounded-lg border" /></div>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50 space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Category</span><span className="font-medium">{GRADING_CATEGORIES.find(c => c.id === category)?.icon} {GRADING_CATEGORIES.find(c => c.id === category)?.name}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Price</span><span className="font-bold text-primary">${GRADING_PRICE_USD}</span></div>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-center"><p className="text-sm">⏱️ Turnaround: <span className="font-semibold">1-5 days</span></p></div>
                  <Button className="w-full gap-2 h-11 rounded-full" onClick={handleNext}>Proceed to Payment <ArrowRight className="w-4 h-4" /></Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 'payment' && (
            <motion.div key="payment" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
              <Card className="border-border/50">
                <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-xl"><CreditCard className="w-5 h-5" />Pay & Submit</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                    <div className="flex justify-between"><span className="text-muted-foreground">Wallet Balance</span><span className="font-bold">${walletBalance?.toFixed(2) || '0.00'}</span></div>
                    <div className="h-px bg-border" />
                    <div className="flex justify-between text-lg"><span>Grading Fee</span><span className="font-bold text-primary">${GRADING_PRICE_USD}</span></div>
                  </div>
                  {hasInsufficientBalance && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                      <div><p className="font-medium text-destructive text-sm">Insufficient Balance</p><p className="text-xs text-muted-foreground mt-1">You need ${(GRADING_PRICE_USD - (walletBalance || 0)).toFixed(2)} more.</p><Button variant="outline" size="sm" className="mt-2 h-8" onClick={() => navigate('/wallet')}>Top Up</Button></div>
                    </motion.div>
                  )}
                  <Button className="w-full gap-2 h-11 rounded-full" disabled={isSubmitting || hasInsufficientBalance} onClick={handleSubmit}>
                    {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Processing...</> : <>Pay ${GRADING_PRICE_USD} & Submit<Check className="w-4 h-4" /></>}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">Results typically arrive within 1-5 days.</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
              <Card className="border-border/50 text-center">
                <CardContent className="pt-10 pb-8">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center mx-auto mb-6"><Sparkles className="w-8 h-8 text-white" /></motion.div>
                  <h2 className="text-2xl font-bold mb-2">Order Submitted!</h2>
                  <p className="text-muted-foreground mb-6">Your card is in the grading queue. Results in 1-5 days.</p>
                  <Badge variant="secondary" className="mb-6">Order: {createdOrder?.id?.slice(0, 8)}...</Badge>
                  <div className="space-y-3">
                    <Button className="w-full h-11 rounded-full" onClick={() => navigate(`/grading/orders/${createdOrder?.id}`)}>View Order Status</Button>
                    <Button variant="outline" className="w-full h-11 rounded-full" onClick={() => navigate('/grading/orders')}>All My Orders</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
