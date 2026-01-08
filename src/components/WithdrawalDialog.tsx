import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowDownLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrency } from '@/contexts/CurrencyContext';
import { z } from 'zod';

interface WithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: number;
  onSuccess?: () => void;
}

// IBAN validation - basic check for length and format
const ibanSchema = z.string()
  .min(15, 'IBAN must be at least 15 characters')
  .max(34, 'IBAN must not exceed 34 characters')
  .regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/, 'Invalid IBAN format');

const withdrawalSchema = z.object({
  amount: z.number()
    .positive('Amount must be greater than 0')
    .min(10, 'Minimum withdrawal is $10'),
  iban: ibanSchema,
  accountHolderName: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(200, 'Name must not exceed 200 characters')
    .regex(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s'-]+$/, 'Name contains invalid characters'),
});

export const WithdrawalDialog = ({ open, onOpenChange, currentBalance, onSuccess }: WithdrawalDialogProps) => {
  const { formatPrice } = useCurrency();
  const [amount, setAmount] = useState('');
  const [iban, setIban] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const formatIban = (value: string) => {
    // Remove all non-alphanumeric characters and convert to uppercase
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    // Add spaces every 4 characters for display
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  };

  const handleIbanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatIban(e.target.value);
    setIban(formatted);
    setErrors(prev => ({ ...prev, iban: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const amountNum = parseFloat(amount);
    const cleanIban = iban.replace(/\s/g, ''); // Remove spaces for validation

    // Validate inputs
    const result = withdrawalSchema.safeParse({
      amount: amountNum,
      iban: cleanIban,
      accountHolderName: accountHolderName.trim(),
    });

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    // Check balance
    if (amountNum > currentBalance) {
      setErrors({ amount: 'Insufficient balance' });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to withdraw funds');
        return;
      }

      // Create withdrawal request
      const { data: withdrawal, error: withdrawalError } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user.id,
          amount: amountNum,
          iban: cleanIban,
          account_holder_name: accountHolderName.trim(),
          status: 'pending',
        })
        .select()
        .single();

      if (withdrawalError) throw withdrawalError;

      // Send email notification
      const { error: emailError } = await supabase.functions.invoke('send-withdrawal-notification', {
        body: {
          withdrawalId: withdrawal.id,
          userId: user.id,
          amount: amountNum,
          iban: cleanIban,
          accountHolderName: accountHolderName.trim(),
          userEmail: user.email,
        }
      });

      if (emailError) {
        console.error('Email notification failed:', emailError);
        // Don't fail the request if email fails
      }

      setSubmitted(true);
      toast.success('Withdrawal request submitted successfully');
      onSuccess?.();

    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error('Failed to submit withdrawal request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setIban('');
    setAccountHolderName('');
    setErrors({});
    setSubmitted(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownLeft className="h-5 w-5 text-primary" />
            Withdraw Funds
          </DialogTitle>
          <DialogDescription>
            Request a withdrawal to your bank account via IBAN transfer.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gain/20 mx-auto mb-4 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-gain" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Request Submitted!</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Your withdrawal request has been submitted and is pending review. 
              You'll receive an update once processed.
            </p>
            <Button onClick={handleClose}>Close</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Available Balance */}
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-xl font-bold text-foreground">{formatPrice(currentBalance)}</p>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setErrors(prev => ({ ...prev, amount: '' }));
                }}
                min="10"
                max={currentBalance}
                step="0.01"
                className={errors.amount ? 'border-destructive' : ''}
              />
              {errors.amount && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.amount}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Minimum withdrawal: $10</p>
            </div>

            {/* Account Holder Name */}
            <div className="space-y-2">
              <Label htmlFor="accountHolderName">Account Holder Full Name</Label>
              <Input
                id="accountHolderName"
                type="text"
                placeholder="John Doe"
                value={accountHolderName}
                onChange={(e) => {
                  setAccountHolderName(e.target.value);
                  setErrors(prev => ({ ...prev, accountHolderName: '' }));
                }}
                className={errors.accountHolderName ? 'border-destructive' : ''}
                maxLength={200}
              />
              {errors.accountHolderName && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.accountHolderName}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Must match the name on your bank account</p>
            </div>

            {/* IBAN */}
            <div className="space-y-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                type="text"
                placeholder="TR00 0000 0000 0000 0000 0000 00"
                value={iban}
                onChange={handleIbanChange}
                className={`font-mono ${errors.iban ? 'border-destructive' : ''}`}
                maxLength={42} // 34 chars + 8 spaces
              />
              {errors.iban && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.iban}
                </p>
              )}
            </div>

            {/* Info Box */}
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-sm text-warning-foreground">
                <strong>Processing Time:</strong> Withdrawals are typically processed within 1-3 business days. 
                You will receive an email notification when your withdrawal is complete.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !amount || !iban || !accountHolderName}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
