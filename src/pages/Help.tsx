import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MessageCircle, BookOpen, CreditCard, Package, Shield, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { CartDrawer } from '@/components/CartDrawer';
import { Link } from 'react-router-dom';

const Help = () => {
  const [cartOpen, setCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { icon: BookOpen, title: 'Getting Started', description: 'Learn the basics of using CardBoom', articles: 12 },
    { icon: CreditCard, title: 'Payments & Billing', description: 'Payment methods, fees, and refunds', articles: 8 },
    { icon: Package, title: 'Buying & Selling', description: 'How to buy and sell collectibles', articles: 15 },
    { icon: Shield, title: 'Security & Trust', description: 'Account security and verification', articles: 6 },
  ];

  const popularArticles = [
    'How do I create my first listing?',
    'What payment methods are accepted?',
    'How does vault storage work?',
    'How do I verify my identity?',
    'What are the seller fees?',
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={[]} onRemoveItem={() => {}} />

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4">Help Center</Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              How can we help?
            </h1>
            <div className="relative max-w-xl mx-auto mt-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search for help..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-lg"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-12">
            {categories.map((category) => (
              <Card key={category.title} className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="py-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <category.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{category.title}</h3>
                      <p className="text-muted-foreground text-sm mb-2">{category.description}</p>
                      <span className="text-xs text-muted-foreground">{category.articles} articles</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mb-12">
            <CardContent className="py-6">
              <h2 className="font-semibold text-xl mb-4 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                Popular Questions
              </h2>
              <ul className="space-y-3">
                {popularArticles.map((article) => (
                  <li key={article}>
                    <span className="text-primary hover:underline cursor-pointer">{article}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-8 text-center">
              <MessageCircle className="w-10 h-10 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold text-xl mb-2">Still need help?</h3>
              <p className="text-muted-foreground mb-6">
                Our support team is available 24/7 to assist you.
              </p>
              <Button className="gap-2">
                <MessageCircle className="w-4 h-4" />
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Help;