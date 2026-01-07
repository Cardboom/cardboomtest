import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Ticket, Sparkles, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ClaimGiftCardProps {
  onClaimComplete?: () => void;
}

export function ClaimGiftCard({ onClaimComplete }: ClaimGiftCardProps) {
  const [code, setCode] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState<number | null>(null);

  const handleClaim = async () => {
    if (!code.trim()) {
      toast.error('Please enter a gift card code');
      return;
    }

    setIsClaiming(true);
    try {
      const { data, error } = await supabase.rpc('claim_gift_card', {
        gift_code: code.trim().toUpperCase()
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; gems_received?: number };
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to claim gift card');
      }

      setClaimedAmount(result.gems_received || 0);
      toast.success('Gift card claimed!', { 
        description: `You received ${result.gems_received?.toLocaleString()} gems!` 
      });
      onClaimComplete?.();
    } catch (error: any) {
      console.error('Claim error:', error);
      toast.error('Failed to claim gift card', { description: error.message });
    } finally {
      setIsClaiming(false);
    }
  };

  const resetForm = () => {
    setCode('');
    setClaimedAmount(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Ticket className="w-4 h-4" />
          Claim Gift Card
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-primary" />
            Claim Gift Card
          </DialogTitle>
        </DialogHeader>

        {claimedAmount !== null ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-20 h-20 rounded-full bg-gain/20 flex items-center justify-center mx-auto">
              <Check className="w-10 h-10 text-gain" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">Success!</h3>
              <p className="text-muted-foreground">You've received</p>
            </div>
            <div className="flex items-center justify-center gap-2 text-3xl font-bold text-primary">
              <Sparkles className="w-8 h-8" />
              {claimedAmount.toLocaleString()} Gems
            </div>
            <Button onClick={() => { resetForm(); setIsOpen(false); }} className="mt-4">
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="gift-code">Gift Card Code</Label>
              <Input
                id="gift-code"
                placeholder="Enter 8-character code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="text-center text-xl font-mono tracking-wider"
                maxLength={8}
              />
            </div>

            <Button
              className="w-full gap-2"
              size="lg"
              disabled={!code.trim() || isClaiming}
              onClick={handleClaim}
            >
              {isClaiming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isClaiming ? 'Claiming...' : 'Claim Gems'}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Enter the 8-character code from your gift card
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
