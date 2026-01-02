import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { BuyOrdersSection } from '@/components/trading/BuyOrdersSection';
import { CartDrawer } from '@/components/CartDrawer';

const BuyOrders = () => {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <>
      <Helmet>
        <title>Buy Orders - Instant Offers | CardBoom</title>
        <meta
          name="description"
          content="Post buy orders for cards you want. Sellers can accept instantly for quick transactions. Get the best deals on CardBoom."
        />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
        <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Buy Orders</h1>
            <p className="text-muted-foreground">
              Post offers for cards you want to buy. Sellers can accept instantly.
            </p>
          </div>
          <BuyOrdersSection />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default BuyOrders;
