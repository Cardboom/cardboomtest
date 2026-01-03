import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Apple, Play, Gift, Check, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface AppRatingRewardProps {
  className?: string;
}

export const AppRatingReward = ({ className }: AppRatingRewardProps) => {
  const [hasClaimed, setHasClaimed] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [hasClicked, setHasClicked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkClaimStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUserId(user.id);
      
      // Check if user already claimed this achievement
      const { data } = await supabase
        .from('user_achievements')
        .select('id')
        .eq('user_id', user.id)
        .eq('achievement_id', (
          await supabase
            .from('achievements')
            .select('id')
            .eq('key', 'app_rating')
            .single()
        ).data?.id)
        .maybeSingle();
      
      if (data) {
        setHasClaimed(true);
      }
    };
    
    checkClaimStatus();
  }, []);

  const handleStoreClick = (store: 'ios' | 'android') => {
    setHasClicked(true);
    // Open the respective store - these would be your actual app links
    const urls = {
      ios: 'https://apps.apple.com/app/cardboom', // Replace with actual App Store URL
      android: 'https://play.google.com/store/apps/details?id=com.cardboom.app' // Replace with actual Play Store URL
    };
    window.open(urls[store], '_blank');
  };

  const handleClaimReward = async () => {
    if (!userId || !hasClicked || hasClaimed) return;
    
    setIsClaiming(true);
    
    try {
      // Get the achievement
      const { data: achievement } = await supabase
        .from('achievements')
        .select('id, xp_reward')
        .eq('key', 'app_rating')
        .single();
      
      if (!achievement) throw new Error('Achievement not found');
      
      // Check if already claimed
      const { data: existing } = await supabase
        .from('user_achievements')
        .select('id')
        .eq('user_id', userId)
        .eq('achievement_id', achievement.id)
        .maybeSingle();
      
      if (existing) {
        setHasClaimed(true);
        return;
      }
      
      // Award the achievement
      await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: achievement.id
        });
      
      // Award gems (10 gems = XP reward)
      await supabase.rpc('earn_cardboom_points', {
        p_user_id: userId,
        p_transaction_amount: 5000, // 5000 * 0.002 = 10 gems
        p_source: 'app_rating',
        p_description: 'Thank you for rating CardBoom! 🌟'
      });
      
      setHasClaimed(true);
      
      toast({
        title: '🎉 +10 Gems Earned!',
        description: 'Thank you for rating CardBoom!',
      });
    } catch (error) {
      console.error('Error claiming reward:', error);
      toast({
        title: 'Error',
        description: 'Could not claim reward. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsClaiming(false);
    }
  };

  if (!userId) return null;

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
            <Star className="h-6 w-6 text-amber-400" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">Rate Our App</h3>
              <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                <Gift className="h-3 w-3 mr-1" />
                10 Gems
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">
              Rate CardBoom on the App Store or Google Play and earn 10 Gems!
            </p>
            
            <AnimatePresence mode="wait">
              {hasClaimed ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-emerald-500"
                >
                  <Check className="h-4 w-4" />
                  <span className="text-sm font-medium">Reward Claimed!</span>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-wrap gap-2"
                >
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStoreClick('ios')}
                    className="gap-1.5"
                  >
                    <Apple className="h-4 w-4" />
                    App Store
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStoreClick('android')}
                    className="gap-1.5"
                  >
                    <Play className="h-4 w-4" />
                    Google Play
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  </Button>
                  
                  {hasClicked && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <Button
                        size="sm"
                        onClick={handleClaimReward}
                        disabled={isClaiming}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                      >
                        {isClaiming ? 'Claiming...' : 'Claim 10 Gems'}
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
