import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Helmet } from 'react-helmet-async';

const Terms = () => {
  return (
    <>
      <Helmet>
        <title>Terms of Service | CardBoom</title>
        <meta name="description" content="CardBoom Terms of Service - Read our terms and conditions for using the CardBoom collectibles marketplace." />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />

        <main className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Badge className="mb-4">Legal</Badge>
              <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
                Terms of Service
              </h1>
              <p className="text-muted-foreground">Last updated: December 16, 2024</p>
            </div>

            <Card>
              <CardContent className="py-8 prose prose-invert max-w-none">
                <h2 className="text-xl font-semibold mb-4">1. Company Information</h2>
                <p className="text-muted-foreground mb-6">
                  CardBoom is operated by <strong>Brainbaby Bilişim A.Ş.</strong>, a company registered in Turkey. By accessing and using CardBoom, you agree to be bound by these Terms of Service and all applicable laws and regulations.
                </p>

                <h2 className="text-xl font-semibold mb-4">2. Acceptance of Terms</h2>
                <p className="text-muted-foreground mb-6">
                  By accessing and using CardBoom, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
                </p>

                <h2 className="text-xl font-semibold mb-4">3. Use License</h2>
                <p className="text-muted-foreground mb-6">
                  Permission is granted to temporarily use CardBoom for personal, non-commercial transitory viewing and trading purposes only. This is the grant of a license, not a transfer of title.
                </p>

                <h2 className="text-xl font-semibold mb-4">4. User Accounts</h2>
                <p className="text-muted-foreground mb-6">
                  You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account. Users must be at least 18 years old or have parental consent to use the platform.
                </p>

                <h2 className="text-xl font-semibold mb-4">5. Trading Rules</h2>
                <p className="text-muted-foreground mb-6">
                  All listings must accurately represent the items being sold. Misrepresentation of item condition, authenticity, or any other material facts is strictly prohibited and may result in account termination. Brainbaby Bilişim A.Ş. reserves the right to remove any listings that violate these terms.
                </p>

                <h2 className="text-xl font-semibold mb-4">6. Fees and Payments</h2>
                <p className="text-muted-foreground mb-6">
                  CardBoom charges service fees on completed transactions. Current fee schedules are available on our pricing page. Brainbaby Bilişim A.Ş. reserves the right to modify fees with reasonable notice. All payments are processed securely through our licensed payment providers.
                </p>

                <h2 className="text-xl font-semibold mb-4">7. Fractional Ownership</h2>
                <p className="text-muted-foreground mb-6">
                  Fractional ownership of collectibles is offered through our platform. By purchasing shares, you acknowledge that you are acquiring a proportional ownership interest in the underlying collectible. Share prices may fluctuate based on market conditions.
                </p>

                <h2 className="text-xl font-semibold mb-4">8. Gaming Services</h2>
                <p className="text-muted-foreground mb-6">
                  Gaming services including game currency and boosting services are provided as-is. Users are responsible for ensuring compliance with the terms of service of the respective game publishers. Brainbaby Bilişim A.Ş. is not affiliated with game publishers.
                </p>

                <h2 className="text-xl font-semibold mb-4">9. Dispute Resolution</h2>
                <p className="text-muted-foreground mb-6">
                  In the event of a dispute between buyers and sellers, CardBoom may, at its discretion, act as a mediator. Our decisions in such matters are final and binding. For unresolved disputes, Turkish courts shall have jurisdiction.
                </p>

                <h2 className="text-xl font-semibold mb-4">10. Limitation of Liability</h2>
                <p className="text-muted-foreground mb-6">
                  Brainbaby Bilişim A.Ş. shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service. Our total liability shall not exceed the fees paid by you in the preceding 12 months.
                </p>

                <h2 className="text-xl font-semibold mb-4">11. Intellectual Property</h2>
                <p className="text-muted-foreground mb-6">
                  The CardBoom name, logo, and all related marks are trademarks of Brainbaby Bilişim A.Ş. You may not use our trademarks without prior written consent.
                </p>

                <h2 className="text-xl font-semibold mb-4">12. Governing Law</h2>
                <p className="text-muted-foreground mb-6">
                  These Terms shall be governed by and construed in accordance with the laws of the Republic of Turkey. Any disputes shall be subject to the exclusive jurisdiction of the courts of Istanbul.
                </p>

                <h2 className="text-xl font-semibold mb-4">13. Contact Information</h2>
                <p className="text-muted-foreground">
                  <strong>Brainbaby Bilişim A.Ş.</strong><br />
                  Email: legal@cardboom.com<br />
                  Address: Istanbul, Turkey
                </p>
              </CardContent>
            </Card>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Terms;