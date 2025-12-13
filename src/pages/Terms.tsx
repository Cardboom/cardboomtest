import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { CartDrawer } from '@/components/CartDrawer';

const Terms = () => {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={[]} onRemoveItem={() => {}} />

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4">Legal</Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Terms of Service
            </h1>
            <p className="text-muted-foreground">Last updated: December 13, 2024</p>
          </div>

          <Card>
            <CardContent className="py-8 prose prose-invert max-w-none">
              <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground mb-6">
                By accessing and using CardBoom, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
              </p>

              <h2 className="text-xl font-semibold mb-4">2. Use License</h2>
              <p className="text-muted-foreground mb-6">
                Permission is granted to temporarily use CardBoom for personal, non-commercial transitory viewing and trading purposes only. This is the grant of a license, not a transfer of title.
              </p>

              <h2 className="text-xl font-semibold mb-4">3. User Accounts</h2>
              <p className="text-muted-foreground mb-6">
                You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
              </p>

              <h2 className="text-xl font-semibold mb-4">4. Trading Rules</h2>
              <p className="text-muted-foreground mb-6">
                All listings must accurately represent the items being sold. Misrepresentation of item condition, authenticity, or any other material facts is strictly prohibited and may result in account termination.
              </p>

              <h2 className="text-xl font-semibold mb-4">5. Fees and Payments</h2>
              <p className="text-muted-foreground mb-6">
                CardBoom charges service fees on completed transactions. Current fee schedules are available on our pricing page. We reserve the right to modify fees with reasonable notice.
              </p>

              <h2 className="text-xl font-semibold mb-4">6. Dispute Resolution</h2>
              <p className="text-muted-foreground mb-6">
                In the event of a dispute between buyers and sellers, CardBoom may, at its discretion, act as a mediator. Our decisions in such matters are final and binding.
              </p>

              <h2 className="text-xl font-semibold mb-4">7. Limitation of Liability</h2>
              <p className="text-muted-foreground mb-6">
                CardBoom shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.
              </p>

              <h2 className="text-xl font-semibold mb-4">8. Contact Information</h2>
              <p className="text-muted-foreground">
                For questions about these Terms of Service, please contact us at legal@cardboom.com.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;