import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Swords, Sparkles, Trophy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useCommunityVotes } from '@/hooks/useCommunityVotes';
import { User } from '@supabase/supabase-js';

interface DailyCardVotePopupProps {
  className?: string;
}

export const DailyCardVotePopup = ({ className }: DailyCardVotePopupProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [votingFor, setVotingFor] = useState<'card_a' | 'card_b' | null>(null);
  const [voted, setVoted] = useState(false);

  const { todaysPoll, hasVotedToday, vote, loading } = useCommunityVotes(user?.id);

  const checkUser = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    
    setUser(authUser);

    // Check pro status
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('tier')
      .eq('user_id', authUser.id)
      .gte('expires_at', new Date().toISOString())
      .single();
    
    setIsPro(sub?.tier === 'pro' || sub?.tier === 'verified_seller');
  }, []);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  useEffect(() => {
    // Show popup if user is logged in, there's a poll, and they haven't voted
    if (user && todaysPoll && !hasVotedToday && !loading) {
      // Small delay to not overlap with daily XP popup
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [user, todaysPoll, hasVotedToday, loading]);

  const handleVote = async (choice: 'card_a' | 'card_b') => {
    setVotingFor(choice);
    const success = await vote(choice, isPro);
    if (success) {
      setVoted(true);
      setTimeout(() => setDismissed(true), 2500);
    }
    setVotingFor(null);
  };

  if (dismissed || !isVisible || !todaysPoll || hasVotedToday) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 100, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 100, scale: 0.9 }}
        className={cn(
          "fixed top-32 right-4 z-50 w-80",
          className
        )}
      >
        <div className="relative overflow-hidden rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-950/20 via-background to-red-950/20 shadow-2xl backdrop-blur-sm">
          {/* Animated background */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute -top-1/2 -right-1/2 w-full h-full"
            >
              <Sparkles className="absolute top-1/4 left-1/4 w-4 h-4 text-orange-500/20" />
              <Trophy className="absolute top-1/2 left-1/3 w-3 h-3 text-yellow-500/20" />
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
            <div className="flex items-center gap-3 mb-4">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg"
              >
                <Swords className="w-5 h-5 text-white" />
              </motion.div>
              <div>
                <h3 className="font-display font-bold text-foreground text-sm">Daily Card Battle</h3>
                <p className="text-xs text-muted-foreground">Pick your champion for +{todaysPoll.xp_reward} XP</p>
              </div>
            </div>

            {voted ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-4"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <p className="font-bold text-foreground">Vote Recorded!</p>
                <p className="text-sm text-primary">+{todaysPoll.xp_reward} XP earned</p>
              </motion.div>
            ) : (
              <>
                {/* VS Battle Display */}
                <div className="flex items-center gap-2 mb-4">
                  {/* Card A */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleVote('card_a')}
                    disabled={votingFor !== null}
                    className={cn(
                      "flex-1 relative rounded-xl overflow-hidden border-2 transition-all",
                      votingFor === 'card_a' 
                        ? "border-orange-500 ring-2 ring-orange-500/50" 
                        : "border-border hover:border-orange-500/50"
                    )}
                  >
                    <div className="aspect-[3/4] relative">
                      {todaysPoll.card_a_image ? (
                        <img 
                          src={todaysPoll.card_a_image} 
                          alt={todaysPoll.card_a_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
                          <span className="text-2xl font-bold text-orange-500">A</span>
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <p className="text-xs font-medium text-white truncate">{todaysPoll.card_a_name}</p>
                      </div>
                    </div>
                    {votingFor === 'card_a' && (
                      <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full"
                        />
                      </div>
                    )}
                  </motion.button>

                  {/* VS */}
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">VS</span>
                    </div>
                  </div>

                  {/* Card B */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleVote('card_b')}
                    disabled={votingFor !== null}
                    className={cn(
                      "flex-1 relative rounded-xl overflow-hidden border-2 transition-all",
                      votingFor === 'card_b' 
                        ? "border-orange-500 ring-2 ring-orange-500/50" 
                        : "border-border hover:border-orange-500/50"
                    )}
                  >
                    <div className="aspect-[3/4] relative">
                      {todaysPoll.card_b_image ? (
                        <img 
                          src={todaysPoll.card_b_image} 
                          alt={todaysPoll.card_b_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <span className="text-2xl font-bold text-blue-500">B</span>
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <p className="text-xs font-medium text-white truncate">{todaysPoll.card_b_name}</p>
                      </div>
                    </div>
                    {votingFor === 'card_b' && (
                      <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"
                        />
                      </div>
                    )}
                  </motion.button>
                </div>

                {/* Pro badge */}
                {isPro && (
                  <div className="flex items-center justify-center gap-1 text-xs text-primary">
                    <Sparkles className="w-3 h-3" />
                    <span>Your Pro vote counts 2x!</span>
                  </div>
                )}

                {/* Vote count preview */}
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{todaysPoll.card_a_votes} votes</span>
                  <span>{todaysPoll.card_b_votes} votes</span>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
