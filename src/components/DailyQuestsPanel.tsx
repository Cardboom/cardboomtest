import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Flame, Trophy, Gift, Zap, Star, Target, 
  TrendingUp, Crown, Sparkles, Calendar, CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedCounter } from './AnimatedCounter';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface DailyQuestsPanelProps {
  xp: number;
  level: number;
  streak: number;
}

interface Quest {
  id: number;
  title: string;
  xp: number;
  icon: any;
  progress: number;
  target: number;
  type: string;
  completed?: boolean;
  claimed?: boolean;
}

const INITIAL_QUESTS: Quest[] = [
  { id: 1, title: 'First Trade of the Day', xp: 50, icon: Zap, progress: 0, target: 1, type: 'trade' },
  { id: 2, title: 'Add 3 Items to Watchlist', xp: 25, icon: Star, progress: 2, target: 3, type: 'watchlist' },
  { id: 3, title: 'View 5 Market Items', xp: 15, icon: Target, progress: 5, target: 5, type: 'view', completed: true },
  { id: 4, title: 'Share a Listing', xp: 30, icon: Gift, progress: 0, target: 1, type: 'share' },
];

const ACHIEVEMENTS = [
  { id: 1, title: 'First Steps', icon: '🚀', unlocked: true, description: 'Complete your first trade' },
  { id: 2, title: 'Collector', icon: '💎', unlocked: true, description: 'Add 10 items to portfolio' },
  { id: 3, title: 'Trader', icon: '📈', unlocked: false, description: 'Complete 50 trades' },
  { id: 4, title: 'Whale', icon: '🐋', unlocked: false, description: 'Trade over $10,000 in volume' },
];

export const DailyQuestsPanel = ({ xp, level, streak }: DailyQuestsPanelProps) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [quests, setQuests] = useState<Quest[]>(INITIAL_QUESTS);
  const [dailyXPEarned, setDailyXPEarned] = useState(90);
  const dailyXPGoal = 200;

  const handleClaimReward = (questId: number) => {
    const quest = quests.find(q => q.id === questId);
    if (!quest || !quest.completed || quest.claimed) return;
    
    setQuests(prev => prev.map(q => 
      q.id === questId ? { ...q, claimed: true } : q
    ));
    setDailyXPEarned(prev => prev + quest.xp);
    toast.success(`+${quest.xp} XP claimed!`);
  };

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${hours}h ${minutes}m`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, []);

  const completedQuests = quests.filter(q => q.completed).length;
  const claimedQuests = quests.filter(q => q.claimed).length;

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card to-card/50">
      <CardContent className="p-0">
        {/* Header with Streak */}
        <div className="p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center glow-pulse">
                  <Flame className="w-6 h-6 text-primary-foreground" />
                </div>
                <Badge className="absolute -bottom-1 -right-1 px-1.5 py-0.5 text-[10px] bg-gold text-background">
                  {streak}
                </Badge>
              </div>
              <div>
                <h3 className="font-display text-lg font-bold flex items-center gap-2">
                  Daily Quests
                  <Badge variant="outline" className="text-xs gap-1">
                    <Calendar className="w-3 h-3" />
                    {timeLeft}
                  </Badge>
                </h3>
                <p className="text-sm text-muted-foreground">
                  {completedQuests}/{quests.length} completed
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Today's XP</p>
              <p className="font-display text-xl font-bold text-primary">
                <AnimatedCounter value={dailyXPEarned} /> / {dailyXPGoal}
              </p>
            </div>
          </div>
          <Progress value={(dailyXPEarned / dailyXPGoal) * 100} className="mt-3 h-2" />
        </div>

        {/* Quests List */}
        <div className="p-4 space-y-3">
          <AnimatePresence>
            {quests.map((quest, index) => (
              <motion.div
                key={quest.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-all",
                  quest.claimed 
                    ? "bg-gain/10 border border-gain/20 opacity-60" 
                    : quest.completed 
                      ? "bg-gold/10 border border-gold/20" 
                      : "bg-muted/50 hover:bg-muted border border-transparent"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  quest.claimed ? "bg-gain/20" : quest.completed ? "bg-gold/20" : "bg-secondary"
                )}>
                  {quest.claimed ? (
                    <CheckCircle className="w-5 h-5 text-gain" />
                  ) : (
                    <quest.icon className={cn(
                      "w-5 h-5",
                      quest.completed ? "text-gold" : "text-muted-foreground"
                    )} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium text-sm",
                    quest.claimed && "line-through text-muted-foreground"
                  )}>
                    {quest.title}
                  </p>
                  {!quest.completed && (
                    <Progress 
                      value={(quest.progress / quest.target) * 100} 
                      className="h-1.5 mt-1.5" 
                    />
                  )}
                </div>
                {quest.completed && !quest.claimed ? (
                  <Button 
                    size="sm" 
                    variant="default"
                    className="shrink-0 bg-gold hover:bg-gold/90 text-background"
                    onClick={() => handleClaimReward(quest.id)}
                  >
                    Claim +{quest.xp} XP
                  </Button>
                ) : (
                  <Badge 
                    variant={quest.claimed ? "default" : "secondary"}
                    className={cn(
                      "shrink-0",
                      quest.claimed && "bg-gain text-gain-foreground"
                    )}
                  >
                    {quest.claimed ? 'Claimed' : `+${quest.xp} XP`}
                  </Badge>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Achievements Row */}
        <div className="px-4 pb-4">
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-semibold">Achievements</p>
          <div className="flex gap-2">
            {ACHIEVEMENTS.map((achievement) => (
              <div
                key={achievement.id}
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all",
                  achievement.unlocked 
                    ? "bg-gold/20 border border-gold/30 hover:scale-110 cursor-pointer" 
                    : "bg-muted/50 grayscale opacity-50"
                )}
                title={achievement.title}
              >
                {achievement.icon}
              </div>
            ))}
          </div>
        </div>

        {/* Bonus Streak */}
        {streak >= 7 && (
          <div className="mx-4 mb-4 p-3 rounded-xl bg-gradient-to-r from-gold/20 to-gold/10 border border-gold/30">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-gold" />
              <div>
                <p className="text-sm font-semibold text-gold">7-Day Streak Bonus!</p>
                <p className="text-xs text-muted-foreground">2x XP on all activities</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
