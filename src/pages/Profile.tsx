import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileShowcase } from '@/components/profile/ProfileShowcase';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Package, Star, Clock } from 'lucide-react';

const Profile = () => {
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const { profile, backgrounds, unlockedBackgrounds, loading, updateProfile, unlockBackground } = useProfile(userId);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUser();
  }, []);

  const isOwnProfile = !userId || userId === currentUserId;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-64 bg-muted rounded-xl" />
            <div className="h-32 bg-muted rounded-xl" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="py-16 text-center">
              <h2 className="text-2xl font-bold mb-2">Profile Not Found</h2>
              <p className="text-muted-foreground mb-6">
                {isOwnProfile 
                  ? 'Please sign in to view your profile.'
                  : 'This user profile does not exist.'}
              </p>
              {isOwnProfile && (
                <Button onClick={() => navigate('/auth')}>
                  Sign In
                </Button>
              )}
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const handleUpdateShowcase = async (items: string[]) => {
    return await updateProfile({ showcase_items: items });
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{profile.display_name || 'Profile'} | CardBoom</title>
        <meta name="description" content={`View ${profile.display_name}'s collection and profile on CardBoom.`} />
      </Helmet>

      <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={[]} onRemoveItem={() => {}} />

      <main className="container mx-auto px-4 py-8 space-y-8">
        <ProfileHeader
          profile={profile}
          backgrounds={backgrounds}
          unlockedBackgrounds={unlockedBackgrounds}
          isOwnProfile={isOwnProfile}
          onUpdate={updateProfile}
          onUnlockBackground={unlockBackground}
        />

        <Tabs defaultValue="showcase" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="showcase" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden md:inline">Showcase</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden md:inline">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-2">
              <Star className="h-4 w-4" />
              <span className="hidden md:inline">Reviews</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden md:inline">Activity</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="showcase">
            <ProfileShowcase
              userId={profile.id}
              showcaseItems={profile.showcase_items}
              isOwnProfile={isOwnProfile}
              onUpdateShowcase={handleUpdateShowcase}
            />
          </TabsContent>

          <TabsContent value="stats">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Level</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">{profile.level}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Total XP</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{profile.xp.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Member Since</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-medium">
                    {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Badges</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{profile.badges.length + (profile.is_beta_tester ? 1 : 0)}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reviews">
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Reviews coming soon...
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Activity feed coming soon...
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Early Access Benefits */}
        {profile.is_beta_tester && (
          <Card className="border-purple-500/50 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-400">
                🎉 Early Access Benefits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <strong>2x XP Bonus</strong> - Earn double XP on all actions
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <strong>Beta Tester Badge</strong> - Exclusive profile badge
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <strong>Early Access</strong> - First access to new features
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <strong>Reduced Fees</strong> - Lower platform fees during beta
                </li>
              </ul>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />

      <style>{`
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
};

export default Profile;
