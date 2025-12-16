import { useState, useEffect } from 'react';
import { Trophy, Sparkles, Timer, Gift, Shield, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export const TournamentBanner = () => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const diff = endOfMonth.getTime() - now.getTime();

      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
          seconds: Math.floor((diff / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, []);

  const progressPercent = 100 - (timeLeft.days / 31) * 100;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-accent p-6 md:p-8 text-primary-foreground">
      {/* Animated background sparkles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-4 left-10 animate-pulse">
          <Sparkles className="w-6 h-6 text-primary-foreground/30" />
        </div>
        <div className="absolute top-20 right-20 animate-pulse delay-100">
          <Sparkles className="w-4 h-4 text-primary-foreground/20" />
        </div>
        <div className="absolute bottom-10 left-1/3 animate-pulse delay-200">
          <Sparkles className="w-5 h-5 text-primary-foreground/25" />
        </div>
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row items-center gap-6">
        {/* Trophy Icon */}
        <div className="flex-shrink-0">
          <div className="w-24 h-24 rounded-full bg-primary-foreground/20 flex items-center justify-center animate-bounce-slow">
            <Trophy className="w-12 h-12 text-yellow-300" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
            <Badge className="bg-yellow-500 text-yellow-950 border-0">
              <Gift className="w-3 h-3 mr-1" />
              LAUNCH TOURNAMENT
            </Badge>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-2">
            Win ₺5,000 Worth of Cards!
          </h2>
          
          <p className="text-primary-foreground/80 mb-4 max-w-lg">
            Our launch tournament for sellers with ₺50,000 or less in monthly volume. 
            Top sellers win amazing card prizes!
          </p>

          {/* Prize tiers */}
          <div className="flex flex-wrap gap-2 justify-center lg:justify-start mb-4">
            <Badge variant="outline" className="bg-yellow-500/20 border-yellow-500/50 text-primary-foreground">
              🥇 1st: ₺2,500 in cards
            </Badge>
            <Badge variant="outline" className="bg-gray-400/20 border-gray-400/50 text-primary-foreground">
              🥈 2nd: ₺1,500 in cards
            </Badge>
            <Badge variant="outline" className="bg-amber-600/20 border-amber-600/50 text-primary-foreground">
              🥉 3rd: ₺1,000 in cards
            </Badge>
          </div>

          {/* Rules highlight */}
          <div className="flex flex-wrap gap-3 justify-center lg:justify-start text-xs">
            <div className="flex items-center gap-1 bg-primary-foreground/10 px-2 py-1 rounded-full">
              <Shield className="w-3 h-3" />
              <span>Max ₺50K volume</span>
            </div>
            <div className="flex items-center gap-1 bg-primary-foreground/10 px-2 py-1 rounded-full">
              <Package className="w-3 h-3" />
              <span>CardBoom sales or Vault hold</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="max-w-md mx-auto lg:mx-0 mt-4">
            <Progress value={progressPercent} className="h-2 bg-primary-foreground/20" />
            <p className="text-xs text-primary-foreground/60 mt-1">
              {Math.round(progressPercent)}% of the month completed
            </p>
          </div>
        </div>

        {/* Countdown Timer */}
        <div className="flex-shrink-0">
          <div className="flex items-center gap-1 mb-2 justify-center">
            <Timer className="w-4 h-4" />
            <span className="text-sm font-medium">Time Remaining</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { value: timeLeft.days, label: 'Days' },
              { value: timeLeft.hours, label: 'Hours' },
              { value: timeLeft.minutes, label: 'Mins' },
              { value: timeLeft.seconds, label: 'Secs' },
            ].map((item) => (
              <div key={item.label} className="bg-primary-foreground/20 rounded-lg p-2">
                <div className="text-2xl font-bold font-mono">
                  {String(item.value).padStart(2, '0')}
                </div>
                <div className="text-xs text-primary-foreground/70">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};