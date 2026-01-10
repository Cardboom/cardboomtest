import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, Circle, Gift, ChevronDown, ChevronUp, 
  User, Wallet, ListPlus, ShoppingCart, Star, Sparkles,
  Trophy, X
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  icon: React.ReactNode;
  action: () => void;
  checkComplete: () => Promise<boolean>;
}

export const OnboardingChecklist = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [claimedRewards, setClaimedRewards] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const steps: OnboardingStep[] = [
    {
      id: 'profile',
      title: 'Complete Your Profile',
      description: 'Add avatar and display name',
      xpReward: 50,
      icon: <User className="w-4 h-4" />,
      action: () => navigate('/profile?tab=settings'),
      checkComplete: async () => {
        if (!user) return false;
        const { data } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', user.id)
          .single();
        return !!(data?.display_name && data?.avatar_url);
      }
    },
    {
      id: 'wallet',
      title: 'Add Funds to Wallet',
      description: 'Top up your CardBoom wallet',
      xpReward: 100,
      icon: <Wallet className="w-4 h-4" />,
      action: () => navigate('/wallet'),
      checkComplete: async () => {
        if (!user) return false;
        const { data } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .single();
        return (data?.balance || 0) > 0;
      }
    },
    {
      id: 'watchlist',
      title: 'Add to Watchlist',
      description: 'Track your favorite cards',
      xpReward: 25,
      icon: <Star className="w-4 h-4" />,
      action: () => navigate('/markets'),
      checkComplete: async () => {
        if (!user) return false;
        const { count } = await supabase
          .from('watchlist')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        return (count || 0) > 0;
      }
    },
    {
      id: 'listing',
      title: 'Create Your First Listing',
      description: 'List a card for sale',
      xpReward: 150,
      icon: <ListPlus className="w-4 h-4" />,
      action: () => navigate('/sell'),
      checkComplete: async () => {
        if (!user) return false;
        const { count } = await supabase
          .from('listings')
          .select('*', { count: 'exact', head: true })
          .eq('seller_id', user.id);
        return (count || 0) > 0;
      }
    },
    {
      id: 'purchase',
      title: 'Make Your First Purchase',
      description: 'Buy a collectible card',
      xpReward: 200,
      icon: <ShoppingCart className="w-4 h-4" />,
      action: () => navigate('/markets'),
      checkComplete: async () => {
        if (!user) return false;
        const { count } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('buyer_id', user.id);
        return (count || 0) > 0;
      }
    }
  ];

  const totalXP = steps.reduce((sum, step) => sum + step.xpReward, 0);
  const earnedXP = steps
    .filter(step => completedSteps.includes(step.id) && claimedRewards.includes(step.id))
    .reduce((sum, step) => sum + step.xpReward, 0);
  const progress = (completedSteps.length / steps.length) * 100;

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsVisible(false);
        setLoading(false);
        return;
      }
      
      setUser(session.user);
      
      // Load progress from database
      const { data: progressData } = await supabase
        .from('user_onboarding_progress')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (progressData) {
        setCompletedSteps(progressData.completed_steps || []);
        setClaimedRewards(progressData.claimed_rewards || []);
        
        // Hide if all completed
        if (progressData.completed_at) {
          setIsVisible(false);
        }
      }

      setLoading(false);
    };
    
    init();
  }, []);

  // Check step completion status
  useEffect(() => {
    if (!user || loading) return;

    const checkSteps = async () => {
      const newCompleted: string[] = [];
      
      for (const step of steps) {
        const isComplete = await step.checkComplete();
        if (isComplete) {
          newCompleted.push(step.id);
        }
      }

      if (newCompleted.length > completedSteps.length) {
        setCompletedSteps(newCompleted);
        
        // Update database
        await supabase
          .from('user_onboarding_progress')
          .upsert({
            user_id: user.id,
            completed_steps: newCompleted,
            claimed_rewards: claimedRewards,
            completed_at: newCompleted.length === steps.length ? new Date().toISOString() : null
          }, { onConflict: 'user_id' });
      }
    };

    checkSteps();
  }, [user, loading]);

  const claimReward = async (stepId: string, xpReward: number) => {
    if (!user || claimedRewards.includes(stepId)) return;

    const newClaimed = [...claimedRewards, stepId];
    setClaimedRewards(newClaimed);

    // Update XP
    const { data: profile } = await supabase
      .from('profiles')
      .select('xp')
      .eq('id', user.id)
      .single();

    await supabase
      .from('profiles')
      .update({ xp: (profile?.xp || 0) + xpReward })
      .eq('id', user.id);

    // Update progress
    await supabase
      .from('user_onboarding_progress')
      .upsert({
        user_id: user.id,
        completed_steps: completedSteps,
        claimed_rewards: newClaimed,
        total_xp_earned: earnedXP + xpReward
      }, { onConflict: 'user_id' });

    toast.success(`+${xpReward} XP Claimed!`, {
      icon: <Sparkles className="w-4 h-4 text-primary" />
    });
  };

  const handleDismiss = async () => {
    setIsVisible(false);
    if (user) {
      await supabase
        .from('user_onboarding_progress')
        .upsert({
          user_id: user.id,
          completed_steps: completedSteps,
          claimed_rewards: claimedRewards,
          completed_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
    }
  };

  if (!isVisible || loading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-20 right-4 z-50 w-80"
    >
      <Card className="bg-card/95 backdrop-blur-md border-primary/20 shadow-xl">
        <CardContent className="p-0">
          {/* Header */}
          <div 
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Get Started</h3>
                <p className="text-xs text-muted-foreground">
                  {completedSteps.length}/{steps.length} completed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                +{totalXP - earnedXP} XP
              </Badge>
              <button 
                onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-4 h-4" />
              </button>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="px-4 pb-2">
            <Progress value={progress} className="h-1.5" />
          </div>

          {/* Steps */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-2">
                  {steps.map((step) => {
                    const isCompleted = completedSteps.includes(step.id);
                    const isClaimed = claimedRewards.includes(step.id);

                    return (
                      <motion.div
                        key={step.id}
                        className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                          isCompleted 
                            ? 'bg-gain/10 border border-gain/20' 
                            : 'bg-muted/30 hover:bg-muted/50'
                        }`}
                        layout
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isCompleted ? 'bg-gain/20 text-gain' : 'bg-muted text-muted-foreground'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            step.icon
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${isCompleted ? 'text-gain' : 'text-foreground'}`}>
                            {step.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {step.description}
                          </p>
                        </div>
                        {isCompleted ? (
                          isClaimed ? (
                            <Badge variant="outline" className="text-xs bg-gain/10 text-gain border-gain/30">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              +{step.xpReward}
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 border-primary/30 hover:bg-primary/10"
                              onClick={() => claimReward(step.id, step.xpReward)}
                            >
                              <Gift className="w-3 h-3" />
                              Claim
                            </Button>
                          )
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={step.action}
                          >
                            Go
                          </Button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};
