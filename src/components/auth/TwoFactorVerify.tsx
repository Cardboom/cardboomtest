import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Shield, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { OTPInput } from './OTPInput';

interface TwoFactorVerifyProps {
  phone: string;
  userId: string;
  onVerified: () => void;
  onCancel: () => void;
}

export const TwoFactorVerify = ({ phone, userId, onVerified, onCancel }: TwoFactorVerifyProps) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  const maskedPhone = phone.replace(/(\+\d{2})\d+(\d{2})$/, '$1****$2');

  const handleSendCode = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await supabase.functions.invoke('send-sms', {
        body: { phone, type: '2fa_login' }
      });

      if (response.error || !response.data?.success) {
        toast.error(response.data?.error || 'Failed to send verification code');
      } else {
        setCodeSent(true);
        toast.success('Verification code sent!');
      }
    } catch (err) {
      toast.error('Failed to send code');
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const verifyResponse = await supabase.functions.invoke('verify-sms-otp', {
        body: { phone, otp, type: '2fa_login' }
      });

      if (verifyResponse.error || !verifyResponse.data?.success) {
        setError('Invalid verification code');
        setLoading(false);
        return;
      }

      onVerified();
    } catch (err) {
      setError('Verification failed');
    }
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-3">
        <motion.div 
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 mx-auto bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center border border-primary/20"
        >
          <Shield className="w-10 h-10 text-primary" />
        </motion.div>
        <h2 className="text-2xl font-bold">Two-Factor Authentication</h2>
        <p className="text-muted-foreground">
          {codeSent 
            ? `Enter the code sent to ${maskedPhone}`
            : 'Verify your identity to continue'
          }
        </p>
      </div>

      {!codeSent ? (
        <div className="space-y-4">
          <div className="bg-secondary/30 rounded-xl p-4 border border-border/30">
            <p className="text-sm text-muted-foreground text-center">
              We'll send a verification code to your registered phone number ending in{' '}
              <span className="text-foreground font-medium">{phone.slice(-4)}</span>
            </p>
          </div>
          <Button
            onClick={handleSendCode}
            disabled={loading}
            className="w-full h-12 text-lg font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Verification Code'
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <OTPInput
            value={otp}
            onChange={setOtp}
            length={6}
            error={error}
            autoFocus
          />

          <Button
            onClick={handleVerify}
            disabled={loading || otp.length !== 6}
            className="w-full h-12 text-lg font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify'
            )}
          </Button>

          <button
            type="button"
            onClick={handleSendCode}
            disabled={loading}
            className="w-full text-primary hover:text-primary/80 text-sm transition-colors"
          >
            Resend code
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onCancel}
        className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to login
      </button>
    </motion.div>
  );
};