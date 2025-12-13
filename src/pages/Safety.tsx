import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, Eye, AlertTriangle, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { CartDrawer } from '@/components/CartDrawer';

const Safety = () => {
  const [cartOpen, setCartOpen] = useState(false);

  const safetyFeatures = [
    { icon: Shield, title: 'Escrow Protection', description: 'All payments are held securely until both parties confirm the transaction.' },
    { icon: Lock, title: 'Vault Storage', description: 'Store your high-value cards in our insured, climate-controlled vaults.' },
    { icon: Eye, title: 'Verified Sellers', description: 'Identity-verified sellers with track record and ratings.' },
    { icon: CheckCircle, title: 'Authenticity Guarantee', description: 'All graded cards are verified for authenticity before listing.' },
  ];

  const tips = [
    'Never share your login credentials with anyone',
    'Enable two-factor authentication for extra security',
    'Only communicate through the CardBoom platform',
    'Report suspicious listings or messages immediately',
    'Verify seller ratings and reviews before purchasing',
    'Use vault storage for high-value purchases',
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={[]} onRemoveItem={() => {}} />

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4">Safety</Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Your Safety is Our Priority
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Learn about the measures we take to protect you and your collection.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {safetyFeatures.map((feature) => (
              <Card key={feature.title}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground text-sm">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mb-12">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Safety Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-amber-500/10 border-amber-500/20">
            <CardContent className="py-8">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-10 h-10 text-amber-500 shrink-0" />
                <div>
                  <h3 className="font-semibold text-xl mb-2">Report Suspicious Activity</h3>
                  <p className="text-muted-foreground mb-4">
                    If you encounter any suspicious listings, messages, or behavior, please report it immediately. 
                    Our trust & safety team investigates all reports within 24 hours.
                  </p>
                  <p className="font-medium">Email: safety@cardboom.com</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Safety;