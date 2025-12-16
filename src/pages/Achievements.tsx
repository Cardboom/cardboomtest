import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { useAchievements, categoryLabels, tierColors } from '@/hooks/useAchievements';
import { AchievementCard } from '@/components/achievements/AchievementCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Sparkles, Lock, Medal, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const Achievements = () => {
  const [cartOpen, setCartOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();
  }, []);

  const { 
    achievementsByCategory, 
    earnedCount, 
    totalCount, 
    totalXpEarned, 
    isLoading 
  } = useAchievements(userId || undefined);

  const categories = Object.keys(achievementsByCategory);

  // Stats
  const earnedByTier = {
    bronze: 0,
    silver: 0,
    gold: 0,
    platinum: 0,
  };

  Object.values(achievementsByCategory).flat().forEach(a => {
    if (a.earned) {
      earnedByTier[a.tier as keyof typeof earnedByTier]++;
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Achievements | CardBoom</title>
        <meta name="description" content="Track your trading achievements and earn XP rewards on CardBoom" />
      </Helmet>

      <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={[]} onRemoveItem={() => {}} />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-600 mb-4 shadow-lg">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Achievements</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Earn bragging rights and XP by trading, collecting, and engaging with the community
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{earnedCount}</div>
              <div className="text-xs text-muted-foreground">Earned</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-500">{totalXpEarned}</div>
              <div className="text-xs text-muted-foreground">Total XP</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{totalCount - earnedCount}</div>
              <div className="text-xs text-muted-foreground">Remaining</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">
                {totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0}%
              </div>
              <div className="text-xs text-muted-foreground">Complete</div>
            </CardContent>
          </Card>
        </div>

        {/* Tier Progress */}
        <Card className="mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Medal className="w-5 h-5" />
              Tier Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(['bronze', 'silver', 'gold', 'platinum'] as const).map((tier) => {
                const total = Object.values(achievementsByCategory).flat().filter(a => a.tier === tier).length;
                const earned = earnedByTier[tier];
                return (
                  <div key={tier} className="text-center">
                    <div className={cn(
                      'w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2',
                      `bg-gradient-to-br ${tierColors[tier]}`
                    )}>
                      <span className="text-white text-xl">
                        {tier === 'bronze' ? '🥉' : tier === 'silver' ? '🥈' : tier === 'gold' ? '🥇' : '💎'}
                      </span>
                    </div>
                    <div className="text-sm font-medium capitalize">{tier}</div>
                    <div className="text-xs text-muted-foreground">{earned}/{total}</div>
                    <Progress value={total > 0 ? (earned / total) * 100 : 0} className="mt-2 h-1" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Main Progress */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-primary" />
                <span className="font-medium">Overall Progress</span>
              </div>
              <Badge variant="outline">
                {earnedCount} / {totalCount}
              </Badge>
            </div>
            <Progress value={(earnedCount / totalCount) * 100} className="h-3" />
          </CardContent>
        </Card>

        {/* Achievements by Category */}
        <Tabs defaultValue={categories[0] || 'holding'} className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
            {categories.map((category) => {
              const categoryAchievements = achievementsByCategory[category] || [];
              const earned = categoryAchievements.filter(a => a.earned).length;
              return (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4"
                >
                  {categoryLabels[category] || category}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {earned}/{categoryAchievements.length}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {categories.map((category) => (
            <TabsContent key={category} value={category}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(achievementsByCategory[category] || []).map((achievement) => (
                  <AchievementCard key={achievement.id} achievement={achievement} />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {!userId && (
          <Card className="mt-8">
            <CardContent className="p-8 text-center">
              <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Sign in to track your achievements</h3>
              <p className="text-muted-foreground text-sm">
                Create an account to start earning achievements and XP rewards
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Achievements;
