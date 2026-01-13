import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PhoneInputWithCountry } from '@/components/ui/phone-input';
import { z } from 'zod';

interface RequireProfileInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

// Validation schemas
const phoneSchema = z.string().regex(/^\+[1-9]\d{6,14}$/, 'Please enter a valid phone number with country code');
const nationalIdSchema = z.string().regex(/^[A-Za-z0-9]{5,20}$/, 'Please enter a valid ID (5-20 alphanumeric characters)');

export const RequireProfileInfoDialog = ({ open, onOpenChange, onComplete }: RequireProfileInfoDialogProps) => {
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; nationalId?: string }>({});

  useEffect(() => {
    if (!open) {
      setPhone('');
      setNationalId('');
      setErrors({});
    }
  }, [open]);

  const validateForm = () => {
    const newErrors: { phone?: string; nationalId?: string } = {};

    const phoneResult = phoneSchema.safeParse(phone);
    if (!phoneResult.success) {
      newErrors.phone = phoneResult.error.errors[0].message;
    }

    const nationalIdResult = nationalIdSchema.safeParse(nationalId);
    if (!nationalIdResult.success) {
      newErrors.nationalId = nationalIdResult.error.errors[0].message;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in first');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          phone,
          national_id: nationalId,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile information saved successfully!');
      onComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Failed to save profile information');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle>Complete Your Profile</DialogTitle>
              <DialogDescription className="mt-1">
                Verification required to add funds
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-600 dark:text-amber-400">
                Phone & ID Required
              </p>
              <p className="text-muted-foreground mt-1">
                For your security and to comply with regulations, we need your phone number and national ID to process payments.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <PhoneInputWithCountry
              value={phone}
              onChange={setPhone}
              placeholder="Enter your phone number"
              className={errors.phone ? 'border-destructive' : ''}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nationalId">National ID / Passport Number</Label>
            <Input
              id="nationalId"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value.toUpperCase())}
              placeholder="Enter your ID number"
              className={errors.nationalId ? 'border-destructive' : ''}
              maxLength={20}
            />
            {errors.nationalId && (
              <p className="text-xs text-destructive">{errors.nationalId}</p>
            )}
            <p className="text-xs text-muted-foreground">
              5-20 alphanumeric characters (letters and numbers)
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save & Continue'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
