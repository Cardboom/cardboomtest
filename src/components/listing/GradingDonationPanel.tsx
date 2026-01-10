import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PiggyBank, Gift, Sparkles, Heart, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';

interface GradingDonationPanelProps {
  targetType: 'card_instance' | 'listing';
  targetId: string;
  ownerId: string;
  acceptsDonations: boolean;
  goalCents: number;
  isOwner: boolean;
  cardTitle?: string;
  onToggleDonations?: (enabled: boolean) => void;
  onRefundAndDelist?: () => void;
}

interface Donation {
  id: string;
  donor_user_id: string;
  amount_cents: number;
  message: string | null;
  created_at: string;
  profiles?: { display_name: string | null; avatar_url: string | null };
}

export const GradingDonationPanel = ({
  targetType,
  targetId,
  ownerId,
  acceptsDonations,
  goalCents,
  isOwner,
  cardTitle,
  onToggleDonations,
  onRefundAndDelist
}: GradingDonationPanelProps) => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [totalCents, setTotalCents] = useState(0);
  const [donateOpen, setDonateOpen] = useState(false);
  const [donateAmount, setDonateAmount] = useState('5');
  const [donateMessage, setDonateMessage] = useState('');
  const [isDonating, setIsDonating] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { formatPrice } = useCurrency();

  useEffect(() => {
    fetchDonations();
    checkUser();
  }, [targetId]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchDonations = async () => {
    const column = targetType === 'card_instance' ? 'card_instance_id' : 'listing_id';
    
    const { data } = await supabase
      .from('grading_donations')
      .select('id, donor_user_id, amount_cents, message, created_at')
      .eq(column, targetId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (data) {
      setDonations(data);
      setTotalCents(data.reduce((sum, d) => sum + d.amount_cents, 0));
    }
  };

  const handleDonate = async () => {
    if (!currentUserId) {
      toast.error('Please sign in to donate');
      return;
    }

    const amountCents = Math.round(parseFloat(donateAmount) * 100);
    if (isNaN(amountCents) || amountCents < 100) {
      toast.error('Minimum donation is $1');
      return;
    }

    setIsDonating(true);
    try {
      const { data, error } = await supabase.rpc('donate_for_grading', {
        p_target_type: targetType,
        p_target_id: targetId,
        p_amount_cents: amountCents,
        p_message: donateMessage || null
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; goal_reached?: boolean; new_total?: number };
      if (!result.success) {
        throw new Error(result.error || 'Donation failed');
      }

      toast.success('Thank you for your donation!', {
        description: `You donated ${formatPrice(amountCents / 100)} towards grading`
      });
      
      // If goal was reached, trigger notifications
      if (result.goal_reached) {
        toast.success('🎉 Grading goal reached!', {
          description: 'The owner will receive a free grading credit!'
        });
        
        // Trigger notification edge function
        await supabase.functions.invoke('donation-notifications', {
          body: {
            action: 'goal_reached',
            target_type: targetType,
            target_id: targetId,
            owner_id: ownerId
          }
        });
      }
      
      setDonateOpen(false);
      setDonateAmount('5');
      setDonateMessage('');
      fetchDonations();
    } catch (error: any) {
      toast.error('Donation failed', { description: error.message });
    } finally {
      setIsDonating(false);
    }
  };

  const handleRefundAndDelist = async () => {
    if (!isOwner || totalCents === 0) return;
    
    setIsRefunding(true);
    try {
      const { data, error } = await supabase.rpc('refund_grading_donations', {
        p_target_type: targetType,
        p_target_id: targetId
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; refunded_count?: number; total_refunded_cents?: number };
      if (!result.success) {
        throw new Error(result.error || 'Refund failed');
      }

      // Notify donors about refund
      await supabase.functions.invoke('donation-notifications', {
        body: {
          action: 'refunded',
          target_type: targetType,
          target_id: targetId,
          owner_id: ownerId,
          card_title: cardTitle
        }
      });

      toast.success('Donations refunded', {
        description: `${result.refunded_count} donors have been refunded ${formatPrice((result.total_refunded_cents || 0) / 100)}`
      });

      onRefundAndDelist?.();
    } catch (error: any) {
      toast.error('Refund failed', { description: error.message });
    } finally {
      setIsRefunding(false);
    }
  };

  const effectiveGoalCents = goalCents || 1000; // Default $10 goal
  const progress = Math.min((totalCents / effectiveGoalCents) * 100, 100);
  const isFunded = totalCents >= effectiveGoalCents;

  // Show panel for owners or when donations are accepted
  if (!acceptsDonations && !isOwner) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Owner Controls */}
      {isOwner && (
        <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-amber-500" />
              <span className="font-medium">Grading Donations</span>
            </div>
            <Button
              variant={acceptsDonations ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggleDonations?.(!acceptsDonations)}
            >
              {acceptsDonations ? 'Enabled' : 'Enable'}
            </Button>
          </div>
          
          {acceptsDonations && totalCents > 0 && (
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Total Donations</span>
                <span className="font-semibold text-amber-500">{formatPrice(totalCents / 100)}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-loss border-loss/30 hover:bg-loss/10"
                onClick={handleRefundAndDelist}
                disabled={isRefunding}
              >
                {isRefunding ? 'Refunding...' : 'Refund All & Cancel'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Donation Section for Non-Owners */}
      {!isOwner && acceptsDonations && (
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-amber-500" />
              <span className="font-medium">Fund Grading</span>
              {isFunded && (
                <Badge className="bg-gain text-gain-foreground text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Funded!
                </Badge>
              )}
            </div>
            <span className="text-sm font-semibold">
              {formatPrice(totalCents / 100)} / {formatPrice(effectiveGoalCents / 100)}
            </span>
          </div>

          {/* Progress Bar */}
          <Progress 
            value={progress} 
            className={cn("h-2 mb-3", isFunded && "bg-gain/20")}
          />

          <p className="text-xs text-muted-foreground mb-3">
            Help get this card professionally graded. Donations go towards the grading fee. 
            {donations.length > 0 && ` ${donations.length} contributor${donations.length !== 1 ? 's' : ''} so far.`}
          </p>

          {/* Donate Button */}
          <Dialog open={donateOpen} onOpenChange={setDonateOpen}>
            <DialogTrigger asChild>
              <Button className="w-full gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black">
                <Gift className="w-4 h-4" />
                Donate for Grading
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-500" />
                  Donate for Grading
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <p className="font-medium mb-1">How it works</p>
                  <p className="text-muted-foreground text-xs">
                    Your donation goes towards the grading fee for this card. 
                    When the goal is reached, the owner receives a grading credit. 
                    If the listing is removed before the goal, all donations are refunded.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount ($)</label>
                  <div className="flex gap-2">
                    {[1, 5, 10, 20].map((amt) => (
                      <Button
                        key={amt}
                        variant={donateAmount === String(amt) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDonateAmount(String(amt))}
                      >
                        ${amt}
                      </Button>
                    ))}
                  </div>
                  <Input
                    type="number"
                    value={donateAmount}
                    onChange={(e) => setDonateAmount(e.target.value)}
                    min="1"
                    step="0.01"
                    className="mt-2"
                    placeholder="Custom amount"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Message (optional)</label>
                  <Textarea
                    value={donateMessage}
                    onChange={(e) => setDonateMessage(e.target.value)}
                    placeholder="Good luck with the grade!"
                    rows={2}
                  />
                </div>

                <Button 
                  className="w-full gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black" 
                  onClick={handleDonate}
                  disabled={isDonating}
                >
                  <DollarSign className="w-4 h-4" />
                  {isDonating ? 'Processing...' : `Donate ${formatPrice(parseFloat(donateAmount) || 0)}`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
};
