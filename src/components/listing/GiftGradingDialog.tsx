import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gift, Award, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useGradingPricing } from '@/hooks/useGradingPricing';

interface GiftGradingDialogProps {
  recipientId: string;
  recipientName: string;
  listingId?: string;
  cardInstanceId?: string;
  cardTitle: string;
}

export const GiftGradingDialog = ({
  recipientId,
  recipientName,
  listingId,
  cardInstanceId,
  cardTitle
}: GiftGradingDialogProps) => {
  const [open, setOpen] = useState(false);
  const [speedTier, setSpeedTier] = useState<'standard' | 'express' | 'priority'>('standard');
  const [isGifting, setIsGifting] = useState(false);
  const { formatPrice } = useCurrency();
  const gradingPricing = useGradingPricing();

  const tier = gradingPricing[speedTier];
  const price = tier.price;

  const handleGift = async () => {
    setIsGifting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to gift grading');
        return;
      }

      // Check wallet balance
      const { data: wallet } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', user.id)
        .single();

      if (!wallet || wallet.balance < price) {
        toast.error('Insufficient wallet balance', {
          description: `You need ${formatPrice(price)} to gift this grading`
        });
        return;
      }

      // Deduct from wallet
      await supabase
        .from('wallets')
        .update({ balance: wallet.balance - price, updated_at: new Date().toISOString() })
        .eq('id', wallet.id);

      // Create grading credit for recipient
      await supabase
        .from('grading_credits')
        .insert({
          user_id: recipientId,
          gifted_by: user.id,
          speed_tier: speedTier,
          listing_id: listingId,
          card_instance_id: cardInstanceId,
          card_title: cardTitle
        });

      // Send notification to recipient
      await supabase.functions.invoke('send-notification', {
        body: {
          user_id: recipientId,
          type: 'grading_complete',
          title: 'You received a grading gift! 🎁',
          body: `Someone gifted you free ${speedTier} grading for "${cardTitle}"`,
          data: { listing_id: listingId, card_instance_id: cardInstanceId }
        }
      });

      toast.success('Grading gift sent!', {
        description: `${recipientName} will receive ${speedTier} grading for this card`
      });
      
      setOpen(false);
    } catch (error: any) {
      toast.error('Failed to send gift', { description: error.message });
    } finally {
      setIsGifting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Gift className="w-4 h-4 text-rose-500" />
          Gift Grading
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-rose-500" />
            Gift Free Grading
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="p-4 rounded-xl bg-gradient-to-r from-rose-500/10 to-pink-500/10 border border-rose-500/20">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-8 h-8 text-rose-500" />
              <div>
                <p className="font-medium">Gift grading to {recipientName}</p>
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{cardTitle}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Speed Tier</label>
            <Select value={speedTier} onValueChange={(v) => setSpeedTier(v as typeof speedTier)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">
                  Standard ({gradingPricing.standard.daysMin}-{gradingPricing.standard.daysMax} days) - {formatPrice(gradingPricing.standard.price)}
                </SelectItem>
                <SelectItem value="express">
                  Express ({gradingPricing.express.daysMin}-{gradingPricing.express.daysMax} days) - {formatPrice(gradingPricing.express.price)}
                </SelectItem>
                <SelectItem value="priority">
                  Priority ({gradingPricing.priority.daysMin}-{gradingPricing.priority.daysMax} days) - {formatPrice(gradingPricing.priority.price)}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Total Cost</span>
            <span className="text-lg font-bold">{formatPrice(price)}</span>
          </div>

          <Button 
            className="w-full gap-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600" 
            onClick={handleGift}
            disabled={isGifting}
          >
            {isGifting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isGifting ? 'Sending Gift...' : `Send Grading Gift (${formatPrice(price)})`}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            The recipient will be notified and can use this credit to grade this card for free
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
