import { Badge } from '@/components/ui/badge';
import { Shield, Star, Zap, Trophy, Flame, Crown } from 'lucide-react';

interface ProfileBadgesProps {
  badges: string[];
  isBetaTester: boolean;
  level: number;
}

const BADGE_CONFIG: Record<string, { icon: React.ComponentType<any>; label: string; color: string }> = {
  beta_tester: { icon: Shield, label: 'Beta Tester', color: 'from-purple-500 to-blue-500' },
  early_adopter: { icon: Star, label: 'Early Adopter', color: 'from-amber-400 to-orange-500' },
  power_seller: { icon: Zap, label: 'Power Seller', color: 'from-yellow-400 to-amber-500' },
  collector: { icon: Trophy, label: 'Collector', color: 'from-emerald-400 to-teal-500' },
  streak_master: { icon: Flame, label: 'Streak Master', color: 'from-red-500 to-orange-500' },
  premium: { icon: Crown, label: 'Premium', color: 'from-violet-500 to-purple-600' },
};

export const ProfileBadges = ({ badges, isBetaTester, level }: ProfileBadgesProps) => {
  const allBadges = [...badges];
  if (isBetaTester && !allBadges.includes('beta_tester')) {
    allBadges.unshift('beta_tester');
  }

  // Add level-based badges
  if (level >= 10 && !allBadges.includes('collector')) {
    allBadges.push('collector');
  }

  if (allBadges.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {allBadges.map((badgeKey) => {
        const config = BADGE_CONFIG[badgeKey];
        if (!config) return null;

        const Icon = config.icon;
        return (
          <Badge
            key={badgeKey}
            className={`bg-gradient-to-r ${config.color} text-white border-0 px-3 py-1.5 flex items-center gap-1.5 shadow-lg`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{config.label}</span>
          </Badge>
        );
      })}
    </div>
  );
};
