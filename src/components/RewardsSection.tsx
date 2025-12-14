import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Star, Truck, Sparkles, Clock, Check, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Reward {
  id: string;
  name: string;
  description: string;
  type: string;
  xp_cost: number;
  value_amount: number | null;
  stock: number | null;
}

interface RewardsSectionProps {
  userXP: number;
  onRewardClaimed?: () => void;
}

export const RewardsSection = ({ userXP, onRewardClaimed }: RewardsSectionProps) => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    const { data, error } = await supabase
      .from('rewards_catalog')
      .select('*')
      .eq('is_active', true)
      .order('xp_cost', { ascending: true });

    if (!error && data) {
      setRewards(data);
    }
    setLoading(false);
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'voucher':
        return <Gift className="w-6 h-6" />;
      case 'free_shipping':
        return <Truck className="w-6 h-6" />;
      case 'early_access':
        return <Clock className="w-6 h-6" />;
      case 'exclusive_drop':
        return <Sparkles className="w-6 h-6" />;
      default:
        return <Star className="w-6 h-6" />;
    }
  };

  const getRewardColor = (type: string) => {
    switch (type) {
      case 'voucher':
        return 'from-cyan-500 to-teal-600';
      case 'free_shipping':
        return 'from-blue-500 to-cyan-600';
      case 'early_access':
        return 'from-purple-500 to-pink-600';
      case 'exclusive_drop':
        return 'from-yellow-500 to-orange-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const handleClaimReward = async (reward: Reward) => {
    if (userXP < reward.xp_cost) {
      toast.error(`You need ${reward.xp_cost - userXP} more XP to claim this reward`);
      return;
    }

    setClaiming(reward.id);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to claim rewards');
        return;
      }

      // Generate unique reward code
      const rewardCode = `CB-${reward.type.toUpperCase().slice(0, 3)}-${Date.now().toString(36).toUpperCase()}`;

      // Insert claimed reward
      const { error } = await supabase
        .from('user_rewards')
        .insert({
          user_id: user.id,
          reward_id: reward.id,
          code: rewardCode,
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
        });

      if (error) throw error;

      toast.success(
        <div className="space-y-1">
          <p className="font-semibold">Reward Claimed! 🎉</p>
          <p className="text-sm">Code: {rewardCode}</p>
        </div>
      );

      onRewardClaimed?.();
    } catch (error) {
      toast.error('Failed to claim reward');
    } finally {
      setClaiming(null);
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-platinum/20 rounded w-32" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-platinum/10 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center">
            <Gift className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-platinum">Rewards Shop</h3>
            <p className="text-platinum/60 text-sm">Redeem your XP for exclusive rewards</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-gold font-bold text-xl">{userXP.toLocaleString()}</p>
          <p className="text-platinum/50 text-xs">Available XP</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {rewards.map((reward, index) => {
            const canAfford = userXP >= reward.xp_cost;
            const isOutOfStock = reward.stock !== null && reward.stock <= 0;

            return (
              <motion.div
                key={reward.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative rounded-xl border overflow-hidden transition-all duration-300 ${
                  canAfford && !isOutOfStock
                    ? 'border-gold/30 hover:border-gold/60 hover:shadow-lg hover:shadow-gold/10'
                    : 'border-platinum/10 opacity-60'
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${getRewardColor(reward.type)} opacity-5`} />
                
                <div className="relative p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getRewardColor(reward.type)} flex items-center justify-center text-white`}>
                      {getRewardIcon(reward.type)}
                    </div>
                    {reward.stock !== null && (
                      <span className="px-2 py-1 rounded-full bg-platinum/10 text-platinum/60 text-xs">
                        {reward.stock} left
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-platinum font-semibold">{reward.name}</h4>
                    <p className="text-platinum/60 text-sm">{reward.description}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-gold" />
                      <span className="text-gold font-bold">{reward.xp_cost.toLocaleString()} XP</span>
                    </div>

                    <Button
                      size="sm"
                      disabled={!canAfford || isOutOfStock || claiming === reward.id}
                      onClick={() => handleClaimReward(reward)}
                      className={`${
                        canAfford && !isOutOfStock
                          ? 'bg-gold hover:bg-gold/90 text-obsidian'
                          : 'bg-platinum/20 text-platinum/40'
                      }`}
                    >
                      {claiming === reward.id ? (
                        <span className="flex items-center gap-1">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          >
                            <Star className="w-4 h-4" />
                          </motion.div>
                          Claiming...
                        </span>
                      ) : isOutOfStock ? (
                        <span className="flex items-center gap-1">
                          <Lock className="w-4 h-4" />
                          Sold Out
                        </span>
                      ) : canAfford ? (
                        <span className="flex items-center gap-1">
                          <Check className="w-4 h-4" />
                          Claim
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Lock className="w-4 h-4" />
                          {(reward.xp_cost - userXP).toLocaleString()} more
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
