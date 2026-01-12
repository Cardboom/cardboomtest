import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Vault, Package, MapPin, CheckCircle, AlertCircle, Copy, Camera, Shield, Truck, Gift, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatCategoryName } from '@/lib/categoryFormatter';

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
  phone: '+90 312 XXX XX XX',
};

const categories = ['pokemon', 'mtg', 'yugioh', 'onepiece', 'lorcana', 'nba', 'football', 'figures', 'tcg'];
const conditions = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Fair', 'Poor'];

export const SendToVaultDialog = ({ open, onOpenChange }: SendToVaultDialogProps) => {
  const { t } = useLanguage();
  const { formatPrice, currency } = useCurrency();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [shippingRate, setShippingRate] = useState({ try: 50, usd: 5 });
  const [isFirstCard, setIsFirstCard] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'pokemon',
    condition: 'Near Mint',
    estimatedValue: '',
    estimatedValueTRY: '',
    images: [] as File[],
  });

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

  const estimatedValueTRY = formData.estimatedValueTRY 
    ? parseFloat(formData.estimatedValueTRY) 
    : (parseFloat(formData.estimatedValue) || 0) * 35; // Rough USD to TRY

  const bonusEligible = isFirstCard && estimatedValueTRY >= 1000;

  const handleCopyAddress = () => {
    const fullAddress = `${WAREHOUSE_ADDRESS.company}\n${WAREHOUSE_ADDRESS.name}\n${WAREHOUSE_ADDRESS.address}\n${WAREHOUSE_ADDRESS.district}\n${WAREHOUSE_ADDRESS.city}, ${WAREHOUSE_ADDRESS.country}`;
    navigator.clipboard.writeText(fullAddress);
    toast.success(t.vault?.addressCopied || 'Address copied to clipboard');
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error(t.vault?.enterCardTitle || 'Please enter a card title');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(t.auth?.signIn || 'Please sign in first');
        return;
      }

      const estimatedValue = formData.estimatedValue ? parseFloat(formData.estimatedValue) : null;

      // Create a pending vault item
      const { data: vaultItem, error } = await supabase
        .from('vault_items')
        .insert({
          owner_id: session.user.id,
          title: formData.title,
          description: formData.description || `Pending arrival - ${formData.category}`,
          category: formData.category,
          condition: formData.condition,
          estimated_value: estimatedValue,
          status: 'pending_shipment',
          shipping_fee_paid: shippingRate.usd,
        })
        .select()
        .single();

      if (error) throw error;

      // Check and apply first card bonus
      if (bonusEligible && vaultItem) {
        await supabase.rpc('apply_first_vault_card_bonus', {
          p_user_id: session.user.id,
          p_vault_item_id: vaultItem.id,
          p_estimated_value_try: estimatedValueTRY
        });
        toast.success('🎉 First card bonus of ₺50 applied to your wallet!');
      }

      toast.success(t.vault?.requestSubmitted || 'Vault request submitted! Ship your card to the address shown.');
      setStep(3);
    } catch (error) {
      console.error('Error creating vault request:', error);
      toast.error(t.vault?.submitFailed || 'Failed to submit vault request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setFormData({
      title: '',
      description: '',
      category: 'pokemon',
      condition: 'Near Mint',
      estimatedValue: '',
      estimatedValueTRY: '',
      images: [],
    });
    onOpenChange(false);
  };

  const stepIndicators = [
    { num: 1, label: t.vault?.step1Label || 'Card Details', icon: Camera },
    { num: 2, label: t.vault?.step2Label || 'Package Safely', icon: Package },
    { num: 3, label: t.vault?.step3Label || 'Ship to Vault', icon: Truck },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Vault className="h-5 w-5 text-primary" />
            {t.vault?.title || 'Send Your Card to Vault'}
          </DialogTitle>
          <DialogDescription>
            {t.vault?.subtitle || 'Store your cards securely in our insured facility'}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between py-4 border-b border-border/50">
          {stepIndicators.map((s, i) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className={`flex items-center gap-2 ${step >= s.num ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step > s.num ? 'bg-primary text-primary-foreground' : 
                  step === s.num ? 'bg-primary/20 border-2 border-primary text-primary' : 
                  'bg-muted text-muted-foreground'
                }`}>
                  {step > s.num ? <CheckCircle className="h-4 w-4" /> : s.num}
                </div>
                <span className="text-xs font-medium hidden sm:block">{s.label}</span>
              </div>
              {i < stepIndicators.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${step > s.num ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {/* First Card Bonus Banner */}
        {step === 1 && isFirstCard && (
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

        {/* Step 1: Card Details */}
        {step === 1 && (
          <div className="space-y-4 py-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary" />
                  {t.vault?.step1Title || 'Enter Card Details'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t.vault?.step1Desc || 'Provide information about the card you want to store in the vault.'}
                </p>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <div>
                <Label htmlFor="title">{t.vault?.cardName || 'Card Name'} *</Label>
                <Input
                  id="title"
                  placeholder={t.vault?.cardNamePlaceholder || 'e.g., Charizard Base Set 1st Edition PSA 10'}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t.sell?.category || 'Category'}</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {formatCategoryName(cat)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{t.sell?.condition || 'Condition'}</Label>
                  <Select
                    value={formData.condition}
                    onValueChange={(value) => setFormData({ ...formData, condition: value })}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {conditions.map((cond) => (
                        <SelectItem key={cond} value={cond}>
                          {cond}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="estimatedValue">Estimated Value (USD)</Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="estimatedValue"
                      type="number"
                      placeholder="0.00"
                      value={formData.estimatedValue}
                      onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                      className="pl-7"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="estimatedValueTRY">or in TRY</Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₺</span>
                    <Input
                      id="estimatedValueTRY"
                      type="number"
                      placeholder="0"
                      value={formData.estimatedValueTRY}
                      onChange={(e) => setFormData({ ...formData, estimatedValueTRY: e.target.value })}
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>

              {bonusEligible && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-gain/10 border border-gain/20">
                  <CheckCircle className="h-4 w-4 text-gain" />
                  <span className="text-sm text-gain font-medium">Eligible for ₺50 first card bonus!</span>
                </div>
              )}

              <div>
                <Label htmlFor="description">{t.vault?.additionalNotes || 'Additional Notes'}</Label>
                <Textarea
                  id="description"
                  placeholder={t.vault?.notesPlaceholder || 'Any special instructions or notes about your card...'}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1.5"
                  rows={2}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Packaging Instructions */}
        {step === 2 && (
          <div className="space-y-4 py-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  {t.vault?.step2Title || 'Package Your Card Safely'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t.vault?.step2Desc || 'Follow these instructions to ensure your card arrives safely.'}
                </p>
              </CardContent>
            </Card>

            {/* Shipping Fee Info */}
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Truck className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Shipping Fee</p>
                      <p className="text-xs text-muted-foreground">Paid by sender</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">₺{shippingRate.try}</p>
                    <p className="text-xs text-muted-foreground">~${shippingRate.usd} USD</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Card className="border-accent/30">
                <CardContent className="p-4">
                  <h5 className="font-medium mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-accent" />
                    {t.vault?.packagingGuide || 'Packaging Guide'}
                  </h5>
                  <ol className="text-sm text-muted-foreground space-y-3 list-decimal list-inside">
                    <li className="flex items-start gap-2">
                      <span className="min-w-[20px]">1.</span>
                      <span>{t.vault?.packStep1 || 'Place card in a penny sleeve or soft sleeve'}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="min-w-[20px]">2.</span>
                      <span>{t.vault?.packStep2 || 'Insert sleeved card into a toploader or card saver'}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="min-w-[20px]">3.</span>
                      <span>{t.vault?.packStep3 || 'Secure toploader with painters tape (not on the card!)'}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="min-w-[20px]">4.</span>
                      <span>{t.vault?.packStep4 || 'Place between two pieces of cardboard for rigidity'}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="min-w-[20px]">5.</span>
                      <span>{t.vault?.packStep5 || 'Use a padded envelope or small box for shipping'}</span>
                    </li>
                  </ol>
                </CardContent>
              </Card>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">{t.vault?.important || 'Important'}:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>{t.vault?.importantTip1 || 'Write your CardBoom username inside the package'}</li>
                    <li>{t.vault?.importantTip2 || 'Use tracked shipping for valuable cards'}</li>
                    <li>{t.vault?.importantTip3 || 'Do NOT use rubber bands on cards'}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Shipping Address */}
        {step === 3 && (
          <div className="space-y-4 py-4">
            <div className="text-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gain/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-gain" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t.vault?.requestCreated || 'Request Created!'}</h3>
              <p className="text-muted-foreground text-sm">
                {t.vault?.nowShip || 'Now ship your card to our secure vault facility.'}
              </p>
            </div>

            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium mb-2">{t.vault?.shipToAddress || 'Ship to this address'}:</h4>
                    <div className="text-sm space-y-0.5 bg-background/50 rounded-lg p-3 border border-border/50">
                      <p className="font-semibold text-foreground">{WAREHOUSE_ADDRESS.company}</p>
                      <p className="text-primary font-medium">{WAREHOUSE_ADDRESS.name}</p>
                      <p className="text-muted-foreground">{WAREHOUSE_ADDRESS.address}</p>
                      <p className="text-muted-foreground">{WAREHOUSE_ADDRESS.district}</p>
                      <p className="text-muted-foreground">{WAREHOUSE_ADDRESS.city}, {WAREHOUSE_ADDRESS.country}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 gap-2"
                      onClick={handleCopyAddress}
                    >
                      <Copy className="h-3 w-3" />
                      {t.vault?.copyAddress || 'Copy Address'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-accent/20">
              <CardContent className="p-4">
                <h5 className="font-medium mb-2 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-accent" />
                  {t.vault?.whatsNext || "What's Next?"}
                </h5>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>{t.vault?.nextStep1 || 'Ship your packaged card to the address above'}</li>
                  <li>{t.vault?.nextStep2 || 'We receive and verify your card (3-5 business days)'}</li>
                  <li>{t.vault?.nextStep3 || 'Your card appears in your vault, ready to sell or trade!'}</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          {step === 1 && (
            <>
              <Button variant="outline" onClick={handleClose}>
                {t.common?.cancel || 'Cancel'}
              </Button>
              <Button onClick={() => setStep(2)} disabled={!formData.title.trim()}>
                <Package className="h-4 w-4 mr-2" />
                {t.common?.next || 'Next'}
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                {t.common?.back || 'Back'}
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (t.common?.loading || 'Submitting...') : (t.vault?.confirmSubmit || 'Confirm & Get Address')}
              </Button>
            </>
          )}
          {step === 3 && (
            <Button onClick={handleClose} className="w-full">
              {t.vault?.done || 'Done'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};