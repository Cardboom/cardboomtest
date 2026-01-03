import { useState } from 'react';
import { Building2, Check, Zap, Shield, TrendingDown, Star, Users, Headphones } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';

interface EnterpriseUpgradeDialogProps {
  userId: string;
  onSuccess?: () => void;
  children?: React.ReactNode;
}

export const EnterpriseUpgradeDialog = ({ 
  userId, 
  onSuccess,
  children 
}: EnterpriseUpgradeDialogProps) => {
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { subscribe, ENTERPRISE_PRICE } = useSubscription(userId);

  const handleSubscribe = async () => {
    setProcessing(true);
    const success = await subscribe('enterprise');
    setProcessing(false);
    
    if (success) {
      setOpen(false);
      onSuccess?.();
    }
  };

  const enterpriseFeatures = [
    {
      icon: TrendingDown,
      title: 'Lowest Trading Fees',
      description: '1% buyer fee (vs 2.5%), 2% seller fee (vs 4.5%)',
    },
    {
      icon: Zap,
      title: 'Minimal Deposit Fees',
      description: '2% card fee (vs 4.5%), 0.5% wire fee (vs 1.5%)',
    },
    {
      icon: Building2,
      title: 'Enterprise Badge',
      description: 'Exclusive badge showing your enterprise status',
    },
    {
      icon: Headphones,
      title: 'Dedicated Support',
      description: '24/7 priority support with dedicated account manager',
    },
    {
      icon: Users,
      title: 'Team Features',
      description: 'Multi-user access and team management tools',
    },
    {
      icon: Shield,
      title: 'Advanced Security',
      description: 'Enhanced security features and audit logs',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="gap-2 border-violet-500/50 text-violet-500 hover:bg-violet-500/10">
            <Building2 className="h-4 w-4" />
            Upgrade to Enterprise
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-violet-500" />
            Upgrade to Enterprise
          </DialogTitle>
          <DialogDescription>
            Maximum savings and premium features for power users
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Price */}
          <div className="text-center p-4 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/30">
            <div className="text-4xl font-bold text-foreground">
              ${ENTERPRISE_PRICE}
              <span className="text-lg font-normal text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Paid from your wallet balance
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3">
            {enterpriseFeatures.map((feature) => (
              <div key={feature.title} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-4 w-4 text-violet-500" />
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
            <p className="text-xs text-muted-foreground mb-2">💡 Example savings on a $1,000 trade:</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Pro:</span> $25 + $45 = <span className="text-amber-500">$70</span>
              </div>
              <div>
                <span className="text-muted-foreground">Enterprise:</span> $10 + $20 = <span className="text-violet-500">$30</span>
              </div>
            </div>
            <p className="text-xs text-violet-500 mt-2">Save $40 per $1,000 traded!</p>
          </div>

          {/* Subscribe Button */}
          <Button 
            className="w-full gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
            onClick={handleSubscribe}
            disabled={processing}
          >
            {processing ? (
              <>Processing...</>
            ) : (
              <>
                <Building2 className="h-4 w-4" />
                Subscribe for ${ENTERPRISE_PRICE}/month
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Auto-renews monthly. Cancel anytime from your profile.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
