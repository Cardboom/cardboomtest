import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { EnterpriseStorefrontManager } from '@/components/storefront/EnterpriseStorefrontManager';

const MyStorefrontPage = () => {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <>
      <Helmet>
        <title>My Storefront | CardBoom</title>
        <meta
          name="description"
          content="Manage your CardBoom storefront. Customize your brand, upload images, and attract more buyers."
        />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
        <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={[]} onRemoveItem={() => {}} />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
          <EnterpriseStorefrontManager />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default MyStorefrontPage;
