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
      subtitle: 'Vote now & win coins!',
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
    <div 
      className={cn(
        "relative overflow-hidden rounded-[18px]",
        "bg-gradient-to-br from-[#0a0f1a] via-[#0d1321] to-[#101820]",
        "border border-white/5",
        "shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_40px_rgba(0,0,0,0.3)]"
      )}
      style={{ backdropFilter: 'blur(22px)' }}
    >
      {/* Noise texture */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Accent line - Tiffany brand color */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary via-primary/50 to-transparent" />

      {/* Header - Tiffany branding */}
      <div className="absolute top-2 left-3 flex items-center gap-1.5 z-10">
        <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
          <Trophy className="w-2.5 h-2.5 text-primary" />
        </div>
        <span className="font-sans text-[10px] md:text-[11px] text-primary uppercase tracking-widest font-bold">
          BOOM CHALLENGES
        </span>
      </div>

      {/* CTA Grid */}
      <div className="relative z-10 grid grid-cols-3 gap-px bg-white/5 mt-8">
        {ctas.map((cta, index) => (
          <motion.button
            key={cta.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => handleClick(cta.href)}
            className={cn(
              "relative overflow-hidden p-3 md:p-4",
              "bg-[#0d1321] hover:bg-white/[0.03]",
              "transition-all duration-200",
              "text-center group"
            )}
          >
            {/* Pulse indicator for live items */}
            {cta.pulse && (
              <div className="absolute top-2 right-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                </span>
              </div>
            )}

            <div className="flex flex-col items-center gap-2">
              <div className={cn("p-2 rounded-lg", cta.iconBg)}>
                <cta.icon className={cn("w-4 h-4 md:w-5 md:h-5", cta.iconColor)} />
              </div>
              <div>
                <h3 className="font-bold text-xs md:text-sm text-white/90 line-clamp-1">
                  {cta.title}
                </h3>
                <p className="text-[10px] md:text-xs text-gray-500 line-clamp-1">
                  {cta.subtitle}
                </p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};