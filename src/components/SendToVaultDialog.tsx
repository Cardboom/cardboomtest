import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Vault, Package, CheckCircle, AlertCircle, Copy, Camera, Shield, Truck, Gift, Sparkles, Lock, ScanLine, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { CardScannerUpload } from './CardScannerUpload';
import { CardReviewModal, ReviewedCardData } from './card-scan/CardReviewModal';
import { CardAnalysis } from '@/hooks/useCardAnalysis';

interface SendToVaultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WAREHOUSE_ADDRESS = {
  company: 'BRAINBABY BİLİŞİM ANONİM ŞİRKETİ',
  name: 'CardBoom Vault',
  address: 'İran Caddesi 55/9',
  district: 'Gaziosmanpaşa Mahallesi',
  city: 'Çankaya, Ankara',
  country: 'Türkiye',
  postalCode: '06700',
};

type VaultStep = 'scan' | 'review' | 'confirm' | 'shipping';

export const SendToVaultDialog = ({ open, onOpenChange }: SendToVaultDialogProps) => {
  const { formatPrice } = useCurrency();
  const [step, setStep] = useState<VaultStep>('scan');
  const [submitting, setSubmitting] = useState(false);
  const [shippingRate, setShippingRate] = useState({ try: 50, usd: 5 });
  const [isFirstCard, setIsFirstCard] = useState(false);
  
  // Scan data
  const [scanAnalysis, setScanAnalysis] = useState<CardAnalysis | null>(null);
  const [frontImageFile, setFrontImageFile] = useState<File | null>(null);
  const [frontImagePreview, setFrontImagePreview] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  
  // Final confirmed data
  const [confirmedData, setConfirmedData] = useState<ReviewedCardData | null>(null);
  const [scanSessionId, setScanSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchShippingRates();
      checkFirstCardEligibility();
    }
  }, [open]);

  const fetchShippingRates = async () => {
    const { data } = await supabase
      .from('vault_shipping_rates')
      .select('*')
      .eq('direction', 'to_vault')
      .eq('is_active', true)
      .single();
    
    if (data) {
      setShippingRate({ try: data.rate_try, usd: data.rate_usd });
    }
  };

  const checkFirstCardEligibility = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_vault_card_sent')
      .eq('id', session.user.id)
      .single();

    setIsFirstCard(!profile?.first_vault_card_sent);
  };

  const handleScanComplete = (analysis: CardAnalysis, imageFile: File, previewUrl: string) => {
    setScanAnalysis(analysis);
    setFrontImageFile(imageFile);
    setFrontImagePreview(previewUrl);
    
    // Show review modal for user confirmation
    setShowReviewModal(true);
  };

  const handleReviewConfirm = async (reviewedData: ReviewedCardData) => {
    setConfirmedData(reviewedData);
    setShowReviewModal(false);
    
    // Create scan session in database
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in first');
        return;
      }

      // Upload front image to storage
      const frontImagePath = `${session.user.id}/vault-scans/${Date.now()}-front.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(frontImagePath, frontImageFile!);

      if (uploadError) throw uploadError;

      const { data: { publicUrl: frontPublicUrl } } = supabase.storage
        .from('listing-images')
        .getPublicUrl(frontImagePath);

      // Create scan session record
      const { data: scanSession, error: scanError } = await supabase
        .from('vault_scan_sessions')
        .insert({
          user_id: session.user.id,
          front_image_url: frontPublicUrl,
          ai_detected_name: reviewedData.cardName,
          ai_detected_set: reviewedData.setName,
          ai_detected_number: reviewedData.cardNumber,
          ai_detected_category: reviewedData.category,
          ai_confidence: reviewedData.confidence,
          scan_status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (scanError) throw scanError;

      setScanSessionId(scanSession.id);
      setStep('confirm');
    } catch (error) {
      console.error('Error creating scan session:', error);
      toast.error('Failed to save scan. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!scanSessionId || !confirmedData) {
      toast.error('Scan required. Please scan your card first.');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in first');
        return;
      }

      // Get the front image URL from scan session
      const { data: scanSession } = await supabase
        .from('vault_scan_sessions')
        .select('front_image_url')
        .eq('id', scanSessionId)
        .single();

      // Create vault item linked to scan session
      const { data: vaultItem, error } = await supabase
        .from('vault_items')
        .insert({
          owner_id: session.user.id,
          title: confirmedData.cardName || 'Unknown Card',
          description: `${confirmedData.setName || ''} ${confirmedData.cardNumber || ''}`.trim() || 'Scanned card',
          category: confirmedData.category || 'tcg',
          condition: 'Pending Verification',
          status: 'pending_shipment',
          shipping_fee_paid: shippingRate.usd,
          scan_session_id: scanSessionId,
          ai_detected_name: confirmedData.cardName,
          ai_detected_set: confirmedData.setName,
          ai_detected_number: confirmedData.cardNumber,
          ai_confidence: confirmedData.confidence,
          scan_completed_at: new Date().toISOString(),
          image_url: scanSession?.front_image_url,
        })
        .select()
        .single();

      if (error) throw error;

      // Update scan session with vault_item_id
      await supabase
        .from('vault_scan_sessions')
        .update({ vault_item_id: vaultItem.id })
        .eq('id', scanSessionId);

      // Log the action
      await supabase.from('vault_audit_log').insert({
        user_id: session.user.id,
        action: 'vault_item_created',
        vault_item_id: vaultItem.id,
        scan_session_id: scanSessionId,
        details: {
          card_name: confirmedData.cardName,
          set_name: confirmedData.setName,
          confidence: confirmedData.confidence,
        },
      });

      toast.success('Vault request submitted! Ship your card to the address shown.');
      setStep('shipping');
    } catch (error) {
      console.error('Error creating vault request:', error);
      toast.error('Failed to submit vault request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyAddress = () => {
    const fullAddress = `${WAREHOUSE_ADDRESS.company}\n${WAREHOUSE_ADDRESS.name}\n${WAREHOUSE_ADDRESS.address}\n${WAREHOUSE_ADDRESS.district}\n${WAREHOUSE_ADDRESS.city}, ${WAREHOUSE_ADDRESS.country} ${WAREHOUSE_ADDRESS.postalCode}`;
    navigator.clipboard.writeText(fullAddress);
    toast.success('Address copied to clipboard');
  };

  const handleClose = () => {
    setStep('scan');
    setScanAnalysis(null);
    setFrontImageFile(null);
    setFrontImagePreview(null);
    setConfirmedData(null);
    setScanSessionId(null);
    onOpenChange(false);
  };

  const stepIndicators = [
    { id: 'scan', num: 1, label: 'Scan Card', icon: ScanLine },
    { id: 'confirm', num: 2, label: 'Confirm', icon: CheckCircle },
    { id: 'shipping', num: 3, label: 'Ship', icon: Truck },
  ];

  const currentStepIndex = step === 'scan' ? 0 : step === 'review' ? 0 : step === 'confirm' ? 1 : 2;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Vault className="h-5 w-5 text-primary" />
              Send Card to Vault
            </DialogTitle>
            <DialogDescription className="flex items-center gap-1.5">
              <Lock className="h-3 w-3" />
              Only you can see cards in your Vault
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center justify-between py-4 border-b border-border/50">
            {stepIndicators.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1">
                <div className={`flex items-center gap-2 ${currentStepIndex >= i ? 'text-primary' : 'text-muted-foreground'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStepIndex > i ? 'bg-primary text-primary-foreground' : 
                    currentStepIndex === i ? 'bg-primary/20 border-2 border-primary text-primary' : 
                    'bg-muted text-muted-foreground'
                  }`}>
                    {currentStepIndex > i ? <CheckCircle className="h-4 w-4" /> : s.num}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">{s.label}</span>
                </div>
                {i < stepIndicators.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${currentStepIndex > i ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>

          {/* First Card Bonus Banner */}
          {step === 'scan' && isFirstCard && (
            <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-600/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <Gift className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                      First Card Bonus! <Sparkles className="h-4 w-4" />
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Send your first card worth ₺1,000+ to earn <span className="font-bold text-amber-600">₺50 bonus</span> credit!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step: Scan */}
          {step === 'scan' && (
            <div className="space-y-4 py-4">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Camera className="h-4 w-4 text-primary" />
                    Scan Your Card
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Upload a clear photo of your card's front. Our AI will identify it automatically.
                  </p>
                </CardContent>
              </Card>

              <CardScannerUpload 
                onScanComplete={handleScanComplete}
                mode="grading"
              />

              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Vaulted – Private Storage</p>
                  <p>Your vault items are only visible to you. They won't appear in search, marketplace, or public profiles.</p>
                </div>
              </div>
            </div>
          )}

          {/* Step: Confirm */}
          {step === 'confirm' && confirmedData && (
            <div className="space-y-4 py-4">
              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    Card Identified
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Review the details below before submitting.
                  </p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                {frontImagePreview && (
                  <div className="aspect-[3/4] rounded-lg overflow-hidden border bg-muted">
                    <img src={frontImagePreview} alt="Card front" className="w-full h-full object-contain" />
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Card Name</p>
                    <p className="font-medium">{confirmedData.cardName || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Set</p>
                    <p className="text-sm">{confirmedData.setName || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Card Number</p>
                    <p className="text-sm">{confirmedData.cardNumber || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">AI Confidence</p>
                    <Badge variant={confirmedData.confidence >= 0.75 ? 'default' : 'outline'}>
                      {Math.round((confirmedData.confidence || 0) * 100)}%
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Shipping Fee Info */}
              <Card className="border-blue-500/20 bg-blue-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Truck className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium">Intake Fee</p>
                        <p className="text-xs text-muted-foreground">One-time processing</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">₺{shippingRate.try}</p>
                      <p className="text-xs text-muted-foreground">~${shippingRate.usd} USD</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('scan')} className="flex-1">
                  <X className="h-4 w-4 mr-2" />
                  Rescan
                </Button>
                <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
                  {submitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Confirm & Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step: Shipping */}
          {step === 'shipping' && (
            <div className="space-y-4 py-4">
              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    Request Submitted!
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Ship your card to the address below. Include your CardBoom username in the package.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      <span className="font-medium">Ship To</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleCopyAddress} className="gap-1.5">
                      <Copy className="h-3 w-3" />
                      Copy
                    </Button>
                  </div>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p className="font-medium text-foreground">{WAREHOUSE_ADDRESS.company}</p>
                    <p>{WAREHOUSE_ADDRESS.name}</p>
                    <p>{WAREHOUSE_ADDRESS.address}</p>
                    <p>{WAREHOUSE_ADDRESS.district}</p>
                    <p>{WAREHOUSE_ADDRESS.city}, {WAREHOUSE_ADDRESS.country}</p>
                    <p>{WAREHOUSE_ADDRESS.postalCode}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Important</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Write your CardBoom username inside the package</li>
                    <li>Use tracked shipping for valuable cards</li>
                    <li>Package cards safely in toploaders</li>
                  </ul>
                </div>
              </div>

              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Card Review Modal */}
      <CardReviewModal
        open={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onConfirm={handleReviewConfirm}
        analysis={scanAnalysis}
        imagePreview={frontImagePreview}
      />
    </>
  );
};
