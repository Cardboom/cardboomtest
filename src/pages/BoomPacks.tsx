import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Gem, Sparkles, Info, ShieldCheck } from 'lucide-react';
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

const BoomPacks: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [openingPackId, setOpeningPackId] = useState<string | null>(null);
  const [openedCards, setOpenedCards] = useState<BoomPackCardType[]>([]);
  const [bonusGems, setBonusGems] = useState(0);
  const [showAnimation, setShowAnimation] = useState(false);

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
      // Calculate bonus from the pack
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
    navigate('/wallet');
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
          {/* Hero Section */}
          <section className="relative py-12 md:py-20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
            <div className="container mx-auto px-4 relative z-10">
              <div className="max-w-3xl mx-auto text-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-center gap-2 mb-4"
                >
                  <Sparkles className="w-6 h-6 text-primary" />
                  <span className="text-sm font-medium text-primary uppercase tracking-wider">
                    Sealed Collectible Packs
                  </span>
                </motion.div>
                
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl md:text-5xl font-bold mb-4"
                >
                  Boom Packs
                </motion.h1>
                
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-lg text-muted-foreground mb-8"
                >
                  Discover real trading cards in every pack. All cards come from 
                  CardBoom's verified inventory and are added directly to your collection.
                </motion.p>

                {/* Gems Balance */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="inline-flex items-center gap-3 px-6 py-3 bg-card border border-border rounded-full shadow-lg"
                >
                  <Gem className="w-6 h-6 text-primary" />
                  <span className="text-2xl font-bold">{balance.toLocaleString()}</span>
                  <span className="text-muted-foreground">Gems</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleTopUp}
                    className="ml-2"
                  >
                    Top Up
                  </Button>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Main Content */}
          <section className="container mx-auto px-4 pb-16">
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
                {/* Disclaimer */}
                <Alert>
                  <ShieldCheck className="h-4 w-4" />
                  <AlertDescription>
                    Boom Packs are sealed collectible products containing real trading cards. 
                    Each pack is guaranteed to contain cards with utility value equal to or greater than the pack price.
                    Cards are for collection and entertainment purposes.
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
                    <Button onClick={() => document.querySelector('[value="shop"]')?.dispatchEvent(new Event('click'))}>
                      Browse Packs
                    </Button>
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
                {/* Cooldown Info */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Cards from Boom Packs have a 7-day cooldown before they can be listed on the marketplace.
                    During this time, you can view, store in vault, or request shipping.
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
