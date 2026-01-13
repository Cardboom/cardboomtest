import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { CoachRegistrationDialog } from '@/components/gaming/CoachRegistrationDialog';
import { CoachesSection } from '@/components/gaming/CoachesSection';
import { Collectible } from '@/types/collectible';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Gamepad2, Trophy, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

const Gaming = () => {
  const { t } = useLanguage();
  const [cartItems, setCartItems] = useState<Collectible[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showCoachDialog, setShowCoachDialog] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Check auth state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleRemoveFromCart = (id: string) => {
    setCartItems(cartItems.filter((item) => item.id !== id));
    toast.info(t.cart.removed);
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Gaming Hub | Cardboom - Game Points, Skins & Coaching</title>
        <meta name="description" content="Buy and sell game points, skins, and coaching services. Level up your gaming experience with Valorant VP, PUBG UC, and professional coaching from top players." />
        <meta name="keywords" content="game points, gaming marketplace, Valorant VP, PUBG UC, gaming coaching, esports coaching, game skins" />
        <link rel="canonical" href="https://cardboom.com/gaming" />
        <meta property="og:title" content="Gaming Hub | Cardboom" />
        <meta property="og:description" content="Buy and sell game points, skins, and coaching services. Level up your gaming experience." />
        <meta property="og:url" content="https://cardboom.com/gaming" />
        <meta property="og:type" content="website" />
      </Helmet>
      <Header cartCount={cartItems.length} onCartClick={() => setIsCartOpen(true)} />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="relative rounded-2xl overflow-hidden mb-8 bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 p-8 md:p-12">
          <div className="absolute inset-0 bg-[url('/placeholder.svg')] opacity-5"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-primary/20">
                <Gamepad2 className="w-8 h-8 text-primary" />
              </div>
              <Badge variant="secondary" className="bg-gain/20 text-gain">
                Coming Soon
              </Badge>
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
              Gaming Hub
            </h1>
            <p className="text-muted-foreground max-w-2xl text-lg mb-6">
              Game points, skins, coaching services and more. Level up your gaming experience with CardBoom.
            </p>
            <Button 
              onClick={() => {
                if (!user) {
                  toast.error('Please log in to register as a coach');
                  return;
                }
                setShowCoachDialog(true);
              }}
              className="bg-gradient-to-r from-gold to-gold/80 text-background hover:from-gold/90 hover:to-gold/70"
            >
              <GraduationCap className="w-4 h-4 mr-2" />
              Become a Coach
            </Button>
          </div>
        </div>

        {/* Our Coaches Section */}
        <CoachesSection />

        {/* Coaching Info Section */}
        <div className="mt-16 p-8 rounded-2xl bg-card border border-border">
          <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-gold" />
            Pro Gaming Coaching
          </h2>
          <p className="text-muted-foreground mb-6">
            Learn from professional players and coaches. Get personalized training, VOD reviews, and rank up faster.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-4 rounded-xl bg-muted/50">
              <h3 className="font-semibold mb-2">Valorant Coaching</h3>
              <p className="text-sm text-muted-foreground">
                From Iron to Radiant. Learn agent mastery, game sense, and aim training from top-ranked coaches.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50">
              <h3 className="font-semibold mb-2">League of Legends Coaching</h3>
              <p className="text-sm text-muted-foreground">
                Climb the ranked ladder with Challenger-level coaching. Lane mechanics, macro play, and champion pools.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50">
              <h3 className="font-semibold mb-2">VOD Reviews</h3>
              <p className="text-sm text-muted-foreground">
                Get your gameplay analyzed by pros. Identify mistakes and improve your decision-making.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onRemoveItem={handleRemoveFromCart}
      />

      <CoachRegistrationDialog 
        open={showCoachDialog} 
        onOpenChange={setShowCoachDialog} 
      />
    </div>
  );
};

export default Gaming;
