import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { 
  Crown, Gem, Clock, Star, Zap, Shield, ChevronRight, ChevronLeft,
  Lock, Check, Gift, Sparkles, TrendingUp, Award, Trophy, Target,
  Flame, Diamond, Rocket
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useCardboomPass, PassTier } from '@/hooks/useCardboomPass';
import { useCardboomPoints } from '@/hooks/useCardboomPoints';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// Brawl Stars-style tier colors based on rarity
const getTierRarity = (tierNum: number) => {
  if (tierNum >= 28) return 'legendary'; // Gold/legendary
  if (tierNum >= 20) return 'epic'; // Purple/epic  
  if (tierNum >= 10) return 'rare'; // Blue/rare
  return 'common'; // Green/common
};

const rarityColors = {
  common: { bg: 'from-emerald-500/20 to-green-600/20', border: 'border-emerald-500/50', glow: 'shadow-emerald-500/30', text: 'text-emerald-400' },
  rare: { bg: 'from-blue-500/20 to-cyan-600/20', border: 'border-blue-500/50', glow: 'shadow-blue-500/30', text: 'text-blue-400' },
  epic: { bg: 'from-purple-500/20 to-violet-600/20', border: 'border-purple-500/50', glow: 'shadow-purple-500/30', text: 'text-purple-400' },
  legendary: { bg: 'from-amber-500/20 to-orange-600/20', border: 'border-amber-500/50', glow: 'shadow-amber-500/30', text: 'text-amber-400' }
};

// Animated countdown component
const CountdownUnit = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center">
    <motion.div 
      key={value}
      initial={{ scale: 1.2, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-b from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center"
    >
      <span className="text-xl sm:text-2xl font-bold text-foreground">{String(value).padStart(2, '0')}</span>
    </motion.div>
    <span className="text-[10px] sm:text-xs text-muted-foreground mt-1 uppercase tracking-wider">{label}</span>
  </div>
);

const SeasonCountdown = ({ timeRemaining }: { timeRemaining: { days: number; hours: number; minutes: number; seconds: number } }) => {
  const [time, setTime] = useState(timeRemaining);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(prev => {
        let { days, hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) { seconds = 59; minutes--; }
        if (minutes < 0) { minutes = 59; hours--; }
        if (hours < 0) { hours = 23; days--; }
        if (days < 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
        return { days, hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <CountdownUnit value={time.days} label="Days" />
      <span className="text-xl font-bold text-muted-foreground mb-4">:</span>
      <CountdownUnit value={time.hours} label="Hrs" />
      <span className="text-xl font-bold text-muted-foreground mb-4">:</span>
      <CountdownUnit value={time.minutes} label="Min" />
      <span className="text-xl font-bold text-muted-foreground mb-4 hidden sm:block">:</span>
      <div className="hidden sm:block">
        <CountdownUnit value={time.seconds} label="Sec" />
      </div>
    </div>
  );
};

// Reward icon based on type
const RewardIcon = ({ type, size = 'md' }: { type: string | null; size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';
  
  switch (type) {
    case 'gems': return <Gem className={cn(sizeClass, 'text-sky-400')} />;
    case 'discount_cap': return <TrendingUp className={cn(sizeClass, 'text-green-400')} />;
    case 'cosmetic': return <Sparkles className={cn(sizeClass, 'text-purple-400')} />;
    case 'badge': return <Award className={cn(sizeClass, 'text-amber-400')} />;
    case 'priority': return <Zap className={cn(sizeClass, 'text-orange-400')} />;
    case 'grading': return <Shield className={cn(sizeClass, 'text-cyan-400')} />;
    default: return <Gift className={cn(sizeClass, 'text-muted-foreground')} />;
  }
};

// Brawl Stars-style horizontal tier road
const TierRoad = ({ 
  tiers, 
  currentTier, 
  isPro, 
  progressPercent,
  onTierClick
}: { 
  tiers: PassTier[];
  currentTier: number;
  isPro: boolean;
  progressPercent: number;
  onTierClick: (tier: PassTier) => void;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    // Auto-scroll to current tier
    if (scrollRef.current && currentTier > 3) {
      const tierElement = scrollRef.current.querySelector(`[data-tier="${currentTier}"]`);
      if (tierElement) {
        tierElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [currentTier, tiers]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(checkScroll, 300);
    }
  };

  return (
    <div className="relative">
      {/* Scroll buttons */}
      <AnimatePresence>
        {canScrollLeft && (
          <motion.button
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-background/90 border border-border shadow-lg flex items-center justify-center hover:bg-primary/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
        )}
        {canScrollRight && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-background/90 border border-border shadow-lg flex items-center justify-center hover:bg-primary/10 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Road container */}
      <div 
        ref={scrollRef}
        onScroll={checkScroll}
        className="overflow-x-auto scrollbar-hide px-12 py-8"
      >
        <div className="flex items-center gap-0 min-w-max">
          {tiers.map((tier, index) => {
            const isUnlocked = tier.tier_number <= currentTier;
            const isCurrent = tier.tier_number === currentTier;
            const isNext = tier.tier_number === currentTier + 1;
            const rarity = getTierRarity(tier.tier_number);
            const colors = rarityColors[rarity];

            return (
              <div key={tier.id} className="flex items-center" data-tier={tier.tier_number}>
                {/* Connector line */}
                {index > 0 && (
                  <div className="relative w-8 h-1">
                    <div className="absolute inset-0 bg-border/50 rounded-full" />
                    {isUnlocked && (
                      <motion.div 
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        className="absolute inset-0 bg-gradient-to-r from-primary to-primary/50 rounded-full origin-left"
                      />
                    )}
                  </div>
                )}

                {/* Tier node */}
                <motion.button
                  onClick={() => onTierClick(tier)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "relative flex flex-col items-center group",
                    isCurrent && "scale-110"
                  )}
                >
                  {/* Glow effect for current */}
                  {(isCurrent || isNext) && (
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className={cn(
                        "absolute inset-0 rounded-2xl blur-xl",
                        isCurrent ? "bg-primary/40" : "bg-muted/40"
                      )}
                    />
                  )}

                  {/* Main tier box */}
                  <div className={cn(
                    "relative w-16 h-20 sm:w-20 sm:h-24 rounded-xl border-2 flex flex-col items-center justify-center transition-all",
                    isUnlocked 
                      ? cn("bg-gradient-to-b", colors.bg, colors.border, "shadow-lg", colors.glow)
                      : "bg-card/50 border-border/50",
                    isCurrent && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}>
                    {/* Tier number */}
                    <div className={cn(
                      "absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-bold",
                      isUnlocked ? cn("bg-gradient-to-r", colors.bg.replace('/20', '/80'), "text-white") : "bg-muted text-muted-foreground"
                    )}>
                      {tier.tier_number}
                    </div>

                    {/* Free reward */}
                    <div className={cn(
                      "flex flex-col items-center justify-center p-1.5 rounded-lg w-full",
                      isUnlocked ? "opacity-100" : "opacity-50"
                    )}>
                      <RewardIcon type={tier.free_reward_type} size="sm" />
                      {tier.free_reward_type === 'gems' && (
                        <span className="text-[10px] font-bold mt-0.5">{tier.free_reward_value?.amount}</span>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="w-10 h-px bg-border/50 my-1" />

                    {/* Pro reward */}
                    <div className={cn(
                      "flex flex-col items-center justify-center p-1.5 rounded-lg w-full relative",
                      isPro && isUnlocked ? "opacity-100" : "opacity-40"
                    )}>
                      {!isPro && <Lock className="w-3 h-3 absolute top-0 right-1 text-amber-500/70" />}
                      <RewardIcon type={tier.pro_reward_type} size="sm" />
                      {tier.pro_reward_type === 'gems' && (
                        <span className="text-[10px] font-bold mt-0.5 text-amber-400">{tier.pro_reward_value?.amount}</span>
                      )}
                    </div>

                    {/* Claimed checkmark */}
                    {isUnlocked && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"
                      >
                        <Check className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                  </div>

                  {/* XP requirement */}
                  <div className="mt-4 text-center">
                    <span className={cn(
                      "text-[10px] font-medium",
                      isUnlocked ? colors.text : "text-muted-foreground"
                    )}>
                      +{tier.xp_required} XP
                    </span>
                  </div>

                  {/* Current tier indicator */}
                  {isCurrent && (
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute -top-8"
                    >
                      <div className="px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        YOU
                      </div>
                    </motion.div>
                  )}
                </motion.button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// XP progress bar with animated fill
const XPProgressBar = ({ 
  current, 
  required, 
  percent, 
  totalXp 
}: { 
  current: number; 
  required: number; 
  percent: number; 
  totalXp: number;
}) => (
  <div className="relative">
    <div className="h-6 rounded-full bg-muted/50 border border-border/50 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="h-full bg-gradient-to-r from-primary via-primary to-cyan-400 relative"
      >
        {/* Shine effect */}
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
        />
      </motion.div>
    </div>
    <div className="flex justify-between mt-2 text-sm">
      <span className="text-muted-foreground">{current.toLocaleString()} / {required.toLocaleString()} XP</span>
      <span className="font-medium text-primary">{Math.round(percent)}%</span>
    </div>
  </div>
);

// How to earn XP section
const EarnXPGuide = () => {
  const ways = [
    { icon: TrendingUp, label: 'Buy Cards', xp: '$1 = 1 XP', color: 'text-green-400' },
    { icon: Trophy, label: 'Sell Cards', xp: '$1 = 1 XP', color: 'text-blue-400' },
    { icon: Shield, label: 'Grade a Card', xp: '500 XP', color: 'text-purple-400' },
    { icon: Gem, label: 'Top Up Wallet', xp: '$1 = 1 XP', color: 'text-amber-400' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {ways.map((way, i) => (
        <motion.div
          key={way.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex flex-col items-center p-4 rounded-xl bg-card/50 border border-border/50 hover:border-primary/30 transition-colors"
        >
          <way.icon className={cn("w-6 h-6 mb-2", way.color)} />
          <span className="text-xs font-medium text-foreground">{way.label}</span>
          <span className="text-[10px] text-muted-foreground">{way.xp}</span>
        </motion.div>
      ))}
    </div>
  );
};

const CardBoomPass = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const [purchasing, setPurchasing] = useState(false);
  const [selectedTier, setSelectedTier] = useState<PassTier | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id);
    });
  }, []);

  const { 
    season, 
    tiers, 
    progress, 
    loading, 
    purchaseProPass, 
    getProgressToNextTier,
    getSeasonTimeRemaining,
    getTotalXpRequired
  } = useCardboomPass(userId);
  
  const { balance } = useCardboomPoints(userId);
  const progressToNext = getProgressToNextTier();
  const timeRemaining = getSeasonTimeRemaining();

  const handlePurchasePro = async () => {
    setPurchasing(true);
    const success = await purchaseProPass();
    if (success) {
      toast.success('Pro Pass Activated! 🎉', {
        description: 'You now earn gems at 1.25× rate!'
      });
    }
    setPurchasing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Crown className="w-12 h-12 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>CardBoom Pass | Season {season?.season_number || 1}</title>
        <meta name="description" content="Progress through tiers, earn gems, and unlock exclusive rewards with CardBoom Pass." />
      </Helmet>

      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Animated background */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-purple-500/5" />
          <motion.div
            animate={{ 
              backgroundPosition: ['0% 0%', '100% 100%'],
            }}
            transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse' }}
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.1) 0%, transparent 50%)',
              backgroundSize: '100% 100%'
            }}
          />
        </div>

        <Header cartCount={0} onCartClick={() => {}} />

        <main className="container mx-auto px-4 pt-20 pb-16 relative z-10">
          {/* Hero Section */}
          <motion.section 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-card via-card/80 to-primary/10">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

              <div className="relative p-6 sm:p-10">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  {/* Left: Season info */}
                  <div className="flex items-start gap-4">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-xl shadow-amber-500/30"
                    >
                      <Crown className="w-10 h-10 text-white" />
                    </motion.div>
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-bold mb-1">CardBoom Pass</h1>
                      <p className="text-lg text-muted-foreground">{season?.name || 'Season 1'}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {progress?.is_pro ? (
                          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                            <Crown className="w-3 h-3 mr-1" /> PRO ACTIVE
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-muted-foreground/30">FREE TRACK</Badge>
                        )}
                        <Badge variant="outline" className="border-primary/30 text-primary">
                          Tier {progress?.current_tier || 0}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Right: Countdown */}
                  <div className="flex flex-col items-start lg:items-end gap-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Clock className="w-4 h-4" />
                      <span>Season ends in</span>
                    </div>
                    <SeasonCountdown timeRemaining={timeRemaining} />
                  </div>
                </div>

                {/* XP Progress */}
                {userId && (
                  <div className="mt-8 p-6 rounded-2xl bg-background/60 backdrop-blur-sm border border-border/50">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-4xl font-bold text-primary">{progress?.current_tier || 0}</span>
                          <span className="text-muted-foreground ml-1">/ 30</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        <div className="flex items-center gap-2">
                          <Flame className="w-5 h-5 text-orange-500" />
                          <span className="text-lg font-medium">Tier {(progress?.current_tier || 0) + 1}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500/10 border border-sky-500/30">
                        <Gem className="w-5 h-5 text-sky-400" />
                        <span className="font-bold text-sky-400">{balance.toLocaleString()}</span>
                      </div>
                    </div>
                    <XPProgressBar {...progressToNext} />
                  </div>
                )}
              </div>
            </div>
          </motion.section>

          {/* Pro Upgrade CTA */}
          {userId && !progress?.is_pro && (
            <motion.section 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8"
            >
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border border-amber-500/30 p-6">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-50" />
                
                <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/40"
                    >
                      <Rocket className="w-8 h-8 text-white" />
                    </motion.div>
                    <div>
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        Upgrade to Pro Pass
                        <Badge className="bg-amber-500 text-white border-0">$10</Badge>
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        1.25× gem rate • Exclusive rewards • Priority perks
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="lg"
                    onClick={handlePurchasePro}
                    disabled={purchasing}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/30 min-w-[140px]"
                  >
                    {purchasing ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
                        <Zap className="w-5 h-5" />
                      </motion.div>
                    ) : (
                      <>
                        <Crown className="w-5 h-5 mr-2" />
                        Get Pro
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.section>
          )}

          {/* Tier Road */}
          <motion.section 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
              <div className="p-4 border-b border-border/30 flex items-center justify-between">
                <h2 className="font-bold flex items-center gap-2">
                  <Diamond className="w-5 h-5 text-primary" />
                  Reward Road
                </h2>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-muted-foreground">Common</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-muted-foreground">Rare</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    <span className="text-muted-foreground">Epic</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-muted-foreground">Legendary</span>
                  </div>
                </div>
              </div>
              
              <TierRoad 
                tiers={tiers}
                currentTier={progress?.current_tier || 0}
                isPro={progress?.is_pro || false}
                progressPercent={progressToNext.percent}
                onTierClick={(tier) => setSelectedTier(tier)}
              />
            </div>
          </motion.section>

          {/* How to Earn XP */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400" />
              How to Earn XP
            </h2>
            <EarnXPGuide />
          </motion.section>

          {/* Not logged in CTA */}
          {!userId && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Crown className="w-16 h-16 text-primary mx-auto mb-4 opacity-50" />
              <h2 className="text-2xl font-bold mb-2">Join CardBoom Pass</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Sign in to start earning XP and unlock exclusive rewards through real trading activity.
              </p>
              <Button size="lg" onClick={() => navigate('/auth')}>
                Get Started
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.section>
          )}
        </main>

        <Footer />
      </div>

      {/* Tier detail modal */}
      <AnimatePresence>
        {selectedTier && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={() => setSelectedTier(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-card border border-border p-6"
            >
              <div className="text-center mb-6">
                <Badge className={cn("mb-2", rarityColors[getTierRarity(selectedTier.tier_number)].text)}>
                  Tier {selectedTier.tier_number}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Requires +{selectedTier.xp_required.toLocaleString()} XP
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Free Reward</div>
                  <div className="flex items-center gap-3">
                    <RewardIcon type={selectedTier.free_reward_type} size="lg" />
                    <div>
                      <div className="font-medium">
                        {selectedTier.free_reward_type === 'gems' && `${selectedTier.free_reward_value?.amount} Gems`}
                        {selectedTier.free_reward_type === 'badge' && selectedTier.free_reward_value?.name}
                        {selectedTier.free_reward_type === 'discount_cap' && `${selectedTier.free_reward_value?.percent}% Checkout Discount`}
                        {!selectedTier.free_reward_type && 'No reward'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30">
                  <div className="text-xs uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Pro Reward
                  </div>
                  <div className="flex items-center gap-3">
                    <RewardIcon type={selectedTier.pro_reward_type} size="lg" />
                    <div>
                      <div className="font-medium text-amber-400">
                        {selectedTier.pro_reward_type === 'gems' && `${selectedTier.pro_reward_value?.amount} Gems`}
                        {selectedTier.pro_reward_type === 'badge' && selectedTier.pro_reward_value?.name}
                        {selectedTier.pro_reward_type === 'cosmetic' && selectedTier.pro_reward_value?.type}
                        {selectedTier.pro_reward_type === 'priority' && 'Priority Support'}
                        {!selectedTier.pro_reward_type && 'No reward'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full mt-6"
                onClick={() => setSelectedTier(null)}
              >
                Close
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CardBoomPass;
