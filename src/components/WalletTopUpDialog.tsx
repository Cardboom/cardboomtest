import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CreditCard, AlertCircle, Loader2, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { useCurrency } from '@/contexts/CurrencyContext';
import { SavedCardsSelector, SavedCard } from '@/components/wallet/SavedCardsSelector';
import { RequireProfileInfoDialog } from '@/components/wallet/RequireProfileInfoDialog';
import { useRequireProfileInfo } from '@/hooks/useRequireProfileInfo';

interface WalletTopUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const FLAT_FEE_USD = 0.5;
// Fee percentages: USD = 6.5%, TRY = tiered by subscription (8%/7%/6%/5.5%)
const USD_FEE_PERCENT = 6.5;
type PaymentCurrency = 'USD' | 'TRY';

export const WalletTopUpDialog = ({ open, onOpenChange, onSuccess }: WalletTopUpDialogProps) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'amount' | 'card' | '3ds'>('amount');
  const [threeDSContent, setThreeDSContent] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [userId, setUserId] = useState<string | undefined>();
  const [paymentCurrency, setPaymentCurrency] = useState<PaymentCurrency>('TRY');
  const [showProfileInfoDialog, setShowProfileInfoDialog] = useState(false);

  const { needsProfileInfo, refetch: refetchProfileInfo } = useRequireProfileInfo();

  const { exchangeRates } = useCurrency();
  const baseRate = exchangeRates.USD_TRY || 45.01; // Default to 45.01 TRY/USD
  // No extra markup on rate - fee is applied separately
  const tryRate = baseRate;

  const { isPro, isLite, isEnterprise } = useSubscription(userId);
  
  // Fee structure: USD = 6.5%, TRY = tiered by subscription (8%/7%/6%/5.5%)
  const getTryFeePercent = () => {
    if (isEnterprise) return 5.5;
    if (isPro) return 6;
    if (isLite) return 7;
    return 8; // Free tier
  };
  
  const TOPUP_FEE_PERCENT = paymentCurrency === 'USD' ? USD_FEE_PERCENT : getTryFeePercent();

  // Saved cards state
  const [selectedCardId, setSelectedCardId] = useState<string | 'new'>('new');
  const [selectedCard, setSelectedCard] = useState<SavedCard | null>(null);

  // Card details for new card
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expireMonth, setExpireMonth] = useState('');
  const [expireYear, setExpireYear] = useState('');
  const [cvc, setCvc] = useState('');
  
  // Save card option
  const [saveCard, setSaveCard] = useState(false);
  const [cardLabel, setCardLabel] = useState('');

  // Buyer details
  const [buyerName, setBuyerName] = useState('');
  const [buyerSurname, setBuyerSurname] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerCity, setBuyerCity] = useState('');

  const numAmountUSD = parseFloat(amount) || 0;
  const percentFee = numAmountUSD * (TOPUP_FEE_PERCENT / 100);
  const feeUSD = percentFee + FLAT_FEE_USD;
  const totalUSD = numAmountUSD + feeUSD;
  const displayTotal = paymentCurrency === 'TRY' ? totalUSD * tryRate : totalUSD;

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUserId(session.user.id);
    };
    fetchUser();
  }, []);

  const presetAmounts = [50, 100, 250, 500, 1000];

  useEffect(() => {
    if (!open) {
      setStep('amount');
      setThreeDSContent(null);
      setCardNumber('');
      setCvc('');
      setSaveCard(false);
      setCardLabel('');
      setSelectedCardId('new');
      setSelectedCard(null);
    }
  }, [open]);

  const handleAmountContinue = () => {
    if (numAmountUSD < 10) {
      toast.error('Minimum top-up is $10');
      return;
    }
    
    // Check if SSO user needs to provide phone/national ID
    if (needsProfileInfo) {
      setShowProfileInfoDialog(true);
      return;
    }
    
    setStep('card');
  };
  
  const handleProfileInfoComplete = () => {
    refetchProfileInfo();
    setStep('card');
  };

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isUsingSavedCard = selectedCardId !== 'new' && selectedCard;
    
    if (!isUsingSavedCard) {
      if (!cardHolderName || !cardNumber || !expireMonth || !expireYear || !cvc) {
        toast.error('Please fill all card details');
        return;
      }
    }

    if (!buyerName || !buyerSurname) {
      toast.error('Please fill your name and surname');
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please login first');
        setLoading(false);
        return;
      }

      const requestBody: Record<string, any> = {
        amountUSD: numAmountUSD,
        paymentCurrency,
        tryRate,
        buyerName,
        buyerSurname,
        buyerEmail: session.user.email,
        buyerPhone: buyerPhone || '+905000000000',
        buyerAddress: buyerAddress || 'Not provided',
        buyerCity: buyerCity || 'Istanbul',
        buyerCountry: 'Turkey',
        buyerZipCode: '34000',
        buyerIp: '127.0.0.1',
      };

      if (isUsingSavedCard) {
        // Use saved card token
        requestBody.cardToken = selectedCard.card_token;
        requestBody.cardUserKey = selectedCard.card_user_key;
        requestBody.useSavedCard = true;
      } else {
        // Use new card details
        requestBody.cardHolderName = cardHolderName;
        requestBody.cardNumber = cardNumber.replace(/\s/g, '');
        requestBody.expireMonth = expireMonth;
        requestBody.expireYear = expireYear;
        requestBody.cvc = cvc;
        requestBody.saveCard = saveCard;
        requestBody.cardLabel = cardLabel || null;
      }

      const { data, error } = await supabase.functions.invoke('iyzico-init-3ds', {
        body: requestBody
      });

      if (error) throw error;

      if (data.success && data.threeDSHtmlContent) {
        const decodedHtml = atob(data.threeDSHtmlContent);
        setThreeDSContent(decodedHtml);
        setStep('3ds');
      } else {
        throw new Error(data.error || 'Failed to initialize payment');
      }

    } catch (err) {
      console.error('Payment error:', err);
      toast.error(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    }
    return v;
  };

  const formatUSD = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPaymentAmount = (amountInUSD: number) => {
    if (paymentCurrency === 'TRY') {
      return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
      }).format(amountInUSD * tryRate);
    }
    return formatUSD(amountInUSD);
  };

  useEffect(() => {
    if (step === '3ds' && threeDSContent && iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(threeDSContent);
        doc.close();
      }
    }
  }, [step, threeDSContent]);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={step === '3ds' ? 'sm:max-w-2xl h-[600px]' : 'sm:max-w-md'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {step === 'amount' && 'Add Funds to Wallet'}
            {step === 'card' && 'Select Payment Method'}
            {step === '3ds' && '3D Secure Verification'}
          </DialogTitle>
          <DialogDescription>
            {step === 'amount' && (
              <>
                Top up your wallet with credit card. {TOPUP_FEE_PERCENT}% + $0.50 processing fee applies.
                {isPro && <span className="text-primary ml-1">(Pro discount applied!)</span>}
              </>
            )}
            {step === 'card' && 'Choose a saved card or enter new card details.'}
            {step === '3ds' && 'Complete the 3D secure verification with your bank.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'amount' && (
          <div className="space-y-6">
            {/* Payment Currency Selection */}
            <div>
              <Label className="mb-2 block">Payment Currency</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={paymentCurrency === 'TRY' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentCurrency('TRY')}
                  className="flex-1"
                >
                  🇹🇷 TRY (Turkish Cards)
                </Button>
                <Button
                  type="button"
                  variant={paymentCurrency === 'USD' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentCurrency('USD')}
                  className="flex-1"
                >
                  🇺🇸 USD (International)
                </Button>
              </div>
              {paymentCurrency === 'TRY' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Rate: 1 USD = {tryRate.toFixed(2)} TRY
                </p>
              )}
            </div>

            {/* Preset amounts */}
            <div>
              <Label className="mb-2 block">Quick Select (Wallet Credit in USD)</Label>
              <div className="flex flex-wrap gap-2">
                {presetAmounts.map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant={numAmountUSD === preset ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAmount(preset.toString())}
                  >
                    ${preset}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom amount */}
            <div>
              <Label htmlFor="amount">Custom Amount (USD wallet credit)</Label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="amount"
                  type="number"
                  min="10"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>

            {/* Fee breakdown */}
            {numAmountUSD > 0 && (
              <div className="p-4 rounded-lg bg-muted/50 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wallet Credit</span>
                  <span>{formatUSD(numAmountUSD)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span className="flex items-center gap-1">
                    Processing Fee ({TOPUP_FEE_PERCENT}%)
                    {isPro && <Crown className="h-3 w-3 text-amber-500" />}
                  </span>
                  <span>{formatUSD(percentFee)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Flat Fee</span>
                  <span>{formatUSD(FLAT_FEE_USD)}</span>
                </div>
                <div className="flex justify-between font-medium text-foreground border-t border-border pt-2">
                  <span>You Pay ({paymentCurrency})</span>
                  <span>{formatPaymentAmount(totalUSD)}</span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleAmountContinue} disabled={numAmountUSD < 10}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 'card' && (
          <form onSubmit={handleCardSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Saved Cards Selector */}
            <SavedCardsSelector
              selectedCardId={selectedCardId}
              onSelectCard={setSelectedCardId}
              onCardSelected={setSelectedCard}
            />

            {/* Buyer Name (always required) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="buyerName">First Name</Label>
                <Input
                  id="buyerName"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="John"
                  required
                />
              </div>
              <div>
                <Label htmlFor="buyerSurname">Last Name</Label>
                <Input
                  id="buyerSurname"
                  value={buyerSurname}
                  onChange={(e) => setBuyerSurname(e.target.value)}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            {/* New Card Form */}
            {selectedCardId === 'new' && (
              <>
                <div>
                  <Label htmlFor="cardHolderName">Name on Card</Label>
                  <Input
                    id="cardHolderName"
                    value={cardHolderName}
                    onChange={(e) => setCardHolderName(e.target.value.toUpperCase())}
                    placeholder="JOHN DOE"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="4111 1111 1111 1111"
                    maxLength={19}
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="expireMonth">Month</Label>
                    <Input
                      id="expireMonth"
                      value={expireMonth}
                      onChange={(e) => setExpireMonth(e.target.value.slice(0, 2))}
                      placeholder="MM"
                      maxLength={2}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="expireYear">Year</Label>
                    <Input
                      id="expireYear"
                      value={expireYear}
                      onChange={(e) => setExpireYear(e.target.value.slice(0, 2))}
                      placeholder="YY"
                      maxLength={2}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvc">CVC</Label>
                    <Input
                      id="cvc"
                      type="password"
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value.slice(0, 4))}
                      placeholder="***"
                      maxLength={4}
                      required
                    />
                  </div>
                </div>

                {/* Save card option */}
                <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="save-card"
                      checked={saveCard}
                      onCheckedChange={(checked) => setSaveCard(!!checked)}
                    />
                    <Label htmlFor="save-card" className="cursor-pointer text-sm">
                      Save this card for future payments
                    </Label>
                  </div>
                  
                  {saveCard && (
                    <div>
                      <Label htmlFor="cardLabel" className="text-xs">Card Label (optional)</Label>
                      <Input
                        id="cardLabel"
                        value={cardLabel}
                        onChange={(e) => setCardLabel(e.target.value)}
                        placeholder="e.g., Personal Visa, Work Card"
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            <div>
              <Label htmlFor="buyerPhone">Phone (optional)</Label>
              <Input
                id="buyerPhone"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                placeholder="+905551234567"
              />
            </div>

            <div className="p-4 rounded-lg bg-muted/50 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Wallet Credit</span>
                <span>{formatUSD(numAmountUSD)}</span>
              </div>
              <div className="flex justify-between font-medium text-foreground">
                <span>Total to Pay ({paymentCurrency})</span>
                <span>{formatPaymentAmount(totalUSD)}</span>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Your payment is secured with 3D Secure authentication. You'll be redirected to your bank for verification.
              </p>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep('amount')}>
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {loading ? 'Processing...' : `Pay ${formatPaymentAmount(totalUSD)}`}
              </Button>
            </div>
          </form>
        )}

        {step === '3ds' && (
          <div className="flex-1 h-[500px]">
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0 rounded-lg"
              title="3D Secure Verification"
              sandbox="allow-scripts allow-same-origin allow-forms allow-top-navigation"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
    
    <RequireProfileInfoDialog
      open={showProfileInfoDialog}
      onOpenChange={setShowProfileInfoDialog}
      onComplete={handleProfileInfoComplete}
    />
    </>
  );
};
