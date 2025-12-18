import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, X, Flame, Sparkles, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DailyXPClaimNotificationProps {
  className?: string;
}

export const DailyXPClaimNotification = ({ className }: DailyXPClaimNotificationProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [xpReward, setXpReward] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  const checkDailyLogin = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUser(user);
      const today = new Date().toISOString().split('T')[0];

      // Check if already logged in today
      const { data: todayLogin } = await supabase
        .from('daily_logins')
        .select('*')
        .eq('user_id', user.id)
        .eq('login_date', today)
        .single();

      if (todayLogin) {
        // Already claimed today
        setIsVisible(false);
        return;
      }

      // Get yesterday's login to calculate streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const { data: yesterdayLogin } = await supabase
        .from('daily_logins')
        .select('streak_count')
        .eq('user_id', user.id)
        .eq('login_date', yesterdayStr)
        .single();

      const newStreak = yesterdayLogin ? (yesterdayLogin.streak_count || 0) + 1 : 1;
      setCurrentStreak(newStreak);

      // Calculate XP reward
      const baseXP = 10;
      const streakBonus = Math.min(newStreak * 5, 50);
      setXpReward(baseXP + streakBonus);

      setIsVisible(true);
    } catch (error) {
      console.error('Error checking daily login:', error);
    }
  }, []);

  useEffect(() => {
    checkDailyLogin();
  }, [checkDailyLogin]);

  const claimDailyXP = async () => {
    if (!user || isClaiming) return;

    setIsClaiming(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get yesterday's streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const { data: yesterdayLogin } = await supabase
        .from('daily_logins')
        .select('streak_count')
        .eq('user_id', user.id)
        .eq('login_date', yesterdayStr)
        .single();

      const newStreak = yesterdayLogin ? (yesterdayLogin.streak_count || 0) + 1 : 1;

      // Insert today's login
      const { error: insertError } = await supabase
        .from('daily_logins')
        .insert({
          user_id: user.id,
          login_date: today,
          streak_count: newStreak
        });

      if (insertError) throw insertError;

      // Calculate XP
      const baseXP = 10;
      const streakBonus = Math.min(newStreak * 5, 50);
      const totalXP = baseXP + streakBonus;

      // Check if user is beta tester
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_beta_tester, xp, level')
        .eq('id', user.id)
        .single();

      const finalXP = profile?.is_beta_tester ? totalXP * 2 : totalXP;

      // Insert XP history
      await supabase
        .from('xp_history')
        .insert({
          user_id: user.id,
          action: 'daily_login',
          xp_earned: finalXP,
          description: `Daily login - Day ${newStreak} streak${profile?.is_beta_tester ? ' (2x Beta Bonus!)' : ''}`
        });

      // Update profile XP
      const newXP = (profile?.xp || 0) + finalXP;
      const newLevel = Math.floor(Math.sqrt(newXP / 100)) + 1;

      await supabase
        .from('profiles')
        .update({ xp: newXP, level: newLevel })
        .eq('id', user.id);

      // Check for milestone bonuses
      if (newStreak === 7 || newStreak === 30 || newStreak === 100) {
        const bonusXP = newStreak === 7 ? 100 : newStreak === 30 ? 500 : 1000;
        const finalBonusXP = profile?.is_beta_tester ? bonusXP * 2 : bonusXP;
        
        await supabase
          .from('xp_history')
          .insert({
            user_id: user.id,
            action: 'streak_bonus',
            xp_earned: finalBonusXP,
            description: `${newStreak}-day streak milestone!${profile?.is_beta_tester ? ' (2x Beta Bonus!)' : ''}`
          });

        await supabase
          .from('profiles')
          .update({ xp: newXP + finalBonusXP })
          .eq('id', user.id);

        toast.success(`🎉 ${newStreak}-Day Streak Milestone! +${finalBonusXP} Bonus XP!`);
      }

      toast.success(`🔥 Day ${newStreak} Streak! +${finalXP} XP claimed!`);
      setIsVisible(false);
    } catch (error) {
      console.error('Error claiming daily XP:', error);
      toast.error('Failed to claim daily XP');
    } finally {
      setIsClaiming(false);
    }
  };

  if (!isVisible || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className={cn(
          "fixed top-36 right-4 z-50 max-w-sm",
          className
        )}
      >
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-accent/10 shadow-xl backdrop-blur-sm">
          {/* Animated background sparkles */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-1/2 -right-1/2 w-full h-full"
            >
              <Sparkles className="absolute top-1/4 left-1/4 w-4 h-4 text-primary/20" />
              <Star className="absolute top-1/2 left-1/3 w-3 h-3 text-accent/20" />
              <Sparkles className="absolute top-3/4 left-1/2 w-5 h-5 text-primary/15" />
            </motion.div>
          </div>

          {/* Close button */}
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-secondary/50 transition-colors z-10"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          <div className="relative p-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg"
              >
                <Gift className="w-6 h-6 text-primary-foreground" />
              </motion.div>
              <div>
                <h3 className="font-display font-bold text-foreground">Daily XP Ready!</h3>
                <p className="text-sm text-muted-foreground">Claim your login reward</p>
              </div>
            </div>

            {/* Streak info */}
            <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-secondary/50">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-medium text-foreground">
                {currentStreak > 1 ? `Day ${currentStreak} Streak` : 'Start your streak!'}
              </span>
              <span className="ml-auto text-sm font-bold text-primary">
                +{xpReward} XP
              </span>
            </div>

            {/* Claim button */}
            <Button
              onClick={claimDailyXP}
              disabled={isClaiming}
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground font-bold"
            >
              {isClaiming ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                </motion.div>
              ) : (
                <Gift className="w-4 h-4 mr-2" />
              )}
              {isClaiming ? 'Claiming...' : 'Claim Daily XP'}
            </Button>

            {/* Streak milestones hint */}
            {currentStreak >= 5 && currentStreak < 7 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                🎯 {7 - currentStreak} more days for 100 bonus XP!
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
