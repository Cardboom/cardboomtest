import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Gift, Package, Zap, ArrowRight, Crown, Clock, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface UserGradingStatus {
  creditsRemaining: number;
  signupCreditClaimed: boolean;
  isVerified: boolean;
  subscriptionTier: string | null;
}

export const GradingUserStatusBanner: React.FC = () => {
  const [status, setStatus] = useState<UserGradingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      
      setUserId(user.id);

      // Fetch credits
      const { data: creditsData } = await supabase
        .from('grading_credits')
        .select('credits_remaining, signup_credit_claimed')
        .eq('user_id', user.id)
        .maybeSingle();

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('phone, national_id')
        .eq('id', user.id)
        .single();

      // Fetch subscription - workaround for TS2589
      let subscriptionTier: string | null = null;
      try {
        const { data: subData } = await (supabase
          .from('user_subscriptions')
          .select('tier')
          .eq('user_id', user.id) as any)
          .eq('status', 'active')
          .limit(1);
        subscriptionTier = subData?.[0]?.tier || null;
      } catch {
        // Ignore subscription fetch errors
      }

      const hasPhone = profileData?.phone && profileData.phone.trim() !== '';
      const hasNationalId = profileData?.national_id && profileData.national_id.trim() !== '';
      
      setStatus({
        creditsRemaining: creditsData?.credits_remaining || 0,
        signupCreditClaimed: creditsData?.signup_credit_claimed || false,
        isVerified: !!(hasPhone && hasNationalId),
        subscriptionTier: subscriptionTier,
      });
      
      setLoading(false);
    };

    fetchStatus();
  }, []);

  if (loading) return null;
  if (!userId) return null;

  // Show pending free credit for unverified users
  if (!status?.signupCreditClaimed && !status?.isVerified) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Card className="p-4 bg-gradient-to-r from-yellow-500/10 via-orange-500/5 to-transparent border-yellow-500/30">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 shrink-0">
                <Gift className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-foreground">Unlock Your Free AI Grading</h3>
                  <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
                    <Zap className="w-3 h-3 mr-1" />
                    5-Min Results
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Verify your phone & ID to get <strong>1 completely free grading</strong> with instant results!
                </p>
              </div>
            </div>
            <Button 
              size="sm"
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shrink-0"
              onClick={() => navigate('/settings')}
            >
              Verify Now <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Show available credits
  if (status?.creditsRemaining > 0) {
    const isFirstFree = status.signupCreditClaimed && status.creditsRemaining === 1;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Card className="p-4 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-foreground">
                    {isFirstFree 
                      ? '🎉 First Free Grading Ready!' 
                      : `${status.creditsRemaining} Free Grading Credit${status.creditsRemaining > 1 ? 's' : ''}`
                    }
                  </h3>
                  {isFirstFree && (
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      <Clock className="w-3 h-3 mr-1" />
                      5-Min Results
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {isFirstFree 
                    ? "Your first grading is completely free - includes protection bundle & instant results!"
                    : `You have ${status.creditsRemaining} credit${status.creditsRemaining > 1 ? 's' : ''} to use. Applied automatically at checkout.`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-3xl font-black text-emerald-500">{status.creditsRemaining}</div>
                <div className="text-xs text-muted-foreground">Available</div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Show subscription perks if subscribed
  if (status?.subscriptionTier && ['pro', 'verified_seller', 'enterprise'].includes(status.subscriptionTier)) {
    const creditsPerMonth = status.subscriptionTier === 'enterprise' ? 2 : 1;
    const tierLabel = status.subscriptionTier === 'enterprise' ? 'Enterprise' : 
                      status.subscriptionTier === 'verified_seller' ? 'Verified Seller' : 'Pro';
    
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Card className="p-4 bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/30">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 shrink-0">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-foreground">{tierLabel} Member</h3>
                  <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30">
                    <Shield className="w-3 h-3 mr-1" />
                    Premium
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {creditsPerMonth} free grading{creditsPerMonth > 1 ? 's' : ''} every month + priority support
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-purple-500/30 text-purple-600 hover:bg-purple-500/10"
              onClick={() => navigate('/grading/credits')}
            >
              <Package className="w-4 h-4 mr-1" />
              Buy Credits
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Show bulk purchase option for non-subscribers without credits
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className="p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/30">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-primary to-primary/80 shrink-0">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Save with Bulk Credits</h3>
              <p className="text-sm text-muted-foreground">
                Buy credit packs and save up to 50% on grading fees
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-primary/30"
            onClick={() => navigate('/grading/credits')}
          >
            View Packs <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};
