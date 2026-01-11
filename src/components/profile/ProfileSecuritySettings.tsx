import { useState, useEffect } from 'react';
import { Shield, Phone, CheckCircle, XCircle, Fingerprint, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup';
import { toast } from 'sonner';

interface ProfileSecuritySettingsProps {
  userId: string;
}

export const ProfileSecuritySettings = ({ userId }: ProfileSecuritySettingsProps) => {
  const [open, setOpen] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorPhone, setTwoFactorPhone] = useState<string | null>(null);

  useEffect(() => {
    const loadSecuritySettings = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('two_factor_enabled, two_factor_phone')
        .eq('id', userId)
        .single();

      if (data) {
        setTwoFactorEnabled(data.two_factor_enabled || false);
        setTwoFactorPhone(data.two_factor_phone);
      }
      setLoading(false);
    };

    if (userId) {
      loadSecuritySettings();
    }
  }, [userId]);

  const handleDisable2FA = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        two_factor_enabled: false,
        two_factor_phone: null,
        two_factor_verified_at: null,
      })
      .eq('id', userId);

    if (error) {
      toast.error('Failed to disable 2FA');
    } else {
      setTwoFactorEnabled(false);
      setTwoFactorPhone(null);
      toast.success('Two-factor authentication disabled');
    }
    setLoading(false);
  };

  const handle2FAComplete = () => {
    setTwoFactorEnabled(true);
    setShow2FASetup(false);
    // Reload to get updated phone
    supabase
      .from('profiles')
      .select('two_factor_phone')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setTwoFactorPhone(data.two_factor_phone);
        }
      });
  };

  const maskedPhone = twoFactorPhone 
    ? twoFactorPhone.replace(/(\+\d{2})\d+(\d{2})$/, '$1****$2')
    : null;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Settings
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <p className="text-sm text-muted-foreground">
              Manage your account security settings and two-factor authentication.
            </p>

            {/* Two-Factor Authentication */}
            <div className="p-4 rounded-xl border border-border bg-secondary/20 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${twoFactorEnabled ? 'bg-green-500/20' : 'bg-secondary'}`}>
                    <Phone className={`h-5 w-5 ${twoFactorEnabled ? 'text-green-500' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-xs text-muted-foreground">
                      {twoFactorEnabled 
                        ? `Enabled on ${maskedPhone}` 
                        : 'Add extra security with SMS verification'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : twoFactorEnabled ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>

              {!loading && (
                <div className="pt-2 border-t border-border/50">
                  {twoFactorEnabled ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDisable2FA}
                      className="w-full text-destructive hover:text-destructive"
                    >
                      Disable Two-Factor Authentication
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => { setOpen(false); setShow2FASetup(true); }}
                      className="w-full"
                    >
                      Enable Two-Factor Authentication
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Biometric Login Info */}
            <div className="p-4 rounded-xl border border-border bg-secondary/20 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary">
                  <Fingerprint className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Biometric Login</p>
                  <p className="text-xs text-muted-foreground">
                    Available on CardBoom mobile app
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Use Face ID or fingerprint to sign in quickly on your mobile device. 
                Download the CardBoom app to enable.
              </p>
            </div>

            {/* Security Tips */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Security Tip:</strong> Enable 2FA to protect your account 
                from unauthorized access. You'll receive a verification code via SMS each time you log in.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2FA Setup Dialog */}
      <TwoFactorSetup
        open={show2FASetup}
        onOpenChange={setShow2FASetup}
        onComplete={handle2FAComplete}
        userId={userId}
      />
    </>
  );
};
