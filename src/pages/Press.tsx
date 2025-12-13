import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Mail, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { CartDrawer } from '@/components/CartDrawer';

const Press = () => {
  const [cartOpen, setCartOpen] = useState(false);

  const pressReleases = [
    { title: 'CardBoom Launches Fractional Ownership Feature', date: '2024-12-01', outlet: 'TechCrunch' },
    { title: 'Trading Card Market Reaches $50B Valuation', date: '2024-11-15', outlet: 'Forbes' },
    { title: 'CardBoom Raises Series A Funding', date: '2024-10-20', outlet: 'Bloomberg' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={[]} onRemoveItem={() => {}} />

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4">Press</Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Press & Media
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Get the latest news about CardBoom and download our press kit.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Card>
              <CardContent className="py-8 text-center">
                <Download className="w-10 h-10 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold text-lg mb-2">Press Kit</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Download our logos, brand guidelines, and media assets.
                </p>
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  Download Press Kit
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-8 text-center">
                <Mail className="w-10 h-10 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold text-lg mb-2">Media Inquiries</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  For press inquiries, please contact our communications team.
                </p>
                <Button variant="outline" className="gap-2">
                  <Mail className="w-4 h-4" />
                  press@cardboom.com
                </Button>
              </CardContent>
            </Card>
          </div>

          <h2 className="font-semibold text-2xl mb-6">Recent Press</h2>
          <div className="space-y-4">
            {pressReleases.map((release) => (
              <Card key={release.title} className="hover:border-primary/50 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-medium">{release.title}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span>{new Date(release.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <Badge variant="secondary">{release.outlet}</Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
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

export default Press;