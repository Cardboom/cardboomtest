import { useAchievements, categoryLabels } from '@/hooks/useAchievements';
import { AchievementCard } from './AchievementCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface AchievementsShowcaseProps {
  userId: string;
  showAll?: boolean;
  maxDisplay?: number;
}

export const AchievementsShowcase = ({ userId, showAll = false, maxDisplay = 6 }: AchievementsShowcaseProps) => {
  const { userAchievements, achievementsByCategory, earnedCount, totalCount, totalXpEarned, isLoading } = useAchievements(userId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get earned achievements sorted by most recent
  const earnedAchievements = Object.values(achievementsByCategory)
    .flat()
    .filter(a => a.earned)
    .sort((a, b) => new Date(b.earnedAt || 0).getTime() - new Date(a.earnedAt || 0).getTime());

  const displayAchievements = showAll ? earnedAchievements : earnedAchievements.slice(0, maxDisplay);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Achievements
          </CardTitle>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="w-3 h-3" />
            {totalXpEarned} XP
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <Progress value={(earnedCount / totalCount) * 100} className="flex-1 h-2" />
          <span className="text-sm text-muted-foreground">
            {earnedCount}/{totalCount}
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {earnedAchievements.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No achievements earned yet</p>
            <p className="text-xs">Start trading to unlock achievements!</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {displayAchievements.map((achievement) => (
                <AchievementCard 
                  key={achievement.id} 
                  achievement={achievement} 
                  compact 
                />
              ))}
            </div>
            
            {!showAll && earnedAchievements.length > maxDisplay && (
              <Link to="/achievements" className="block mt-4">
                <Button variant="outline" className="w-full" size="sm">
                  View All Achievements ({earnedAchievements.length})
                </Button>
              </Link>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
