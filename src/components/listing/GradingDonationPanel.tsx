import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PiggyBank, Gift, Sparkles, Heart, Users, DollarSign } from 'lucide-react';
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
  onToggleDonations?: (enabled: boolean) => void;
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
  onToggleDonations
}: GradingDonationPanelProps) => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [totalCents, setTotalCents] = useState(0);
  const [donateOpen, setDonateOpen] = useState(false);
  const [donateAmount, setDonateAmount] = useState('5');
  const [donateMessage, setDonateMessage] = useState('');
  const [isDonating, setIsDonating] = useState(false);
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

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Donation failed');
      }

      toast.success('Thank you for your donation!', {
        description: `You donated ${formatPrice(amountCents / 100)} towards grading`
      });
      
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

  const progress = Math.min((totalCents / goalCents) * 100, 100);
  const isFunded = totalCents >= goalCents;

  if (!acceptsDonations && !isOwner) return null;

  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-yellow-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <PiggyBank className="w-5 h-5 text-amber-500" />
          Grading Piggy Bank
          {isFunded && (
            <Badge className="ml-auto bg-gain text-gain-foreground">
              <Sparkles className="w-3 h-3 mr-1" />
              Funded!
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isOwner && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm">Accept donations for grading</span>
            <Button
              variant={acceptsDonations ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggleDonations?.(!acceptsDonations)}
            >
              {acceptsDonations ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        )}

        {acceptsDonations && (
          <>
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  {formatPrice(totalCents / 100)} / {formatPrice(goalCents / 100)}
                </span>
              </div>
              <div className="relative">
                <Progress 
                  value={progress} 
                  className={cn(
                    "h-4",
                    isFunded && "bg-gain/20"
                  )}
                />
                <div 
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                >
                  <PiggyBank className={cn(
                    "w-3 h-3 transition-all",
                    isFunded ? "text-gain" : "text-amber-500"
                  )} />
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="w-3 h-3" />
                {donations.length} contributor{donations.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Donate Button */}
            {!isOwner && currentUserId !== ownerId && (
              <Dialog open={donateOpen} onOpenChange={setDonateOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black">
                    <Gift className="w-4 h-4" />
                    Donate Towards Grading
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
                    <p className="text-sm text-muted-foreground">
                      Help this collector get their card professionally graded! Your donation goes directly towards the grading fee.
                    </p>

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
                      className="w-full gap-2" 
                      onClick={handleDonate}
                      disabled={isDonating}
                    >
                      <DollarSign className="w-4 h-4" />
                      {isDonating ? 'Processing...' : `Donate ${formatPrice(parseFloat(donateAmount) || 0)}`}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Recent Donors */}
            {donations.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Recent Contributors</p>
                <div className="space-y-1">
                  {donations.slice(0, 3).map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30">
                      <span className="text-muted-foreground">Anonymous donor</span>
                      <span className="font-medium text-amber-500">{formatPrice(d.amount_cents / 100)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
