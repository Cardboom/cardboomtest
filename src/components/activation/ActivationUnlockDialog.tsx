import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Unlock, Wallet, Gift, TrendingUp, BarChart3, Star, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface ActivationUnlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivationUnlockDialog({ open, onOpenChange }: ActivationUnlockDialogProps) {
  const navigate = useNavigate();
  const [isActivated, setIsActivated] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const checkActivation = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('activation_unlocked')
          .eq('id', user.id)
          .maybeSingle();

        if (isMounted) {
          setIsActivated(profile?.activation_unlocked || false);
        }
      } catch (error) {
        console.error('Error checking activation:', error);
      }
    };

    if (open) {
      checkActivation();
    }
    
    return () => {
      isMounted = false;
    };
  }, [open]);

  const handleTopUp = () => {
    onOpenChange(false);
    navigate('/wallet');
  };

  if (isActivated) {
    return null;
  }

  const benefits = [
    { icon: TrendingUp, label: 'Full Price Visibility', description: 'See real market prices' },
    { icon: BarChart3, label: 'Portfolio Analytics', description: 'Track your collection value' },
    { icon: Gift, label: '7 Days Pro Free', description: 'With $10+ first deposit' },
    { icon: Star, label: 'XP Boost', description: 'Start with bonus reputation' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5 text-primary" />
            Unlock Full Access
          </DialogTitle>
          <DialogDescription>
            Add a small balance to unlock all features and start trading
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Benefits */}
          <div className="grid grid-cols-2 gap-3">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-3 rounded-lg bg-muted/50 border border-border"
              >
                <benefit.icon className="h-5 w-5 text-primary mb-2" />
                <div className="text-sm font-medium">{benefit.label}</div>
                <div className="text-xs text-muted-foreground">{benefit.description}</div>
              </motion.div>
            ))}
          </div>

          {/* Special Offer */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg p-4 border border-primary/30"
          >
            <div className="flex items-center gap-2 mb-2">
              <Gift className="h-5 w-5 text-primary" />
              <span className="font-bold">First Deposit Bonus</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Deposit $10 or more and get <span className="text-primary font-semibold">7 days of Pro</span> features absolutely free!
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Reduced trading fees (4.5% buyer, 6% seller)</li>
              <li>• PnL graphs and advanced analytics</li>
              <li>• Priority support</li>
            </ul>
          </motion.div>

          {/* CTA */}
          <Button onClick={handleTopUp} className="w-full gap-2" size="lg">
            <Wallet className="h-4 w-4" />
            Add Balance to Unlock
            <ArrowRight className="h-4 w-4" />
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Your balance is yours. Use it to buy, or withdraw anytime.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
