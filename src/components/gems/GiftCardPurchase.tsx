import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gift, Send, Check, Loader2, Mail, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrency } from '@/contexts/CurrencyContext';
import { BoomCoinIcon } from '@/components/icons/BoomCoinIcon';

const GIFT_CARD_OPTIONS = [
  { cents: 500, label: '$5', coins: 500 },
  { cents: 1000, label: '$10', coins: 1000 },
  { cents: 2000, label: '$20', coins: 2000 },
  { cents: 5000, label: '$50', coins: 5000 },
  { cents: 10000, label: '$100', coins: 10000 },
  { cents: 100000, label: '$1,000', coins: 100000 },
];

interface GiftCardPurchaseProps {
  userBalance: number;
  onPurchaseComplete?: () => void;
}

export function GiftCardPurchase({ userBalance, onPurchaseComplete }: GiftCardPurchaseProps) {
  const [selectedAmount, setSelectedAmount] = useState<typeof GIFT_CARD_OPTIONS[0] | null>(null);
  const [recipientType, setRecipientType] = useState<'email' | 'phone'>('email');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchasedCode, setPurchasedCode] = useState<string | null>(null);
  const { formatPrice } = useCurrency();

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters except +
    const cleaned = value.replace(/[^\d+]/g, '');
    // Ensure it starts with + if it has country code
    if (cleaned.length > 0 && !cleaned.startsWith('+')) {
      return '+' + cleaned;
    }
    return cleaned;
  };

  const handlePurchase = async () => {
    if (!selectedAmount) return;
    
    if (userBalance < selectedAmount.cents) {
      toast.error('Insufficient balance', { description: 'Please top up your wallet first' });
      return;
    }

    setIsPurchasing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's wallet
      const { data: wallet, error: walletFetchError } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', user.id)
        .single();

      if (walletFetchError || !wallet) {
        throw new Error('Wallet not found. Please contact support.');
      }

      if (Number(wallet.balance) * 100 < selectedAmount.cents) {
        throw new Error('Insufficient wallet balance. Please top up first.');
      }

      // Create gift card first
      const { data: giftCard, error: giftError } = await supabase
        .from('gem_gift_cards')
        .insert({
          sender_id: user.id,
          recipient_email: recipientType === 'email' && recipientEmail ? recipientEmail : null,
          recipient_phone: recipientType === 'phone' && recipientPhone ? formatPhoneNumber(recipientPhone) : null,
          denomination_cents: selectedAmount.cents,
          gem_amount: selectedAmount.coins,
          message: message || null,
        })
        .select('id, code')
        .single();

      if (giftError) throw giftError;

      // Add ledger entry for the deduction
      const { error: ledgerError } = await supabase
        .from('ledger_entries')
        .insert({
          wallet_id: wallet.id,
          delta_cents: -selectedAmount.cents,
          currency: 'USD',
          entry_type: 'purchase',
          reference_type: 'gift_card',
          reference_id: giftCard.id,
          description: `Gift card purchase: ${selectedAmount.label}`,
        });

      if (ledgerError) {
        console.error('Ledger error:', ledgerError);
        // Gift card was created but ledger failed - still show success
      }

      // Update wallet balance
      const newBalance = Number(wallet.balance) - (selectedAmount.cents / 100);
      await supabase
        .from('wallets')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', wallet.id);

      // Get sender's display name for notification
      const { data: senderProfile } = await supabase
        .from('public_profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();
      
      const senderName = senderProfile?.display_name || 'Someone';

      // Send notification via edge function (email or SMS based on recipient type)
      const recipient = recipientType === 'email' ? recipientEmail : formatPhoneNumber(recipientPhone);
      if (recipient) {
        try {
          await supabase.functions.invoke('send-gift-notification', {
            body: {
              recipientType,
              recipient,
              senderName,
              gemAmount: selectedAmount.coins,
              giftCode: giftCard.code,
              message: message || null,
            },
          });
        } catch (notifError) {
          console.error('Failed to send notification:', notifError);
          // Don't fail the whole purchase if notification fails
        }
      }

      setPurchasedCode(giftCard.code);
      toast.success('Gift card created!', { description: `Code: ${giftCard.code}` });
      onPurchaseComplete?.();
    } catch (error: any) {
      console.error('Gift card purchase error:', error);
      toast.error('Failed to create gift card', { description: error.message });
    } finally {
      setIsPurchasing(false);
    }
  };

  const resetForm = () => {
    setSelectedAmount(null);
    setRecipientEmail('');
    setRecipientPhone('');
    setRecipientType('email');
    setMessage('');
    setPurchasedCode(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Gift className="w-4 h-4" />
          Send Gift Card
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-500" />
            Gift Boom Coins
          </DialogTitle>
        </DialogHeader>

        {purchasedCode ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-gain/20 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-gain" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Gift Card Created!</h3>
              <p className="text-muted-foreground">Share this code with the recipient</p>
            </div>
            <div className="bg-muted p-4 rounded-xl">
              <p className="text-xs text-muted-foreground mb-1">Gift Card Code</p>
              <p className="text-2xl font-mono font-bold tracking-wider">{purchasedCode}</p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button 
                variant="outline" 
                onClick={() => navigator.clipboard.writeText(purchasedCode)}
              >
                Copy Code
              </Button>
              <Button onClick={() => { resetForm(); setIsOpen(false); }}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Amount Selection */}
            <div className="space-y-3">
              <Label>Select Amount</Label>
              <div className="grid grid-cols-3 gap-2">
                {GIFT_CARD_OPTIONS.map((option) => (
                  <button
                    key={option.cents}
                    onClick={() => setSelectedAmount(option)}
                    className={cn(
                      "p-3 rounded-xl border-2 transition-all text-center",
                      selectedAmount?.cents === option.cents
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <p className="font-bold text-lg">{option.label}</p>
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <BoomCoinIcon size="xs" className="text-amber-400" />
                      {option.coins.toLocaleString()} Coins
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient Selection */}
            <div className="space-y-3">
              <Label>Send to (Optional)</Label>
              <Tabs value={recipientType} onValueChange={(v) => setRecipientType(v as 'email' | 'phone')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="email" className="gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </TabsTrigger>
                  <TabsTrigger value="phone" className="gap-2">
                    <Phone className="w-4 h-4" />
                    Phone
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="email" className="mt-3">
                  <Input
                    type="email"
                    placeholder="friend@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                </TabsContent>
                <TabsContent value="phone" className="mt-3">
                  <Input
                    type="tel"
                    placeholder="+1 555 123 4567"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Include country code (e.g., +1 for US, +90 for Turkey)
                  </p>
                </TabsContent>
              </Tabs>
              <p className="text-xs text-muted-foreground">
                Leave empty to create a gift card you can share manually
              </p>
            </div>

            {/* Personal Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Personal Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Enjoy your coins!"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
              />
            </div>

            {/* Summary */}
            {selectedAmount && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">You'll pay</p>
                      <p className="text-xl font-bold">{formatPrice(selectedAmount.cents / 100)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Recipient gets</p>
                      <div className="flex items-center gap-1 text-xl font-bold text-amber-500">
                        <BoomCoinIcon size="md" className="text-amber-400" />
                        {selectedAmount.coins.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Purchase Button */}
            <Button
              className="w-full gap-2"
              size="lg"
              disabled={!selectedAmount || isPurchasing}
              onClick={handlePurchase}
            >
              {isPurchasing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isPurchasing ? 'Creating...' : 'Create Gift Card'}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Gift cards expire in 1 year and are non-refundable
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
