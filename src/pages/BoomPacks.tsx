import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Sparkles, Info, ShieldCheck, Play, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useBoomPacks, BoomPackCard as BoomPackCardType } from '@/hooks/useBoomPacks';
import { BoomPackCard } from '@/components/boom-packs/BoomPackCard';
import { SealedPackCard } from '@/components/boom-packs/SealedPackCard';
import { UserPackCards } from '@/components/boom-packs/UserPackCards';
import { PackOpeningAnimation } from '@/components/boom-packs/PackOpeningAnimation';
import { toast } from 'sonner';
import { BoomCoinIcon } from '@/components/icons/BoomCoinIcon';

const BoomPacks: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [openingPackId, setOpeningPackId] = useState<string | null>(null);
  const [openedCards, setOpenedCards] = useState<BoomPackCardType[]>([]);
  const [bonusGems, setBonusGems] = useState(0);
  const [showAnimation, setShowAnimation] = useState(false);
  const [videoMuted, setVideoMuted] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const {
    packTypes,
    sealedPacks,
    userCards,
    balance,
    loading,
    purchasing,
    opening,
    purchasePack,
    openPack
  } = useBoomPacks(user?.id);

  const handlePurchase = async (packTypeId: string) => {
    if (!user) {
      toast.error('Please sign in to purchase packs');
      navigate('/auth');
      return;
    }
    await purchasePack(packTypeId);
  };

  const handleOpenPack = async (packId: string) => {
    const pack = sealedPacks.find(p => p.id === packId);
    if (!pack) return;

    setOpeningPackId(packId);
    setShowAnimation(true);
    
    const cards = await openPack(packId);
    if (cards) {
      setOpenedCards(cards);
      const totalUtility = cards.reduce((sum, c) => sum + c.utility_value_gems, 0);
      const packCost = pack.gems_spent;
      setBonusGems(totalUtility < packCost ? packCost - totalUtility : 0);
    }
  };

  const handleAnimationComplete = () => {
    setShowAnimation(false);
    setOpeningPackId(null);
    setOpenedCards([]);
    setBonusGems(0);
  };

  const handleTopUp = () => {
    navigate('/coins');
  };

  const currentPack = sealedPacks.find(p => p.id === openingPackId);

  return (
    <>
      <Helmet>
        <title>Boom Packs - Sealed Collectible Packs | CardBoom</title>
        <meta 
          name="description" 
          content="Open Boom Packs to discover real trading cards. Every pack contains guaranteed collectible cards from CardBoom's inventory." 
        />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <Header cartCount={0} onCartClick={() => setCartOpen(true)} />

        <main className="flex-1">
          {/* Cinematic Video Hero Section */}
          <section className="relative h-[70vh] min-h-[500px] max-h-[800px] overflow-hidden">
            {/* Video Background */}
            <div className="absolute inset-0">
              <video
                autoPlay
                loop
                muted={videoMuted}
                playsInline
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              >
                <source src="/videos/boom-packs-hero.mp4" type="video/mp4" />
              </video>
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/80" />
            </div>

            {/* Mute Toggle */}
            <button
              onClick={() => setVideoMuted(!videoMuted)}
              className="absolute bottom-6 right-6 z-20 p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            >
              {videoMuted ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </button>

            {/* Hero Content */}
            <div className="relative z-10 h-full flex items-center">
              <div className="container mx-auto px-4">
                <div className="max-w-2xl">
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-3">
                      <div className="px-4 py-1.5 bg-primary/20 border border-primary/30 rounded-full">
                        <span className="text-sm font-semibold text-primary uppercase tracking-wider">
                          Now Available
                        </span>
                      </div>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                      <span className="block text-white">Boom</span>
                      <span className="block bg-gradient-to-r from-primary via-sky-400 to-primary bg-clip-text text-transparent">
                        Packs
                      </span>
                    </h1>

                    <p className="text-lg md:text-xl text-white/80 max-w-lg">
                      Discover real trading cards in every pack. Premium collectibles, 
                      guaranteed value, instant delivery to your vault.
                    </p>

                    {/* Boom Coins Balance Card */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                      className="inline-flex items-center gap-4 px-6 py-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                          <BoomCoinIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-white/60 uppercase tracking-wider">Your Balance</p>
                          <p className="text-2xl font-bold text-white">{balance.toLocaleString()} Coins</p>
                        </div>
                      </div>
                      <div className="h-10 w-px bg-white/20" />
                      <Button
                        onClick={handleTopUp}
                        className="bg-white text-black hover:bg-white/90 font-semibold"
                      >
                        Top Up
                      </Button>
                    </motion.div>

                    {/* Trust Badges */}
                    <div className="flex items-center gap-6 pt-4">
                      <div className="flex items-center gap-2 text-white/60 text-sm">
                        <ShieldCheck className="w-4 h-4 text-green-400" />
                        <span>Guaranteed Value</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/60 text-sm">
                        <Package className="w-4 h-4 text-sky-400" />
                        <span>Real Cards</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/60 text-sm">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>Instant Delivery</span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </section>

          {/* Main Content */}
          <section className="container mx-auto px-4 py-16">
            <Tabs defaultValue="shop" className="space-y-8">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
                <TabsTrigger value="shop" className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Shop
                </TabsTrigger>
                <TabsTrigger value="inventory" className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  My Packs
                  {sealedPacks.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                      {sealedPacks.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="collection" className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Cards
                </TabsTrigger>
              </TabsList>

              {/* Shop Tab */}
              <TabsContent value="shop" className="space-y-6">
                <Alert className="bg-card/50 border-primary/20">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <AlertDescription>
                    Boom Packs contain real trading cards from CardBoom's verified inventory. 
                    Every pack is guaranteed to deliver card value equal to or greater than the pack price.
                  </AlertDescription>
                </Alert>

                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-80 rounded-2xl" />
                    ))}
                  </div>
                ) : packTypes.length === 0 ? (
                  <div className="text-center py-16">
                    <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-semibold mb-2">No Packs Available</h3>
                    <p className="text-muted-foreground">
                      Check back soon for new Boom Packs!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {packTypes.map((packType) => (
                      <BoomPackCard
                        key={packType.id}
                        packType={packType}
                        balance={balance}
                        onPurchase={() => handlePurchase(packType.id)}
                        onTopUp={handleTopUp}
                        purchasing={purchasing}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Inventory Tab */}
              <TabsContent value="inventory" className="space-y-6">
                {!user ? (
                  <div className="text-center py-16">
                    <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-semibold mb-2">Sign In Required</h3>
                    <p className="text-muted-foreground mb-4">
                      Please sign in to view your packs
                    </p>
                    <Button onClick={() => navigate('/auth')}>Sign In</Button>
                  </div>
                ) : sealedPacks.length === 0 ? (
                  <div className="text-center py-16">
                    <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-semibold mb-2">No Sealed Packs</h3>
                    <p className="text-muted-foreground mb-4">
                      Purchase packs from the shop to add them here
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {sealedPacks.map((pack) => (
                      <SealedPackCard
                        key={pack.id}
                        pack={pack}
                        onOpen={() => handleOpenPack(pack.id)}
                        opening={opening && openingPackId === pack.id}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Collection Tab */}
              <TabsContent value="collection" className="space-y-6">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Cards from Boom Packs have a 7-day cooldown before they can be listed on the marketplace.
                  </AlertDescription>
                </Alert>

                {!user ? (
                  <div className="text-center py-16">
                    <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-semibold mb-2">Sign In Required</h3>
                    <p className="text-muted-foreground mb-4">
                      Please sign in to view your collection
                    </p>
                    <Button onClick={() => navigate('/auth')}>Sign In</Button>
                  </div>
                ) : (
                  <UserPackCards
                    cards={userCards}
                    onRequestShipping={(cardId) => {
                      toast.info('Shipping request feature coming soon');
                    }}
                    onStoreInVault={(cardId) => {
                      toast.info('Vault storage feature coming soon');
                    }}
                  />
                )}
              </TabsContent>
            </Tabs>
          </section>
        </main>

        <Footer />
      </div>

      {/* Pack Opening Animation */}
      <PackOpeningAnimation
        isOpen={showAnimation}
        packName={currentPack?.pack_type?.name || 'Boom Pack'}
        packImage={currentPack?.pack_type?.image_url}
        cards={openedCards}
        bonusGems={bonusGems}
        onComplete={handleAnimationComplete}
      />
    </>
  );
};

export default BoomPacks;
