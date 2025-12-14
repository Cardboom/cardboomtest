import { motion } from 'framer-motion';
import { Star, Zap, Gift, TrendingUp } from 'lucide-react';
import { getLevelFromXP, getXPForLevel } from '@/data/mockData';

interface XPProgressBarProps {
  xp: number;
  compact?: boolean;
}

export const XPProgressBar = ({ xp, compact = false }: XPProgressBarProps) => {
  const level = getLevelFromXP(xp);
  const currentLevelXP = getXPForLevel(level);
  const nextLevelXP = getXPForLevel(level + 1);
  const progressInLevel = xp - currentLevelXP;
  const xpNeededForNextLevel = nextLevelXP - currentLevelXP;
  const progressPercent = (progressInLevel / xpNeededForNextLevel) * 100;

  const getLevelTitle = (lvl: number): string => {
    if (lvl >= 50) return 'Legendary Collector';
    if (lvl >= 30) return 'Master Trader';
    if (lvl >= 20) return 'Elite Member';
    if (lvl >= 10) return 'Experienced Collector';
    if (lvl >= 5) return 'Rising Star';
    return 'Newcomer';
  };

  const getLevelColor = (lvl: number): string => {
    if (lvl >= 50) return 'from-yellow-400 via-orange-500 to-red-500';
    if (lvl >= 30) return 'from-purple-400 via-pink-500 to-red-500';
    if (lvl >= 20) return 'from-blue-400 via-purple-500 to-pink-500';
    if (lvl >= 10) return 'from-cyan-400 via-teal-500 to-blue-500';
    if (lvl >= 5) return 'from-yellow-400 via-gold to-orange-500';
    return 'from-gray-400 via-gray-500 to-gray-600';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getLevelColor(level)} flex items-center justify-center`}>
          <span className="text-white font-bold text-sm">{level}</span>
        </div>
        <div className="flex-1">
          <div className="h-2 bg-obsidian/50 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5 }}
              className={`h-full bg-gradient-to-r ${getLevelColor(level)}`}
            />
          </div>
        </div>
        <span className="text-platinum/60 text-xs">{xp.toLocaleString()} XP</span>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getLevelColor(level)} flex items-center justify-center shadow-lg`}
          >
            <Star className="w-7 h-7 text-white" />
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-platinum">Level {level}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r ${getLevelColor(level)} text-white`}>
                {getLevelTitle(level)}
              </span>
            </div>
            <p className="text-platinum/60 text-sm">{xp.toLocaleString()} total XP</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-gold font-semibold">{(nextLevelXP - xp).toLocaleString()} XP</p>
          <p className="text-platinum/50 text-xs">to Level {level + 1}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="h-3 bg-obsidian/50 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full bg-gradient-to-r ${getLevelColor(level)} relative`}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </motion.div>
        </div>
        <div className="flex justify-between text-xs text-platinum/50">
          <span>Level {level}</span>
          <span>{Math.round(progressPercent)}%</span>
          <span>Level {level + 1}</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 pt-2">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-gold/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-gold" />
          </div>
          <p className="text-platinum font-semibold text-sm">{progressInLevel}</p>
          <p className="text-platinum/50 text-xs">This Level</p>
        </div>
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Gift className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-platinum font-semibold text-sm">{Math.floor(xp / 500)}</p>
          <p className="text-platinum/50 text-xs">Rewards Earned</p>
        </div>
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-primary/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <p className="text-platinum font-semibold text-sm">#{Math.max(1, 1000 - level * 10)}</p>
          <p className="text-platinum/50 text-xs">Ranking</p>
        </div>
      </div>
    </div>
  );
};
