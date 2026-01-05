import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useGrading, GRADING_CATEGORIES } from '@/hooks/useGrading';
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
  Sparkles,
  Shield,
  Truck,
  Vault,
  Info,
  Percent,
  Plus,
  Minus,
  Lightbulb,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { GradingCreditsDisplay, GradingCreditsBanner } from '@/components/grading/GradingCreditsDisplay';
import { GradeAndFlipToggle } from '@/components/grading/GradeAndFlipToggle';
import { useGradingCredits } from '@/hooks/useGradingCredits';
import { CardScannerUpload } from '@/components/CardScannerUpload';
import { CardAnalysis } from '@/hooks/useCardAnalysis';
import { CardReviewModal, ReviewedCardData } from '@/components/card-scan/CardReviewModal';

type Step = 'category' | 'photos' | 'options' | 'review' | 'payment' | 'success';
type DeliveryOption = 'shipping' | 'vault';

const BASE_GRADING_PRICE = 20;
const PROTECTION_SLIP_PRICE = 10;
const BULK_DISCOUNT_THRESHOLD = 10;
const BULK_DISCOUNT_PERCENT = 25;

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
  
  // New options
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>('shipping');
  const [includeProtection, setIncludeProtection] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [autoListEnabled, setAutoListEnabled] = useState(false);
  const [autoListPrice, setAutoListPrice] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [cardAnalysis, setCardAnalysis] = useState<CardAnalysis | null>(null);
  const [useAIScanner, setUseAIScanner] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewedCardData, setReviewedCardData] = useState<ReviewedCardData | null>(null);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  // Fetch user ID for grading credits
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
    });
  }, []);

  const { creditsRemaining } = useGradingCredits(userId);

  const steps = [
    { key: 'category', label: 'Category' },
    { key: 'photos', label: 'Photos' },
    { key: 'options', label: 'Options' },
    { key: 'review', label: 'Review' },
    { key: 'payment', label: 'Payment' },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  // Calculate pricing
  const pricing = useMemo(() => {
    const basePerCard = BASE_GRADING_PRICE + (includeProtection ? PROTECTION_SLIP_PRICE : 0);
    const subtotal = basePerCard * quantity;
    const hasBulkDiscount = quantity >= BULK_DISCOUNT_THRESHOLD;
    const discountAmount = hasBulkDiscount ? subtotal * (BULK_DISCOUNT_PERCENT / 100) : 0;
    const total = subtotal - discountAmount;
    
    return {
      basePerCard,
      subtotal,
      hasBulkDiscount,
      discountAmount,
      total,
      savings: discountAmount
    };
  }, [quantity, includeProtection]);

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
    else if (step === 'photos' && frontImage && backImage) setStep('options');
    else if (step === 'options') setStep('review');
    else if (step === 'review') {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast({ title: 'Please sign in', variant: 'destructive' }); navigate('/auth'); return; }
      await fetchWalletBalance();
      setStep('payment');
    } else if (step === 'payment') await handleSubmit();
  };

  const handleBack = () => {
    const stepOrder: Step[] = ['category', 'photos', 'options', 'review', 'payment'];
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

  const hasInsufficientBalance = walletBalance !== null && walletBalance < pricing.total;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Submit Card for AI Grading | Upload & Get Graded | CardBoom</title>
        <meta name="description" content="Upload your trading card photos and get professional AI grading in 24 hours. Grade Pokémon, MTG, Yu-Gi-Oh!, sports cards with detailed subgrades for corners, edges, surface & centering." />
        <meta name="keywords" content="submit card grading, upload card for grading, AI card grading, grade my card, card grading submission, TCG grading service" />
        <link rel="canonical" href="https://cardboom.com/grading/new" />
        <meta name="robots" content="index, follow" />
        
        <meta property="og:title" content="Submit Card for AI Grading | CardBoom" />
        <meta property="og:description" content="Upload your trading card photos and get professional AI grading in 24 hours." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://cardboom.com/grading/new" />
      </Helmet>
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
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Upload Photos</CardTitle>
                  <p className="text-sm text-muted-foreground">Clear photos of front and back</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* AI Scanner Toggle */}
                  {!frontPreview && !backPreview && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">AI Card Recognition</span>
                      </div>
                      <Switch 
                        checked={useAIScanner} 
                        onCheckedChange={setUseAIScanner}
                      />
                    </div>
                  )}

                  {/* AI Scanner for Front Image */}
                  {useAIScanner && !frontPreview && (
                    <div className="mb-4">
                      <Label className="block text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wide">Front (AI Scan)</Label>
                      <CardScannerUpload
                        mode="grading"
                        onScanComplete={(scanAnalysis, file, previewUrl) => {
                          setCardAnalysis(scanAnalysis);
                          setFrontImage(file);
                          setFrontPreview(previewUrl);
                          
                          // Auto-detect category if found
                          if (scanAnalysis.category && !category) {
                            const matchedCategory = GRADING_CATEGORIES.find(
                              c => c.id.toLowerCase() === scanAnalysis.category?.toLowerCase()
                            );
                            if (matchedCategory) {
                              setCategory(matchedCategory.id);
                            }
                          }
                          
                          // Show review modal if needs confirmation
                          if (scanAnalysis.needsReview) {
                            setShowReviewModal(true);
                          } else {
                            toast({
                              title: scanAnalysis.detected ? 'Card Recognized!' : 'Image Uploaded',
                              description: scanAnalysis.detected 
                                ? `Detected: ${scanAnalysis.cardNameEnglish || scanAnalysis.cardName || 'Card'}`
                                : 'Now upload the back of the card',
                            });
                          }
                        }}
                        onSkip={() => setUseAIScanner(false)}
                        className="border-0 shadow-none p-0"
                      />
                    </div>
                  )}

                  {/* Show detected card info */}
                  {cardAnalysis?.detected && frontPreview && (
                    <div className="p-3 rounded-lg bg-gain/10 border border-gain/30 flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-gain flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gain truncate">{cardAnalysis.cardName || 'Card Detected'}</p>
                        {cardAnalysis.setName && (
                          <p className="text-xs text-muted-foreground truncate">{cardAnalysis.setName}</p>
                        )}
                      </div>
                      <Badge variant="secondary" className="flex-shrink-0">
                        {Math.round((cardAnalysis.confidence || 0) * 100)}%
                      </Badge>
                    </div>
                  )}

                  {/* Manual Upload Grid (or back image after front is scanned) */}
                  {(!useAIScanner || frontPreview) && (
                    <div className="grid grid-cols-2 gap-4">
                      {['front', 'back'].map((side) => {
                        const preview = side === 'front' ? frontPreview : backPreview;
                        const inputRef = side === 'front' ? frontInputRef : backInputRef;
                        
                        // Skip front if already uploaded via AI scanner
                        if (side === 'front' && frontPreview && useAIScanner) {
                          return (
                            <div key={side}>
                              <label className="block text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wide">{side}</label>
                              <div className="w-full aspect-[3/4] rounded-xl border-2 border-gain overflow-hidden relative">
                                <img src={preview} alt={`${side} preview`} className="w-full h-full object-cover" />
                                <div className="absolute top-2 right-2">
                                  <Badge className="bg-gain text-gain-foreground gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    AI Scanned
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        
                        return (
                          <div key={side}>
                            <label className="block text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wide">{side}</label>
                            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(side as 'front' | 'back', e.target.files?.[0] || null)} />
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => inputRef.current?.click()}
                              className={cn('w-full aspect-[3/4] rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden', preview ? 'border-primary p-0' : 'border-border hover:border-primary/50')}>
                              {preview ? <img src={preview} alt={`${side} preview`} className="w-full h-full object-cover" /> : (
                                <>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Camera className="w-6 h-6 text-muted-foreground" />
                                    <span className="text-muted-foreground">/</span>
                                    <Upload className="w-6 h-6 text-muted-foreground" />
                                  </div>
                                  <span className="text-xs text-muted-foreground text-center">Take photo or<br/>choose from gallery</span>
                                </>
                              )}
                            </motion.button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  <Button className="w-full gap-2 h-11 rounded-full" disabled={!frontImage || !backImage} onClick={handleNext}>Continue <ArrowRight className="w-4 h-4" /></Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 'options' && (
            <motion.div key="options" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
              <Card className="border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Grading Options</CardTitle>
                  <p className="text-sm text-muted-foreground">CardBoom Indexed Grading Certification</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Quantity */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Number of Cards</Label>
                    <div className="flex items-center gap-4">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-10 w-10 rounded-full"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="text-2xl font-bold w-12 text-center">{quantity}</span>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-10 w-10 rounded-full"
                        onClick={() => setQuantity(quantity + 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {quantity >= BULK_DISCOUNT_THRESHOLD && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 text-sm text-primary font-medium"
                      >
                        <Percent className="w-4 h-4" />
                        {BULK_DISCOUNT_PERCENT}% bulk discount applied!
                      </motion.div>
                    )}
                  </div>

                  {/* Delivery Option */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Delivery Method</Label>
                    <RadioGroup value={deliveryOption} onValueChange={(v) => setDeliveryOption(v as DeliveryOption)} className="grid grid-cols-2 gap-3">
                      <Label 
                        htmlFor="shipping" 
                        className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all',
                          deliveryOption === 'shipping' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/30'
                        )}
                      >
                        <RadioGroupItem value="shipping" id="shipping" className="sr-only" />
                        <Truck className="w-6 h-6 text-primary" />
                        <span className="font-medium text-sm">Shipping</span>
                        <span className="text-xs text-muted-foreground">Delivered to you</span>
                      </Label>
                      <Label 
                        htmlFor="vault" 
                        className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all',
                          deliveryOption === 'vault' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/30'
                        )}
                      >
                        <RadioGroupItem value="vault" id="vault" className="sr-only" />
                        <Vault className="w-6 h-6 text-primary" />
                        <span className="font-medium text-sm">Vault Storage</span>
                        <span className="text-xs text-muted-foreground">Secure storage</span>
                      </Label>
                    </RadioGroup>
                  </div>

                  {/* Protection Slip */}
                  <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Shield className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">CardBoom Index Protection</p>
                          <p className="text-xs text-muted-foreground">Premium protection slip</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-primary">+${PROTECTION_SLIP_PRICE}</span>
                        <Switch 
                          checked={includeProtection} 
                          onCheckedChange={setIncludeProtection}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Includes premium protection sleeve and official CardBoom Index Certification hologram sticker for authenticity verification.
                    </p>
                  </div>

                  {/* Grade & Flip Toggle */}
                  <GradeAndFlipToggle
                    enabled={autoListEnabled}
                    onEnabledChange={setAutoListEnabled}
                    suggestedPrice={autoListPrice || undefined}
                    customPrice={autoListPrice || undefined}
                    onCustomPriceChange={setAutoListPrice}
                  />

                  {/* Free Grading Credits */}
                  <GradingCreditsDisplay userId={userId} />

                  {/* Pro Tip */}
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="flex gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Pro Tip</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Only grade cards valued above $50 — the valuation boost from grading makes the most impact on higher-value cards.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button className="w-full gap-2 h-11 rounded-full" onClick={handleNext}>Continue <ArrowRight className="w-4 h-4" /></Button>
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
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Category</span>
                      <span className="font-medium">{GRADING_CATEGORIES.find(c => c.id === category)?.icon} {GRADING_CATEGORIES.find(c => c.id === category)?.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Quantity</span>
                      <span className="font-medium">{quantity} card{quantity > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Delivery</span>
                      <span className="font-medium flex items-center gap-1.5">
                        {deliveryOption === 'shipping' ? <Truck className="w-3.5 h-3.5" /> : <Vault className="w-3.5 h-3.5" />}
                        {deliveryOption === 'shipping' ? 'Shipping' : 'Vault Storage'}
                      </span>
                    </div>
                    {includeProtection && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Protection</span>
                        <span className="font-medium flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-primary" />
                          Included (+${PROTECTION_SLIP_PRICE}/card)
                        </span>
                      </div>
                    )}
                    <div className="h-px bg-border my-2" />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Base price</span>
                      <span>${BASE_GRADING_PRICE}/card</span>
                    </div>
                    {includeProtection && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Protection slip</span>
                        <span>+${PROTECTION_SLIP_PRICE}/card</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal ({quantity}x)</span>
                      <span>${pricing.subtotal.toFixed(2)}</span>
                    </div>
                    {pricing.hasBulkDiscount && (
                      <div className="flex justify-between text-sm text-primary">
                        <span className="flex items-center gap-1.5">
                          <Percent className="w-3.5 h-3.5" />
                          Bulk discount ({BULK_DISCOUNT_PERCENT}%)
                        </span>
                        <span>-${pricing.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="h-px bg-border my-2" />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">${pricing.total.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-center">
                    <p className="text-sm">⏱️ Turnaround: <span className="font-semibold">1-5 days</span></p>
                  </div>
                  
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
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Wallet Balance</span>
                      <span className="font-bold">${walletBalance?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CardBoom Grading ({quantity}x)</span>
                      <span>${pricing.subtotal.toFixed(2)}</span>
                    </div>
                    {pricing.hasBulkDiscount && (
                      <div className="flex justify-between text-primary">
                        <span>Bulk Discount</span>
                        <span>-${pricing.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="h-px bg-border" />
                    <div className="flex justify-between text-lg">
                      <span className="font-semibold">Total Due</span>
                      <span className="font-bold text-primary">${pricing.total.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {hasInsufficientBalance && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-destructive text-sm">Insufficient Balance</p>
                        <p className="text-xs text-muted-foreground mt-1">You need ${(pricing.total - (walletBalance || 0)).toFixed(2)} more.</p>
                        <Button variant="outline" size="sm" className="mt-2 h-8" onClick={() => navigate('/wallet')}>Top Up</Button>
                      </div>
                    </motion.div>
                  )}
                  
                  <Button className="w-full gap-2 h-11 rounded-full" disabled={isSubmitting || hasInsufficientBalance} onClick={handleSubmit}>
                    {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Processing...</> : <>Pay ${pricing.total.toFixed(2)} & Submit<Check className="w-4 h-4" /></>}
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

      {/* Card Review Modal */}
      <CardReviewModal
        open={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        analysis={cardAnalysis}
        imagePreview={frontPreview}
        onConfirm={(reviewedData) => {
          setReviewedCardData(reviewedData);
          
          // Update category if changed
          const matchedCategory = GRADING_CATEGORIES.find(
            c => c.id.toLowerCase() === reviewedData.category?.toLowerCase()
          );
          if (matchedCategory) {
            setCategory(matchedCategory.id);
          }
          
          // Update the cardAnalysis with reviewed data
          if (cardAnalysis) {
            setCardAnalysis({
              ...cardAnalysis,
              cardName: reviewedData.cardName,
              cardNameEnglish: reviewedData.cardNameEnglish,
              setName: reviewedData.setName,
              setCode: reviewedData.setCode,
              cardNumber: reviewedData.cardNumber,
              rarity: reviewedData.rarity,
              category: reviewedData.category,
              language: reviewedData.language,
              cviKey: reviewedData.cviKey,
              needsReview: false,
            });
          }
          
          setShowReviewModal(false);
          toast({
            title: 'Card Details Confirmed',
            description: 'Now upload the back of the card',
          });
        }}
      />
    </div>
  );
}