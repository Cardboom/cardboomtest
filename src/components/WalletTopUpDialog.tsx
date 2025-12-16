import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface WalletTopUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const TOPUP_FEE_PERCENT = 6.5;

export const WalletTopUpDialog = ({ open, onOpenChange, onSuccess }: WalletTopUpDialogProps) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'amount' | 'card' | '3ds'>('amount');
  const [threeDSContent, setThreeDSContent] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Card details
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expireMonth, setExpireMonth] = useState('');
  const [expireYear, setExpireYear] = useState('');
  const [cvc, setCvc] = useState('');

  // Buyer details
  const [buyerName, setBuyerName] = useState('');
  const [buyerSurname, setBuyerSurname] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerCity, setBuyerCity] = useState('');

  const numAmount = parseFloat(amount) || 0;
  const fee = numAmount * (TOPUP_FEE_PERCENT / 100);
  const total = numAmount + fee;

  const presetAmounts = [50, 100, 250, 500, 1000];

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep('amount');
      setThreeDSContent(null);
      setCardNumber('');
      setCvc('');
    }
  }, [open]);

  const handleAmountContinue = () => {
    if (numAmount < 10) {
      toast.error('Minimum top-up is $10');
      return;
    }
    setStep('card');
  };

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cardHolderName || !cardNumber || !expireMonth || !expireYear || !cvc) {
      toast.error('Please fill all card details');
      return;
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

      const { data, error } = await supabase.functions.invoke('iyzico-init-3ds', {
        body: {
          amount: numAmount,
          cardHolderName,
          cardNumber: cardNumber.replace(/\s/g, ''),
          expireMonth,
          expireYear: '20' + expireYear,
          cvc,
          buyerName,
          buyerSurname,
          buyerEmail: session.user.email,
          buyerPhone: buyerPhone || '+905000000000',
          buyerAddress: buyerAddress || 'Not provided',
          buyerCity: buyerCity || 'Istanbul',
          buyerCountry: 'Turkey',
          buyerZipCode: '34000',
          buyerIp: '127.0.0.1'
        }
      });

      if (error) throw error;

      if (data.success && data.threeDSHtmlContent) {
        // Decode base64 HTML content
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Render 3DS iframe
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={step === '3ds' ? 'sm:max-w-2xl h-[600px]' : 'sm:max-w-md'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {step === 'amount' && 'Add Funds to Wallet'}
            {step === 'card' && 'Enter Payment Details'}
            {step === '3ds' && '3D Secure Verification'}
          </DialogTitle>
          <DialogDescription>
            {step === 'amount' && 'Top up your wallet with credit card. 6.5% processing fee applies.'}
            {step === 'card' && 'Enter your card details securely.'}
            {step === '3ds' && 'Complete the 3D secure verification with your bank.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'amount' && (
          <div className="space-y-6">
            {/* Preset amounts */}
            <div>
              <Label className="mb-2 block">Quick Select</Label>
              <div className="flex flex-wrap gap-2">
                {presetAmounts.map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant={numAmount === preset ? 'default' : 'outline'}
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
              <Label htmlFor="amount">Custom Amount (USD)</Label>
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
            {numAmount > 0 && (
              <div className="p-4 rounded-lg bg-muted/50 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span>{formatCurrency(numAmount)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Processing Fee (6.5%)</span>
                  <span>{formatCurrency(fee)}</span>
                </div>
                <div className="flex justify-between font-medium text-foreground border-t border-border pt-2">
                  <span>Total Charge</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleAmountContinue} disabled={numAmount < 10}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 'card' && (
          <form onSubmit={handleCardSubmit} className="space-y-4">
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
              <div className="flex justify-between font-medium text-foreground">
                <span>Total to Pay</span>
                <span>{formatCurrency(total)}</span>
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
                {loading ? 'Processing...' : `Pay ${formatCurrency(total)}`}
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
  );
};
