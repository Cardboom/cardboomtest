import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowDownLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { PayoutSpeedTiers } from './withdrawal/PayoutSpeedTiers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

// Withdrawal fee in TRY
const WITHDRAWAL_FEE_TRY = 16;

interface WithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: number; // Balance in TRY
  onSuccess?: () => void;
}

// Turkish IBAN validation - must start with TR
const ibanSchema = z.string()
  .min(26, 'Turkish IBAN must be 26 characters')
  .max(26, 'Turkish IBAN must be 26 characters')
  .regex(/^TR[0-9]{24}$/, 'Invalid Turkish IBAN format (must start with TR)');

const withdrawalSchema = z.object({
  amount: z.number()
    .positive('Amount must be greater than 0'),
  iban: ibanSchema,
  accountHolderName: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(200, 'Name must not exceed 200 characters')
    .regex(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s'-]+$/, 'Name contains invalid characters'),
});

export const WithdrawalDialog = ({ open, onOpenChange, currentBalance, onSuccess }: WithdrawalDialogProps) => {
  const [amount, setAmount] = useState('');
  const [iban, setIban] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // Minimum withdrawal is fee + 1 TRY
  const MIN_WITHDRAWAL_TRY = WITHDRAWAL_FEE_TRY + 1;
  const maxWithdrawal = Math.max(0, currentBalance - WITHDRAWAL_FEE_TRY);

  const formatTRY = (value: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
  };

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

    // Check minimum withdrawal (must cover fee + at least 1 TRY)
    if (amountNum < MIN_WITHDRAWAL_TRY) {
      setErrors({ amount: `Minimum withdrawal is ${formatTRY(MIN_WITHDRAWAL_TRY)}` });
      return;
    }

    // Check balance (amount + fee must not exceed balance)
    const totalRequired = amountNum + WITHDRAWAL_FEE_TRY;
    if (totalRequired > currentBalance) {
      setErrors({ amount: `Insufficient balance. You need ${formatTRY(totalRequired)} (including ${formatTRY(WITHDRAWAL_FEE_TRY)} fee)` });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to withdraw funds');
        return;
      }

      // First, check if this IBAN already exists for the user
      let ibanId: string;
      
      const { data: existingIban } = await supabase
        .from('user_ibans')
        .select('id')
        .eq('user_id', user.id)
        .eq('iban', cleanIban)
        .maybeSingle();

      if (existingIban) {
        ibanId = existingIban.id;
      } else {
        // Insert new IBAN
        const { data: newIban, error: insertError } = await supabase
          .from('user_ibans')
          .insert({
            user_id: user.id,
            iban: cleanIban,
            holder_name: accountHolderName.trim(),
            is_primary: true,
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('IBAN save error:', insertError);
          throw new Error('Failed to save IBAN details');
        }
        ibanId = newIban.id;
      }

      // Create withdrawal request
      await createWithdrawalRequest(user.id, user.email, amountNum, ibanId, cleanIban, accountHolderName);

      setSubmitted(true);
      toast.success('Withdrawal request submitted successfully');
      onSuccess?.();

    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit withdrawal request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const createWithdrawalRequest = async (
    userId: string, 
    userEmail: string | undefined, 
    amountTRY: number, 
    ibanId: string,
    cleanIban: string,
    holderName: string
  ) => {
    // Create withdrawal request with IBAN reference
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('withdrawal_requests')
      .insert({
        user_id: userId,
        amount: amountTRY,
        iban_id: ibanId,
        status: 'pending',
      })
      .select()
      .single();

    if (withdrawalError) throw withdrawalError;

    // Send email notification
    const { error: emailError } = await supabase.functions.invoke('send-withdrawal-notification', {
      body: {
        withdrawalId: withdrawal.id,
        userId: userId,
        amount: amountTRY,
        fee: WITHDRAWAL_FEE_TRY,
        netAmount: amountTRY,
        currency: 'TRY',
        iban: cleanIban,
        accountHolderName: holderName,
        userEmail: userEmail,
      }
    });

    if (emailError) {
      console.error('Email notification failed:', emailError);
      // Don't fail the request if email fails
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
            Request a withdrawal to your Turkish bank account. Withdrawals are processed in Turkish Lira (₺).
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
              <p className="text-xl font-bold text-foreground">{formatTRY(currentBalance)}</p>
            </div>

            {/* Fee Notice */}
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-sm text-warning-foreground">
                <strong>Withdrawal Fee:</strong> {formatTRY(WITHDRAWAL_FEE_TRY)} will be deducted from your balance.
              </p>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₺ TRY)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setErrors(prev => ({ ...prev, amount: '' }));
                }}
                min={MIN_WITHDRAWAL_TRY}
                max={maxWithdrawal}
                step="0.01"
                className={errors.amount ? 'border-destructive' : ''}
              />
              {errors.amount && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.amount}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Minimum: {formatTRY(MIN_WITHDRAWAL_TRY)} • Maximum: {formatTRY(maxWithdrawal)} • Fee: {formatTRY(WITHDRAWAL_FEE_TRY)}
              </p>
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
                maxLength={32} // 26 chars + 6 spaces for TR IBAN
              />
              {errors.iban && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.iban}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Only Turkish IBANs (starting with TR) are accepted</p>
            </div>

            {/* Payout Speed Tiers - Shows current tier and upgrade options */}
            <PayoutSpeedTiers />

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
