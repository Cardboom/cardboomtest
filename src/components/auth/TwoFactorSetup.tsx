import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PhoneInputWithCountry } from '@/components/ui/phone-input';
import { Shield, Phone, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { OTPInput } from './OTPInput';

const phoneSchema = z.string().regex(/^\+[1-9]\d{6,14}$/, 'Please enter a valid phone number');

interface TwoFactorSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  userId: string;
}

type Step = 'phone' | 'verify' | 'success';

export const TwoFactorSetup = ({ open, onOpenChange, onComplete, userId }: TwoFactorSetupProps) => {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendCode = async () => {
    const result = phoneSchema.safeParse(phone);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }
    setError('');
    setLoading(true);

    try {
      const response = await supabase.functions.invoke('send-sms', {
        body: { phone, type: '2fa_setup' }
      });

      if (response.error || !response.data?.success) {
        toast.error(response.data?.error || 'Failed to send verification code');
      } else {
        setStep('verify');
        toast.success('Verification code sent!');
      }
    } catch (err) {
      toast.error('Failed to send code');
    }
    setLoading(false);
  };

  const handleVerifyCode = async () => {
    if (otp.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const verifyResponse = await supabase.functions.invoke('verify-sms-otp', {
        body: { phone, otp, type: '2fa_setup' }
      });

      if (verifyResponse.error || !verifyResponse.data?.success) {
        setError('Invalid verification code');
        setLoading(false);
        return;
      }

      // Enable 2FA in profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          two_factor_enabled: true,
          two_factor_phone: phone,
          two_factor_verified_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        toast.error('Failed to enable 2FA');
      } else {
        setStep('success');
        toast.success('Two-factor authentication enabled!');
      }
    } catch (err) {
      toast.error('Verification failed');
    }
    setLoading(false);
  };

  const handleClose = () => {
    if (step === 'success') {
      onComplete();
    }
    setStep('phone');
    setPhone('');
    setOtp('');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="w-5 h-5 text-primary" />
            {step === 'success' ? '2FA Enabled!' : 'Set Up Two-Factor Authentication'}
          </DialogTitle>
          <DialogDescription>
            {step === 'phone' && 'Add an extra layer of security to your account with SMS verification.'}
            {step === 'verify' && `Enter the 6-digit code sent to ${phone}`}
            {step === 'success' && 'Your account is now protected with two-factor authentication.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {step === 'phone' && (
            <>
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-base">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </Label>
                <PhoneInputWithCountry
                  value={phone}
                  onChange={setPhone}
                  placeholder="Enter your phone number"
                  error={error}
                />
              </div>
              <Button
                onClick={handleSendCode}
                disabled={loading || !phone}
                className="w-full h-12 text-base font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Verification Code'
                )}
              </Button>
            </>
          )}

          {step === 'verify' && (
            <div className="space-y-5">
              <OTPInput
                value={otp}
                onChange={setOtp}
                length={6}
                error={error}
                autoFocus
              />
              
              <Button
                onClick={handleVerifyCode}
                disabled={loading || otp.length !== 6}
                className="w-full h-12 text-base font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Enable 2FA'
                )}
              </Button>
              
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={loading}
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  Resend code
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Change number
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-2xl flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <p className="text-muted-foreground">
                You'll receive a verification code via SMS each time you log in.
              </p>
              <Button onClick={handleClose} className="w-full h-12 text-base font-semibold">
                Done
              </Button>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};