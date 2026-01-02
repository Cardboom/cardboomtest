import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CreatorStorefront } from '@/components/creator/CreatorStorefront';
import { CartDrawer } from '@/components/CartDrawer';

const StorefrontPage = () => {
  const { slug } = useParams();
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <>
      <Helmet>
        <title>{slug ? `${slug}'s Store | CardBoom` : 'Creator Store | CardBoom'}</title>
        <meta
          name="description"
          content="Shop directly from verified creators on CardBoom. Find exclusive listings, videos, and trusted sellers."
        />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
        <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={[]} onRemoveItem={() => {}} />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
          <CreatorStorefront slug={slug} />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default StorefrontPage;
