import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useGrading, GRADING_CATEGORIES } from '@/hooks/useGrading';
import { useAdminRole } from '@/hooks/useAdminRole';
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
  Percent,
  Plus,
  Minus,
  Lightbulb,
  CheckCircle2,
  Clock,
  ImageIcon,
  Package,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { GradingCreditsDisplay } from '@/components/grading/GradingCreditsDisplay';
import { GradeAndFlipToggle } from '@/components/grading/GradeAndFlipToggle';
import { SpeedTierSelector, SpeedTier, SPEED_TIERS } from '@/components/grading/SpeedTierSelector';
import { useGradingCredits } from '@/hooks/useGradingCredits';
import { CardScannerUpload } from '@/components/CardScannerUpload';
import { CardAnalysis } from '@/hooks/useCardAnalysis';
import { CardReviewModal, ReviewedCardData } from '@/components/card-scan/CardReviewModal';
import { ImageCropper } from '@/components/grading/ImageCropper';
import { ListingSelector } from '@/components/grading/ListingSelector';

interface SelectedListing {
  id: string;
  title: string;
  category: string;
  condition: string;
  price: number;
  image_url: string | null;
  front_image_url: string | null;
  back_image_url: string | null;
  status: string;
  grading_order_id: string | null;
  cbgi_score: number | null;
}

type Step = 'photos' | 'options' | 'review' | 'payment' | 'success';
type DeliveryOption = 'shipping' | 'vault';

const PROTECTION_BUNDLE_PRICE = 10; // Hologram seal + sleeve + CBGI tag
const BULK_DISCOUNT_THRESHOLD = 10;
const BULK_DISCOUNT_PERCENT = 25;

const containerVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
};

export default function GradingNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { createOrder, submitAndPay, createOrderFromListing } = useGrading();
  const { isAdmin } = useAdminRole();
  
  const [cartItems, setCartItems] = useState<Collectible[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [step, setStep] = useState<Step>('photos');
  const [gradeMode, setGradeMode] = useState<'new' | 'listing'>('new');
  const [selectedListing, setSelectedListing] = useState<SelectedListing | null>(null);
  const [category, setCategory] = useState<string>('pokemon'); // Default category
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string>('');
  const [backPreview, setBackPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  
  // Options
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>('shipping');
  const [includeProtection, setIncludeProtection] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [speedTier, setSpeedTier] = useState<SpeedTier>('standard');
  const [autoListEnabled, setAutoListEnabled] = useState(false);
  const [autoListPrice, setAutoListPrice] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [cardAnalysis, setCardAnalysis] = useState<CardAnalysis | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewedCardData, setReviewedCardData] = useState<ReviewedCardData | null>(null);
  
  // Cropping state
  const [showCropper, setShowCropper] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  const [cropSide, setCropSide] = useState<'front' | 'back'>('front');

  const backInputRef = useRef<HTMLInputElement>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);

  // Check for listing ID in URL params
  useEffect(() => {
    const listingId = searchParams.get('listing');
    if (listingId) {
      setGradeMode('listing');
      // Fetch the listing details
      supabase
        .from('listings')
        .select('id, title, category, condition, price, image_url, front_image_url, back_image_url, status, grading_order_id, cbgi_score')
        .eq('id', listingId)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setSelectedListing(data);
            setCategory(data.category);
            // Pre-populate images if available
            if (data.front_image_url || data.image_url) {
              setFrontPreview(data.front_image_url || data.image_url || '');
            }
            if (data.back_image_url) {
              setBackPreview(data.back_image_url);
            }
          }
        });
    }
  }, [searchParams]);

  // Fetch user ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
    });
  }, []);

  const { creditsRemaining } = useGradingCredits(userId);

  const steps = [
    { key: 'photos', label: 'Photos' },
    { key: 'options', label: 'Options' },
    { key: 'review', label: 'Review' },
    { key: 'payment', label: 'Pay' },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  // Calculate pricing based on speed tier
  const pricing = useMemo(() => {
    const selectedSpeed = SPEED_TIERS.find(t => t.id === speedTier) || SPEED_TIERS[0];
    const basePerCard = selectedSpeed.price + (includeProtection ? PROTECTION_BUNDLE_PRICE : 0);
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
      savings: discountAmount,
      speedPrice: selectedSpeed.price,
      protectionPrice: includeProtection ? PROTECTION_BUNDLE_PRICE : 0,
      daysMin: selectedSpeed.daysMin,
      daysMax: selectedSpeed.daysMax,
    };
  }, [quantity, includeProtection, speedTier]);

  const handleBackImageChange = (file: File | null) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setCropImageSrc(previewUrl);
    setCropSide('back');
    setShowCropper(true);
  };
  
  const handleCropComplete = (croppedFile: File, previewUrl: string) => {
    if (cropSide === 'front') {
      setFrontImage(croppedFile);
      setFrontPreview(previewUrl);
      toast({
        title: cardAnalysis?.detected ? 'Card Recognized!' : 'Image Ready',
        description: cardAnalysis?.detected 
          ? `${cardAnalysis.cardNameEnglish || cardAnalysis.cardName || 'Card'}`
          : 'Now upload the back',
      });
    } else {
      setBackImage(croppedFile);
      setBackPreview(previewUrl);
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
    // For listing mode, check if we have both images (either from listing or newly uploaded)
    const hasFrontImage = frontImage || frontPreview;
    const hasBackImage = backImage || backPreview;
    
    if (step === 'photos') {
      // CRITICAL: Both front AND back images are REQUIRED for grading
      if (!hasFrontImage) {
        toast({ title: 'Front image required', description: 'Please upload the front of the card', variant: 'destructive' });
        return;
      }
      if (!hasBackImage) {
        toast({ title: 'Back image required', description: 'Please upload the back of the card for accurate grading', variant: 'destructive' });
        return;
      }
      setStep('options');
    } else if (step === 'options') setStep('review');
    else if (step === 'review') {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast({ title: 'Please sign in', variant: 'destructive' }); navigate('/auth'); return; }
      await fetchWalletBalance();
      setStep('payment');
    } else if (step === 'payment') await handleSubmit();
  };

  const handleBack = () => {
    const stepOrder: Step[] = ['photos', 'options', 'review', 'payment'];
    const idx = stepOrder.indexOf(step);
    if (idx > 0) setStep(stepOrder[idx - 1]);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      let order;
      
      if (gradeMode === 'listing' && selectedListing) {
        // Create order from existing listing
        order = await createOrderFromListing(
          selectedListing.id,
          frontImage, // null if using existing image
          backImage,  // null if using existing image
          frontPreview || null,
          backPreview || null,
          speedTier
        );
      } else {
        // Standard new card flow
        if (!frontImage || !backImage) {
          toast({ title: 'Please upload both front and back images', variant: 'destructive' });
          setIsSubmitting(false);
          return;
        }
        order = await createOrder(category, frontImage, backImage, speedTier, autoListEnabled, autoListPrice);
      }
      
      if (!order) { setIsSubmitting(false); return; }
      const success = await submitAndPay(order.id, order.idempotency_key);
      if (success) { setCreatedOrder(order); setStep('success'); }
    } catch (e) { console.error(e); } finally { setIsSubmitting(false); }
  };
  
  // Handle listing selection
  const handleListingSelect = (listing: SelectedListing | null) => {
    setSelectedListing(listing);
    if (listing) {
      setCategory(listing.category);
      // Pre-populate existing images
      if (listing.front_image_url || listing.image_url) {
        setFrontPreview(listing.front_image_url || listing.image_url || '');
        setFrontImage(null); // Using existing URL, not a new file
      } else {
        setFrontPreview('');
        setFrontImage(null);
      }
      if (listing.back_image_url) {
        setBackPreview(listing.back_image_url);
        setBackImage(null);
      } else {
        setBackPreview('');
        setBackImage(null);
      }
    } else {
      setFrontPreview('');
      setBackPreview('');
      setFrontImage(null);
      setBackImage(null);
    }
  };
  
  // Handle front image upload for listing mode
  const handleFrontImageChange = (file: File | null) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setCropImageSrc(previewUrl);
    setCropSide('front');
    setShowCropper(true);
  };

  const hasInsufficientBalance = walletBalance !== null && walletBalance < pricing.total;

  const getCategoryIcon = () => {
    const cat = GRADING_CATEGORIES.find(c => c.id === category);
    return cat?.icon || '🎴';
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>AI Card Grading | CardBoom</title>
        <meta name="description" content="Get your trading cards graded with AI in under 24 hours." />
      </Helmet>
      <Header cartCount={cartItems.length} onCartClick={() => setIsCartOpen(true)} />
      <CartDrawer items={cartItems} isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} onRemoveItem={(id) => setCartItems(items => items.filter(item => item.id !== id))} />
      
      <main className="container mx-auto px-4 pt-20 pb-24 max-w-2xl">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          size="sm"
          className="mb-3 -ml-2 h-8 text-sm" 
          onClick={() => step === 'photos' ? navigate('/grading') : handleBack()}
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        {/* Progress Bar */}
        {step !== 'success' && (
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              {steps.map((s, i) => (
                <span 
                  key={s.key} 
                  className={cn(
                    'text-xs font-medium transition-colors',
                    i <= currentStepIndex ? 'text-primary' : 'text-muted-foreground/50'
                  )}
                >
                  {s.label}
                </span>
              ))}
            </div>
            <Progress value={progress} className="h-1" />
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* PHOTOS STEP */}
          {step === 'photos' && (
            <motion.div key="photos" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
              
              {/* Mode Selector - New Card vs Existing Listing */}
              <Tabs value={gradeMode} onValueChange={(v) => setGradeMode(v as 'new' | 'listing')} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="new" className="gap-2">
                    <Camera className="w-4 h-4" />
                    New Card
                  </TabsTrigger>
                  <TabsTrigger value="listing" className="gap-2">
                    <Package className="w-4 h-4" />
                    My Listing
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="listing" className="mt-4">
                  <Card className="border-border/50">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground mb-3">
                        Select a listing to grade. If it's missing front or back photos, you can upload them below.
                      </p>
                      <ListingSelector 
                        onSelect={handleListingSelect}
                        selectedListing={selectedListing}
                      />
                      
                      {/* Show image upload for selected listing */}
                      {selectedListing && (
                        <div className="mt-4 grid grid-cols-2 gap-4">
                          {/* Front Image */}
                          <div>
                            <p className="text-xs text-muted-foreground mb-2 font-medium">FRONT</p>
                            <input 
                              ref={frontInputRef} 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => handleFrontImageChange(e.target.files?.[0] || null)} 
                            />
                            <button
                              onClick={() => !frontPreview && frontInputRef.current?.click()}
                              className={cn(
                                'w-full aspect-[3/4] rounded-xl border-2 transition-all flex flex-col items-center justify-center overflow-hidden',
                                frontPreview 
                                  ? 'border-gain p-0' 
                                  : 'border-dashed border-amber-500 hover:border-amber-400 bg-amber-500/5'
                              )}
                            >
                              {frontPreview ? (
                                <div className="relative w-full h-full group">
                                  <img src={frontPreview} alt="Front" className="w-full h-full object-cover" />
                                  <div 
                                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                    onClick={(e) => { e.stopPropagation(); setFrontPreview(''); setFrontImage(null); }}
                                  >
                                    <span className="text-white text-xs">Replace</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center p-3">
                                  <Camera className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                                  <span className="text-xs text-amber-500 font-medium">Upload Front</span>
                                </div>
                              )}
                            </button>
                          </div>
                          
                          {/* Back Image - REQUIRED */}
                          <div>
                            <p className="text-xs text-muted-foreground mb-2 font-medium flex items-center gap-1">
                              BACK <span className="text-destructive">*</span>
                            </p>
                            <input 
                              ref={backInputRef} 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => handleBackImageChange(e.target.files?.[0] || null)} 
                            />
                            <button
                              onClick={() => !backPreview && backInputRef.current?.click()}
                              className={cn(
                                'w-full aspect-[3/4] rounded-xl border-2 transition-all flex flex-col items-center justify-center overflow-hidden',
                                backPreview 
                                  ? 'border-gain p-0' 
                                  : 'border-dashed border-destructive hover:border-destructive/80 bg-destructive/5'
                              )}
                            >
                              {backPreview ? (
                                <div className="relative w-full h-full group">
                                  <img src={backPreview} alt="Back" className="w-full h-full object-cover" />
                                  <div 
                                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                    onClick={(e) => { e.stopPropagation(); setBackPreview(''); setBackImage(null); }}
                                  >
                                    <span className="text-white text-xs">Replace</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center p-3">
                                  <AlertCircle className="w-6 h-6 text-destructive mx-auto mb-2" />
                                  <span className="text-xs text-destructive font-medium">Upload Back</span>
                                  <p className="text-[10px] text-muted-foreground mt-1">Required for grading</p>
                                </div>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="new" className="mt-4">
                  {/* AI Scanner for Front */}
                  {!frontPreview && (
                    <CardScannerUpload
                      mode="grading"
                      onScanComplete={(scanAnalysis, file, previewUrl) => {
                        setCardAnalysis(scanAnalysis);
                        
                        // Auto-detect category
                        if (scanAnalysis.category) {
                          const matchedCategory = GRADING_CATEGORIES.find(
                            c => c.id.toLowerCase() === scanAnalysis.category?.toLowerCase()
                          );
                          if (matchedCategory) setCategory(matchedCategory.id);
                        }
                        
                        // Open cropper for front image
                        setCropImageSrc(previewUrl);
                        setCropSide('front');
                        setShowCropper(true);
                        
                        // Store temp data for after cropping
                        setFrontImage(file);
                        
                        if (scanAnalysis.needsReview) {
                          setShowReviewModal(true);
                        }
                      }}
                      className="border-0 shadow-none bg-transparent p-0"
                    />
                  )}

              {/* Front uploaded - show preview and back upload */}
              {frontPreview && (
                <Card className="overflow-hidden border-border/50">
                  <CardContent className="p-4 space-y-4">
                    {/* Card Detection Info */}
                    {cardAnalysis?.detected && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-gain/10 border border-gain/20">
                        <CheckCircle2 className="w-5 h-5 text-gain flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {cardAnalysis.cardNameEnglish || cardAnalysis.cardName || 'Card Detected'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {cardAnalysis.setName || getCategoryIcon() + ' ' + category}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          {Math.round((cardAnalysis.confidence || 0.9) * 100)}%
                        </Badge>
                      </div>
                    )}

                    {/* Estimated Value Preview - Ungraded + Graded Potential */}
                    {cardAnalysis?.detected && (
                      <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Market Value Estimates</p>
                        
                        {/* Ungraded (Raw) Price */}
                        <div className="p-3 rounded-lg bg-background border border-border">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Raw (Ungraded)</span>
                            {cardAnalysis.pricing?.priceConfidence && (
                              <Badge variant="outline" className="text-[10px] h-5">
                                {cardAnalysis.pricing.priceConfidence}
                              </Badge>
                            )}
                          </div>
                          <p className="text-2xl font-bold text-foreground mt-1">
                            {cardAnalysis.pricing?.lowestActive 
                              ? `$${cardAnalysis.pricing.lowestActive.toLocaleString()}`
                              : cardAnalysis.pricing?.medianSold
                                ? `$${cardAnalysis.pricing.medianSold.toLocaleString()}`
                                : cardAnalysis.matchedMarketItem?.current_price
                                  ? `$${cardAnalysis.matchedMarketItem.current_price.toLocaleString()}`
                                  : 'Insufficient data'
                            }
                          </p>
                        </div>

                        {/* Graded Potential Prices */}
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">After Grading (Estimated)</p>
                          <div className="grid grid-cols-3 gap-2">
                            {(() => {
                              const basePrice = cardAnalysis.pricing?.medianSold 
                                || cardAnalysis.pricing?.lowestActive 
                                || cardAnalysis.matchedMarketItem?.current_price 
                                || 0;
                              
                              // Grade multipliers based on market data patterns
                              const gradeEstimates = [
                                { grade: 'CBGI 8', multiplier: 1.5, color: 'bg-amber-500/10 border-amber-500/20 text-amber-600' },
                                { grade: 'CBGI 9', multiplier: 2.0, color: 'bg-blue-500/10 border-blue-500/20 text-blue-600' },
                                { grade: 'CBGI 10', multiplier: 3.5, color: 'bg-gain/10 border-gain/20 text-gain' },
                              ];
                              
                              return gradeEstimates.map(({ grade, multiplier, color }) => (
                                <div key={grade} className={`text-center p-2 rounded-lg border ${color}`}>
                                  <p className="text-[10px] font-medium opacity-80">{grade}</p>
                                  <p className="text-sm font-bold">
                                    {basePrice > 0 
                                      ? `$${Math.round(basePrice * multiplier).toLocaleString()}`
                                      : '—'
                                    }
                                  </p>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
                          <span>
                            {cardAnalysis.pricing?.salesCount 
                              ? `Based on ${cardAnalysis.pricing.salesCount} recent sales`
                              : 'Market estimates'
                            }
                          </span>
                          {cardAnalysis.pricing?.trend7d !== undefined && cardAnalysis.pricing.trend7d !== 0 && (
                            <span className={cardAnalysis.pricing.trend7d > 0 ? 'text-gain' : 'text-loss'}>
                              {cardAnalysis.pricing.trend7d > 0 ? '↑' : '↓'} {Math.abs(cardAnalysis.pricing.trend7d).toFixed(1)}% 7d
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Image Previews - Fixed layout */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Front Preview */}
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground mb-2 font-medium">FRONT</p>
                        <div className="aspect-[3/4] rounded-xl border-2 border-gain overflow-hidden relative">
                          <img src={frontPreview} alt="Front" className="w-full h-full object-cover" />
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-gain/90 text-gain-foreground text-[10px] h-5 gap-0.5">
                              <CheckCircle2 className="w-3 h-3" /> AI
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Back Upload */}
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground mb-2 font-medium">BACK</p>
                        <input 
                          ref={backInputRef} 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleBackImageChange(e.target.files?.[0] || null)} 
                        />
                        <motion.button 
                          whileTap={{ scale: 0.98 }}
                          onClick={() => backInputRef.current?.click()}
                          className={cn(
                            'w-full aspect-[3/4] rounded-xl border-2 transition-all flex flex-col items-center justify-center overflow-hidden',
                            backPreview 
                              ? 'border-gain p-0' 
                              : 'border-dashed border-border hover:border-primary/50 bg-muted/30'
                          )}
                        >
                          {backPreview ? (
                            <img src={backPreview} alt="Back" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center p-4">
                              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                                <Camera className="w-6 h-6 text-primary" />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                Tap to add back
                              </span>
                            </div>
                          )}
                        </motion.button>
                      </div>
                    </div>

                    {/* Continue / Confirm Card Details Button - always visible */}
                    <div className="pt-2 border-t border-border">
                      <Button 
                        className="w-full h-14 rounded-xl gap-2 text-base font-semibold shadow-lg" 
                        size="lg"
                        disabled={!frontImage || !backImage} 
                        onClick={handleNext}
                      >
                        {backImage ? (
                          <>
                            <CheckCircle2 className="w-5 h-5" />
                            Confirm Card Details
                          </>
                        ) : (
                          <>
                            <Camera className="w-5 h-5" />
                            Add Back Image to Continue
                          </>
                        )}
                      </Button>
                      {!backImage && frontImage && (
                        <p className="text-xs text-center text-muted-foreground mt-2">
                          Upload back image to proceed
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
                </TabsContent>
              </Tabs>
            </motion.div>
          )}

          {/* OPTIONS STEP */}
          {step === 'options' && (
            <motion.div key="options" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
              <Card className="border-border/50 overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-b border-border/50">
                  <h2 className="font-semibold">Grading Options</h2>
                  <p className="text-xs text-muted-foreground">CardBoom Index Certification</p>
                </div>
                <CardContent className="p-4 space-y-5">
                  {/* Quantity */}
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Cards to Grade</Label>
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 rounded-full"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="text-xl font-bold w-8 text-center">{quantity}</span>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 rounded-full"
                        onClick={() => setQuantity(quantity + 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {quantity >= BULK_DISCOUNT_THRESHOLD && (
                    <div className="flex items-center gap-2 text-sm text-primary font-medium bg-primary/10 rounded-lg p-2">
                      <Percent className="w-4 h-4" />
                      {BULK_DISCOUNT_PERCENT}% bulk discount!
                    </div>
                  )}

                  {/* Speed Tier */}
                  <SpeedTierSelector
                    value={speedTier}
                    onChange={setSpeedTier}
                  />

                  {/* Delivery */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Delivery</Label>
                    <RadioGroup value={deliveryOption} onValueChange={(v) => setDeliveryOption(v as DeliveryOption)} className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'shipping', icon: Truck, label: 'Ship to me' },
                        { value: 'vault', icon: Vault, label: 'Vault Storage' }
                      ].map(opt => (
                        <Label 
                          key={opt.value}
                          htmlFor={opt.value} 
                          className={cn(
                            'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all',
                            deliveryOption === opt.value ? 'border-primary bg-primary/5' : 'border-border'
                          )}
                        >
                          <RadioGroupItem value={opt.value} id={opt.value} className="sr-only" />
                          <opt.icon className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">{opt.label}</span>
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>

                  {/* Premium Protection Bundle */}
                  <div className={cn(
                    "flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer",
                    includeProtection ? "border-primary bg-primary/5" : "border-border bg-muted/30"
                  )} onClick={() => setIncludeProtection(!includeProtection)}>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        includeProtection ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Premium Protection Bundle</p>
                        <p className="text-xs text-muted-foreground">Hologram seal + Sleeve + CBGI Tag</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={includeProtection ? "default" : "secondary"} className="font-bold">
                        +${PROTECTION_BUNDLE_PRICE}
                      </Badge>
                      <Switch checked={includeProtection} onCheckedChange={setIncludeProtection} />
                    </div>
                  </div>

                  {/* Grade & Flip */}
                  <GradeAndFlipToggle
                    enabled={autoListEnabled}
                    onEnabledChange={setAutoListEnabled}
                    suggestedPrice={autoListPrice || undefined}
                    customPrice={autoListPrice || undefined}
                    onCustomPriceChange={setAutoListPrice}
                  />

                  {/* Credits */}
                  <GradingCreditsDisplay userId={userId} />

                  {/* Tip */}
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-amber-600 dark:text-amber-400">Pro tip:</span> Grade cards worth $50+ for maximum value impact.
                    </p>
                  </div>

                  <Button className="w-full h-12 rounded-full gap-2 text-base font-medium" onClick={handleNext}>
                    Continue <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* REVIEW STEP */}
          {step === 'review' && (
            <motion.div key="review" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
              <Card className="border-border/50 overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-b border-border/50">
                  <h2 className="font-semibold">Review Order</h2>
                </div>
                <CardContent className="p-4 space-y-4">
                  {/* Images */}
                  <div className="flex gap-3 justify-center">
                    <div className="w-24">
                      <p className="text-[10px] text-muted-foreground mb-1 text-center">FRONT</p>
                      <img src={frontPreview} alt="Front" className="w-full aspect-[3/4] object-cover rounded-lg border" />
                    </div>
                    <div className="w-24">
                      <p className="text-[10px] text-muted-foreground mb-1 text-center">BACK</p>
                      <img src={backPreview} alt="Back" className="w-full aspect-[3/4] object-cover rounded-lg border" />
                    </div>
                  </div>
                  
                  {/* Order Details */}
                  <div className="p-4 rounded-xl bg-muted/50 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cards</span>
                      <span className="font-medium">{quantity}x</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Speed</span>
                      <span className="font-medium capitalize">{speedTier} ({pricing.daysMin}-{pricing.daysMax} days)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivery</span>
                      <span className="font-medium flex items-center gap-1">
                        {deliveryOption === 'shipping' ? <Truck className="w-3 h-3" /> : <Vault className="w-3 h-3" />}
                        {deliveryOption === 'shipping' ? 'Shipping' : 'Vault'}
                      </span>
                    </div>
                    {includeProtection && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Protection Bundle</span>
                        <span className="font-medium text-primary">+${PROTECTION_BUNDLE_PRICE}/card</span>
                      </div>
                    )}
                    {autoListEnabled && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Grade & Flip</span>
                        <span className="font-medium text-gain">Enabled ✓</span>
                      </div>
                    )}
                    <div className="h-px bg-border my-1" />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>${pricing.subtotal.toFixed(2)}</span>
                    </div>
                    {pricing.hasBulkDiscount && (
                      <div className="flex justify-between text-primary">
                        <span>Bulk discount</span>
                        <span>-${pricing.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="h-px bg-border my-1" />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">${pricing.total.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="p-2 rounded-lg bg-primary/5 text-center">
                    <p className="text-xs">⏱️ Turnaround: <span className="font-semibold">{pricing.daysMin}-{pricing.daysMax} days</span></p>
                  </div>
                  
                  <Button className="w-full h-12 rounded-full gap-2 text-base font-medium" onClick={handleNext}>
                    Pay ${pricing.total.toFixed(2)} <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* PAYMENT STEP */}
          {step === 'payment' && (
            <motion.div key="payment" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
              <Card className="border-border/50 overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-b border-border/50 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold">Payment</h2>
                </div>
                <CardContent className="p-4 space-y-4">
                  <div className="p-4 rounded-xl bg-muted/50 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Wallet Balance</span>
                      <span className="font-bold">${walletBalance?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Grading ({quantity}x)</span>
                      <span>${pricing.subtotal.toFixed(2)}</span>
                    </div>
                    {pricing.hasBulkDiscount && (
                      <div className="flex justify-between text-sm text-primary">
                        <span>Discount</span>
                        <span>-${pricing.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="h-px bg-border" />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">${pricing.total.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {hasInsufficientBalance && (
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                      <div>
                        <p className="font-medium text-destructive text-sm">Insufficient Balance</p>
                        <p className="text-xs text-muted-foreground">Need ${(pricing.total - (walletBalance || 0)).toFixed(2)} more</p>
                        <Button variant="outline" size="sm" className="mt-2 h-7 text-xs" onClick={() => navigate('/wallet')}>Top Up</Button>
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    className="w-full h-12 rounded-full gap-2 text-base font-medium" 
                    disabled={isSubmitting || hasInsufficientBalance} 
                    onClick={handleSubmit}
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                    ) : (
                      <>Pay & Submit <Check className="w-4 h-4" /></>
                    )}
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground">Results in {pricing.daysMin}-{pricing.daysMax} days</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* SUCCESS STEP */}
          {step === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border-border/50 text-center overflow-hidden">
                <CardContent className="pt-8 pb-6 px-4">
                  <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    transition={{ type: "spring", delay: 0.2 }} 
                    className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
                      isAdmin 
                        ? "bg-gradient-to-br from-amber-400 to-amber-600" 
                        : "bg-gradient-to-br from-primary to-blue-500"
                    )}
                  >
                    {isAdmin ? <Zap className="w-8 h-8 text-white" /> : <Sparkles className="w-8 h-8 text-white" />}
                  </motion.div>
                  <h2 className="text-xl font-bold mb-1">
                    {isAdmin ? 'Grading Complete!' : 'Order Submitted!'}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {isAdmin 
                      ? 'Your card has been graded instantly' 
                      : 'Your grading is queued for processing'}
                  </p>
                  
                  {isAdmin ? (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-4">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span className="font-semibold text-amber-600 text-sm">Admin Instant Grading</span>
                      </div>
                      <p className="text-lg font-bold">Results Ready Now</p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 mb-4">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-primary text-sm">Est. Completion</span>
                      </div>
                      <p className="text-2xl font-bold">{pricing.daysMin}-{pricing.daysMax} Days</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        💡 Upgrade to Pro for faster grading
                      </p>
                    </div>
                  )}
                  
                  <Badge variant="secondary" className="mb-4">Order: {createdOrder?.id?.slice(0, 8)}...</Badge>
                  
                  <div className="space-y-2">
                    <Button className="w-full h-11 rounded-full" onClick={() => navigate(`/grading/orders/${createdOrder?.id}`)}>
                      View Order
                    </Button>
                    <Button variant="outline" className="w-full h-11 rounded-full" onClick={() => navigate('/grading/orders')}>
                      All Orders
                    </Button>
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
          const matchedCategory = GRADING_CATEGORIES.find(
            c => c.id.toLowerCase() === reviewedData.category?.toLowerCase()
          );
          if (matchedCategory) setCategory(matchedCategory.id);
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
          toast({ title: 'Card Confirmed', description: 'Now upload the back' });
        }}
      />
      
      {/* Image Cropper */}
      <ImageCropper
        open={showCropper}
        imageSrc={cropImageSrc}
        onClose={() => setShowCropper(false)}
        onCropComplete={handleCropComplete}
        aspect={2.5 / 3.5}
      />
    </div>
  );
}
