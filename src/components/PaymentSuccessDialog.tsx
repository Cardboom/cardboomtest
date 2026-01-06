import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Sparkles, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';

interface PaymentSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  paymentId?: string;
}

export const PaymentSuccessDialog = ({ open, onOpenChange, amount, paymentId }: PaymentSuccessDialogProps) => {
  // Calculate gems earned (0.2% of amount, displayed as integer)
  const gemsEarned = Math.floor(amount * 0.002 * 100); // 1 gem = $0.01

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader className="space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="mx-auto"
          >
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            </div>
          </motion.div>
          
          <DialogTitle className="text-2xl font-bold">Payment Successful!</DialogTitle>
          <DialogDescription className="text-base">
            Your wallet has been topped up successfully.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Amount Added */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
          >
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm mb-1">
              <Wallet className="h-4 w-4" />
              <span>Added to Wallet</span>
            </div>
            <div className="text-3xl font-bold text-primary">
              {formatUSD(amount)}
            </div>
          </motion.div>

          {/* Gems Earned */}
          {gemsEarned > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
            >
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  +{gemsEarned} Gems Earned!
                </span>
              </div>
            </motion.div>
          )}

          {/* Transaction ID */}
          {paymentId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xs text-muted-foreground"
            >
              Transaction ID: {paymentId}
            </motion.div>
          )}
        </div>

        <Button onClick={() => onOpenChange(false)} className="w-full">
          Done
        </Button>
      </DialogContent>
    </Dialog>
  );
};
