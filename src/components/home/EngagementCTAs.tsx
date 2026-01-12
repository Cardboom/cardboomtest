import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Swords, Trophy, Gift, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const EngagementCTAs = () => {
  const navigate = useNavigate();

  const ctas = [
    {
      id: 'card-wars',
      icon: Swords,
      title: 'Card Wars LIVE',
      subtitle: 'Vote now & win gems!',
      color: 'from-orange-500 to-red-500',
      iconBg: 'bg-orange-500/20',
      iconColor: 'text-orange-500',
      href: '#card-wars',
      pulse: true,
    },
    {
      id: 'bounties',
      icon: Trophy,
      title: 'Boom Challenges',
      subtitle: 'Complete for rewards',
      color: 'from-primary to-primary/80',
      iconBg: 'bg-primary/20',
      iconColor: 'text-primary',
      href: '/rewards',
    },
    {
      id: 'referral',
      icon: Gift,
      title: 'Invite Friends',
      subtitle: 'Earn $0.50 credit each',
      color: 'from-gain to-emerald-500',
      iconBg: 'bg-gain/20',
      iconColor: 'text-gain',
      href: '/referrals',
    },
  ];

  const handleClick = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(href);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-2 md:gap-3">
      {ctas.map((cta, index) => (
        <motion.button
          key={cta.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => handleClick(cta.href)}
          className={cn(
            "relative overflow-hidden rounded-xl p-3 md:p-4",
            "bg-card border border-border/50 hover:border-border",
            "transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
            "text-left group"
          )}
        >
          {/* Background gradient on hover */}
          <div className={cn(
            "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity",
            `bg-gradient-to-br ${cta.color} opacity-5`
          )} />

          {/* Pulse indicator for live items */}
          {cta.pulse && (
            <div className="absolute top-2 right-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
            </div>
          )}

          <div className="flex flex-col items-start gap-2">
            <div className={cn("p-2 rounded-lg", cta.iconBg)}>
              <cta.icon className={cn("w-4 h-4 md:w-5 md:h-5", cta.iconColor)} />
            </div>
            <div>
              <h3 className="font-bold text-xs md:text-sm text-foreground line-clamp-1">
                {cta.title}
              </h3>
              <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-1">
                {cta.subtitle}
              </p>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
};