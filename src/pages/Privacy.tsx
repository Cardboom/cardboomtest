import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Helmet } from 'react-helmet-async';

const Privacy = () => {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | CardBoom</title>
        <meta name="description" content="CardBoom Privacy Policy - Learn how Brainbaby Bilişim A.Ş. collects, uses, and protects your personal information." />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />

        <main className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Badge className="mb-4">Legal</Badge>
              <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
                Privacy Policy
              </h1>
              <p className="text-muted-foreground">Last updated: December 16, 2024</p>
            </div>

            <Card>
              <CardContent className="py-8 prose prose-invert max-w-none">
                <h2 className="text-xl font-semibold mb-4">1. Data Controller</h2>
                <p className="text-muted-foreground mb-6">
                  <strong>Brainbaby Bilişim A.Ş.</strong> ("we", "us", "CardBoom") is the data controller responsible for your personal data. This privacy policy explains how we collect, use, and protect your information when you use our platform.
                </p>

                <h2 className="text-xl font-semibold mb-4">2. Information We Collect</h2>
                <p className="text-muted-foreground mb-4">
                  We collect information you provide directly to us, including:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground mb-6 space-y-1">
                  <li>Name, email address, phone number</li>
                  <li>T.C. Kimlik No (Turkish ID number) for identity verification</li>
                  <li>Payment and banking information (IBAN, card details)</li>
                  <li>Profile information and transaction history</li>
                  <li>Device information, IP address, and usage data</li>
                </ul>

                <h2 className="text-xl font-semibold mb-4">3. How We Use Your Information</h2>
                <p className="text-muted-foreground mb-4">
                  Brainbaby Bilişim A.Ş. uses the information we collect to:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground mb-6 space-y-1">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Process transactions and send related information</li>
                  <li>Verify identity and prevent fraud</li>
                  <li>Send technical notices, support messages, and updates</li>
                  <li>Respond to your comments and questions</li>
                  <li>Comply with legal obligations</li>
                </ul>

                <h2 className="text-xl font-semibold mb-4">4. Information Sharing</h2>
                <p className="text-muted-foreground mb-6">
                  Brainbaby Bilişim A.Ş. does not sell your personal information to third parties. We may share your information with trusted service providers who assist us in operating our platform, payment processors, shipping partners, and when required by law or to protect our rights.
                </p>

                <h2 className="text-xl font-semibold mb-4">5. Data Security</h2>
                <p className="text-muted-foreground mb-6">
                  We implement industry-standard security measures including 256-bit SSL encryption, secure data centers, and regular security audits. All sensitive information is transmitted via Secure Socket Layer (SSL) technology and stored using encryption at rest.
                </p>

                <h2 className="text-xl font-semibold mb-4">6. Cookies and Tracking</h2>
                <p className="text-muted-foreground mb-6">
                  We use cookies and similar technologies to understand and save your preferences, track usage patterns, and compile aggregate data about site traffic. You can control cookie preferences through your browser settings.
                </p>

                <h2 className="text-xl font-semibold mb-4">7. GDPR Compliance</h2>
                <p className="text-muted-foreground mb-6">
                  If you are a European resident, you have the right to access personal information we hold about you, request correction or deletion of your data, object to processing, and request data portability. Contact us at privacy@cardboom.com to exercise these rights.
                </p>

                <h2 className="text-xl font-semibold mb-4">8. KVKK Compliance</h2>
                <p className="text-muted-foreground mb-6">
                  In accordance with Turkish Personal Data Protection Law No. 6698 (KVKK), Brainbaby Bilişim A.Ş. processes your personal data lawfully and transparently. You have the right to learn about processing, request correction, object to automated decisions, and request deletion of your personal data. See our full KVKK disclosure at /kvkk.
                </p>

                <h2 className="text-xl font-semibold mb-4">9. Data Retention</h2>
                <p className="text-muted-foreground mb-6">
                  We retain your personal data for as long as necessary to provide our services and comply with legal obligations. Transaction records are kept for 10 years as required by Turkish commercial law.
                </p>

                <h2 className="text-xl font-semibold mb-4">10. Children's Privacy</h2>
                <p className="text-muted-foreground mb-6">
                  Our services are not intended for users under 18 years of age. We do not knowingly collect personal information from children without parental consent.
                </p>

                <h2 className="text-xl font-semibold mb-4">11. Changes to This Policy</h2>
                <p className="text-muted-foreground mb-6">
                  Brainbaby Bilişim A.Ş. may update this privacy policy from time to time. We will notify you of material changes by posting the new policy on this page and updating the "Last updated" date.
                </p>

                <h2 className="text-xl font-semibold mb-4">12. Contact Us</h2>
                <p className="text-muted-foreground">
                  <strong>Brainbaby Bilişim A.Ş.</strong><br />
                  Data Protection Officer: privacy@cardboom.com<br />
                  Address: Istanbul, Turkey<br />
                  Phone: +90 (212) XXX XX XX
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

export default Privacy;