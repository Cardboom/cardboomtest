import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Check, Zap, Shield, TrendingDown, Star, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

interface SubscriptionUpgradeDialogProps {
  userId: string;
  onSuccess?: () => void;
  children?: React.ReactNode;
}

export const SubscriptionUpgradeDialog = ({ 
  userId, 
  onSuccess,
  children 
}: SubscriptionUpgradeDialogProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const { subscribe, PRO_PRICE, PRO_YEARLY_PRICE } = useSubscription(userId);

  const handleSubscribe = async () => {
    setProcessing(true);
    const success = await subscribe('pro', billingCycle, navigate);
    setProcessing(false);
    
    if (success) {
      setOpen(false);
      onSuccess?.();
    }
  };

  const displayPrice = billingCycle === 'yearly' 
    ? PRO_YEARLY_PRICE 
    : PRO_PRICE;
  
  const monthlyEquivalent = billingCycle === 'yearly'
    ? (PRO_YEARLY_PRICE / 12).toFixed(2)
    : PRO_PRICE.toFixed(2);

  const proFeatures = [
    {
      icon: TrendingDown,
      title: 'Reduced Trading Fees',
      description: '4.5% buyer fee (vs 6%), 6% seller fee (vs 8.5%)',
    },
    {
      icon: Zap,
      title: 'Lower Deposit Fees',
      description: '5.5% card fee (vs 7%), 2% wire fee (vs 3%)',
    },
    {
      icon: Crown,
      title: 'Pro Badge',
      description: 'Show off your Pro status on your profile',
    },
    {
      icon: Star,
      title: 'Priority Support',
      description: 'Get faster responses from our support team',
    },
    {
      icon: Shield,
      title: 'Early Access',
      description: 'Be first to try new features and tools',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="gap-2 border-amber-500/50 text-amber-500 hover:bg-amber-500/10">
            <Crown className="h-4 w-4" />
            Upgrade to Pro
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Upgrade to Pro
          </DialogTitle>
          <DialogDescription>
            Unlock premium features and save on fees
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Billing Toggle */}
          <Tabs value={billingCycle} onValueChange={(v) => setBillingCycle(v as 'monthly' | 'yearly')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly" className="relative">
                Yearly
                <Badge className="absolute -top-2 -right-2 bg-green-500 text-[10px] px-1.5">
                  Save 1 month
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Price */}
          <div className="text-center p-4 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30">
            <div className="text-4xl font-bold text-foreground">
              ${displayPrice.toFixed(2)}
              <span className="text-lg font-normal text-muted-foreground">
                /{billingCycle === 'yearly' ? 'year' : 'month'}
              </span>
            </div>
            {billingCycle === 'yearly' && (
              <p className="text-sm text-primary mt-1">
                Just ${monthlyEquivalent}/month · 1 month FREE
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              Paid from your wallet balance
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3">
            {proFeatures.map((feature) => (
              <div key={feature.title} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{feature.title}</p>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Savings Calculator */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground mb-2">💡 Example savings on a $100 trade:</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Free:</span> $6 buyer + $8.50 seller = <span className="text-destructive">$14.50</span>
              </div>
              <div>
                <span className="text-muted-foreground">Pro:</span> $4.50 + $6 = <span className="text-primary">$10.50</span>
              </div>
            </div>
            <p className="text-xs text-primary mt-2">Save $4 per $100 traded!</p>
          </div>

          {/* Subscribe Button */}
          <Button 
            className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            onClick={handleSubscribe}
            disabled={processing}
          >
            {processing ? (
              <>Processing...</>
            ) : (
              <>
                <Crown className="h-4 w-4" />
                Subscribe for ${displayPrice.toFixed(2)}/{billingCycle === 'yearly' ? 'year' : 'month'}
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Auto-renews {billingCycle === 'yearly' ? 'annually' : 'monthly'}. Cancel anytime from your profile.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
