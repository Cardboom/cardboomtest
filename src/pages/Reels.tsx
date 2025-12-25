import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Flame, Users, Sparkles, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReelsFeed } from '@/components/reels/ReelsFeed';
import { CreateReelDialog } from '@/components/reels/CreateReelDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { cn } from '@/lib/utils';

type FeedType = 'for_you' | 'following' | 'trending';

export default function Reels() {
  const { t } = useLanguage();
  const [feedType, setFeedType] = useState<FeedType>('for_you');
  const [createOpen, setCreateOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleReelCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <>
      <Helmet>
        <title>{t.reels?.pageTitle || 'Reels - CardBoom'}</title>
        <meta name="description" content={t.reels?.pageDescription || 'Watch and share TCG card opening videos on CardBoom Reels'} />
      </Helmet>

      <div className="fixed inset-0 bg-black flex flex-col">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-0 left-0 right-0 z-50 safe-area-inset-top"
        >
          <div className="flex items-center justify-between px-4 py-3">
            <Link to="/">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>

            {/* Feed tabs */}
            <Tabs value={feedType} onValueChange={(v) => setFeedType(v as FeedType)}>
              <TabsList className="bg-black/50 backdrop-blur-md border border-white/10">
                <TabsTrigger 
                  value="for_you" 
                  className={cn(
                    "text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10",
                    "gap-1.5"
                  )}
                >
                  <Sparkles className="w-4 h-4" />
                  {t.reels?.forYou || 'For You'}
                </TabsTrigger>
                <TabsTrigger 
                  value="following"
                  className={cn(
                    "text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10",
                    "gap-1.5"
                  )}
                >
                  <Users className="w-4 h-4" />
                  {t.reels?.following || 'Following'}
                </TabsTrigger>
                <TabsTrigger 
                  value="trending"
                  className={cn(
                    "text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10",
                    "gap-1.5"
                  )}
                >
                  <Flame className="w-4 h-4" />
                  {t.reels?.trending || 'Trending'}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Create button */}
            {user && (
              <Button
                onClick={() => setCreateOpen(true)}
                size="icon"
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg shadow-primary/25"
              >
                <Plus className="w-5 h-5" />
              </Button>
            )}

            {!user && <div className="w-10" />}
          </div>
        </motion.header>

        {/* Feed */}
        <div className="flex-1 pt-16">
          <ReelsFeed key={`${feedType}-${refreshKey}`} feedType={feedType} className="h-full" />
        </div>

        {/* Bottom safe area */}
        <div className="safe-area-inset-bottom bg-black" />

        {/* Create dialog */}
        <CreateReelDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={handleReelCreated}
        />
      </div>
    </>
  );
}
