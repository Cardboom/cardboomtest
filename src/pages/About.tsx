import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Shield, Globe, Zap } from 'lucide-react';
import { useState } from 'react';
import { CartDrawer } from '@/components/CartDrawer';

const About = () => {
  const [cartOpen, setCartOpen] = useState(false);

  const values = [
    { icon: Shield, title: 'Trust & Security', description: 'Every transaction is protected with escrow and vault storage options.' },
    { icon: Users, title: 'Community First', description: 'Built by collectors, for collectors. We understand what you need.' },
    { icon: Globe, title: 'Global Reach', description: 'Connect with traders and collectors from around the world.' },
    { icon: Zap, title: 'Innovation', description: 'Pioneering features like fractional ownership and AI insights.' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>About Us | Cardboom - The Future of TCG Trading</title>
        <meta name="description" content="Cardboom is the world's leading marketplace for trading cards, collectibles, and figures. Built by collectors, for collectors with escrow protection and vault storage." />
        <meta name="keywords" content="Cardboom about, trading card marketplace, collectibles platform, TCG trading, card collecting" />
        <link rel="canonical" href="https://cardboom.com/about" />
        <meta property="og:title" content="About Us | Cardboom" />
        <meta property="og:description" content="The world's leading marketplace for trading cards and collectibles." />
        <meta property="og:url" content="https://cardboom.com/about" />
      </Helmet>
      <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={[]} onRemoveItem={() => {}} />

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4">About Us</Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              The Future of TCG Trading
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              CardBoom is the world's leading marketplace for trading cards, collectibles, and figures. 
              We're building the most trusted platform for collectors worldwide.
            </p>
          </div>

          <Card className="mb-12">
            <CardHeader>
              <CardTitle>Our Mission</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                We believe every collector deserves a safe, transparent, and efficient marketplace. 
                Our mission is to democratize access to high-value collectibles through innovative features 
                like fractional ownership, vault storage, and AI-powered market insights.
              </p>
              <p>
                Founded by passionate collectors, CardBoom combines cutting-edge technology with 
                deep understanding of the collectibles market to create an unparalleled trading experience.
              </p>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {values.map((value) => (
              <Card key={value.title}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <value.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">{value.title}</h3>
                      <p className="text-muted-foreground text-sm">{value.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default About;