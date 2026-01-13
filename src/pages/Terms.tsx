import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const Terms = () => {
  return (
    <>
      <Helmet>
        <title>Terms of Service | CardBoom</title>
        <meta name="description" content="CardBoom Terms of Service - Read our terms and conditions for using the CardBoom collectibles marketplace operated by Brainbaby Bilişim A.Ş." />
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
              <p className="text-muted-foreground">Last updated: January 13, 2026</p>
              <p className="text-sm text-muted-foreground mt-2">Effective Date: January 13, 2026</p>
            </div>

            <Card>
              <CardContent className="py-8 prose prose-invert max-w-none space-y-6">
                <section>
                  <h2 className="text-xl font-semibold mb-4">1. Company Information & Legal Entity</h2>
                  <p className="text-muted-foreground mb-4">
                    CardBoom is a digital marketplace platform operated by <strong>Brainbaby Bilişim Anonim Şirketi</strong> ("Brainbaby Bilişim A.Ş.", "Company", "we", "us", or "our"), a company duly incorporated and registered under the laws of the Republic of Turkey.
                  </p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    <li><strong>Company Name:</strong> Brainbaby Bilişim Anonim Şirketi</li>
                    <li><strong>Trade Registry:</strong> Istanbul Trade Registry</li>
                    <li><strong>Registered Address:</strong> Istanbul, Turkey</li>
                    <li><strong>Email:</strong> legal@cardboom.com</li>
                    <li><strong>Customer Service:</strong> support@cardboom.com</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">2. Acceptance of Terms</h2>
                  <p className="text-muted-foreground mb-4">
                    By accessing, browsing, or using CardBoom (the "Platform"), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service ("Terms"), our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, <Link to="/kvkk" className="text-primary hover:underline">KVKK Privacy Notice</Link>, and <Link to="/mesafeli-satis-sozlesmesi" className="text-primary hover:underline">Distance Sales Contract</Link>.
                  </p>
                  <p className="text-muted-foreground">
                    <strong>IF YOU DO NOT AGREE TO THESE TERMS, YOU MUST NOT ACCESS OR USE THE PLATFORM.</strong> Your continued use of the Platform constitutes your ongoing acceptance of these Terms as amended from time to time.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">3. Eligibility & User Accounts</h2>
                  <p className="text-muted-foreground mb-4">To use CardBoom, you must:</p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
                    <li>Be at least 18 years of age, or the age of legal majority in your jurisdiction</li>
                    <li>Have the legal capacity to enter into binding contracts</li>
                    <li>Not be prohibited from using the Platform under applicable laws</li>
                    <li>Provide accurate, current, and complete registration information</li>
                    <li>Maintain the security and confidentiality of your account credentials</li>
                  </ul>
                  <p className="text-muted-foreground">
                    You are solely responsible for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account at security@cardboom.com.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">4. Platform Services</h2>
                  <p className="text-muted-foreground mb-4">CardBoom provides the following services:</p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    <li><strong>Marketplace:</strong> Buy and sell trading cards, collectibles, and related items</li>
                    <li><strong>Vault Storage:</strong> Secure storage for collectibles in our insured facilities</li>
                    <li><strong>Portfolio Tracking:</strong> Track the value of your collection</li>
                    <li><strong>Grading Services:</strong> Submit cards for professional grading</li>
                    <li><strong>Fractional Ownership:</strong> Purchase shares in high-value collectibles</li>
                    <li><strong>Gaming Services:</strong> Digital game products and coaching services</li>
                    <li><strong>Auctions:</strong> Bid on collectibles in timed auctions</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">5. Fees, Commissions & Payment Terms</h2>
                  <p className="text-muted-foreground mb-4">
                    By using CardBoom, you agree to the following fee structure:
                  </p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
                    <li><strong>Credit Card Top-up Fee:</strong> 6.5% + $0.50 per transaction</li>
                    <li><strong>Wire Transfer Top-up Fee:</strong> 3% + $0.50 per transaction</li>
                    <li><strong>Seller Commission:</strong> 5% of the sale price on completed transactions</li>
                    <li><strong>Withdrawal Fee:</strong> Varies by method and destination</li>
                  </ul>
                  <p className="text-muted-foreground">
                    All fees are subject to change with 30 days advance notice. Current fee schedules are available on our <Link to="/pricing" className="text-primary hover:underline">Pricing Page</Link>. Fees are non-refundable unless otherwise stated.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">6. Seller Obligations</h2>
                  <p className="text-muted-foreground mb-4">If you sell items on CardBoom, you agree to:</p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    <li>Provide accurate descriptions, images, and condition assessments</li>
                    <li>Only list items you own and have the legal right to sell</li>
                    <li>Ship items within the specified timeframe (default: 5 business days)</li>
                    <li>Use appropriate packaging to prevent damage during shipping</li>
                    <li>Not engage in shill bidding, price manipulation, or fraudulent activities</li>
                    <li>Respond to buyer inquiries within 48 hours</li>
                    <li>Accept returns for items significantly not as described</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">7. Buyer Obligations</h2>
                  <p className="text-muted-foreground mb-4">If you purchase items on CardBoom, you agree to:</p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    <li>Pay for items promptly upon purchase confirmation</li>
                    <li>Provide accurate shipping information</li>
                    <li>Inspect items upon receipt and report issues within 72 hours</li>
                    <li>Not file fraudulent disputes or chargebacks</li>
                    <li>Communicate in good faith with sellers</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">8. Prohibited Activities</h2>
                  <p className="text-muted-foreground mb-4">You may NOT use CardBoom to:</p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    <li>Sell counterfeit, stolen, or illegally obtained items</li>
                    <li>Misrepresent item authenticity, condition, or grading</li>
                    <li>Engage in money laundering or terrorist financing</li>
                    <li>Manipulate prices, bids, or market data</li>
                    <li>Circumvent platform fees through off-platform transactions</li>
                    <li>Harass, threaten, or defame other users</li>
                    <li>Violate intellectual property rights</li>
                    <li>Use bots, scrapers, or automated tools without authorization</li>
                    <li>Interfere with platform security or infrastructure</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">9. Dispute Resolution</h2>
                  <p className="text-muted-foreground mb-4">
                    In the event of a dispute between buyers and sellers:
                  </p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
                    <li>Users must first attempt to resolve disputes directly</li>
                    <li>If unresolved, either party may request CardBoom mediation</li>
                    <li>CardBoom may hold funds in escrow during dispute resolution</li>
                    <li>CardBoom's decisions in dispute matters are final and binding</li>
                    <li>Dispute resolution timeframe: up to 30 days from filing</li>
                  </ul>
                  <p className="text-muted-foreground">
                    For disputes not resolved through our internal process, Turkish courts in Istanbul shall have exclusive jurisdiction.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">10. Limitation of Liability</h2>
                  <p className="text-muted-foreground mb-4">
                    <strong>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:</strong>
                  </p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                    <li>Brainbaby Bilişim A.Ş. provides the Platform "AS IS" and "AS AVAILABLE" without warranties of any kind, express or implied.</li>
                    <li>We do not guarantee the authenticity, quality, or condition of items listed by third-party sellers.</li>
                    <li>We are not responsible for losses arising from user-to-user transactions, shipping damage, or third-party service failures.</li>
                    <li>Our total aggregate liability shall not exceed the fees paid by you to CardBoom in the 12 months preceding the claim.</li>
                    <li>We shall not be liable for indirect, incidental, special, consequential, or punitive damages.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">11. Indemnification</h2>
                  <p className="text-muted-foreground">
                    You agree to indemnify, defend, and hold harmless Brainbaby Bilişim A.Ş., its officers, directors, employees, and agents from any claims, damages, losses, liabilities, costs, and expenses (including reasonable legal fees) arising from: (a) your use of the Platform; (b) your violation of these Terms; (c) your violation of any third-party rights; or (d) your conduct in connection with the Platform.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">12. Intellectual Property</h2>
                  <p className="text-muted-foreground mb-4">
                    The CardBoom name, logo, and all related marks, graphics, and software are the property of Brainbaby Bilişim A.Ş. All rights reserved.
                  </p>
                  <p className="text-muted-foreground">
                    <strong>Third-Party Trademarks:</strong> Pokémon, Magic: The Gathering, Yu-Gi-Oh!, One Piece, Disney Lorcana, and all related names and images are trademarks of their respective owners. CardBoom is an independent marketplace and is not affiliated with, endorsed by, or sponsored by any of these trademark owners.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">13. Account Termination</h2>
                  <p className="text-muted-foreground mb-4">
                    We may suspend or terminate your account at any time for:
                  </p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    <li>Violation of these Terms</li>
                    <li>Fraudulent or illegal activity</li>
                    <li>Repeated disputes or chargebacks</li>
                    <li>Failure to complete transactions</li>
                    <li>Request by law enforcement or regulatory authorities</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">14. Governing Law & Jurisdiction</h2>
                  <p className="text-muted-foreground">
                    These Terms shall be governed by and construed in accordance with the laws of the Republic of Turkey, without regard to conflict of law principles. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Istanbul, Turkey. The parties agree that the Istanbul Consumer Arbitration Committees and Istanbul Courts shall have jurisdiction for consumer disputes.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">15. Severability & Waiver</h2>
                  <p className="text-muted-foreground">
                    If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect. Our failure to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">16. Amendments</h2>
                  <p className="text-muted-foreground">
                    Brainbaby Bilişim A.Ş. reserves the right to modify these Terms at any time. Material changes will be notified via email or prominent notice on the Platform at least 30 days before taking effect. Continued use of the Platform after changes become effective constitutes acceptance of the modified Terms.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">17. Contact Information</h2>
                  <div className="text-muted-foreground">
                    <p className="font-semibold mb-2">Brainbaby Bilişim Anonim Şirketi</p>
                    <ul className="space-y-1">
                      <li><strong>Legal Inquiries:</strong> legal@cardboom.com</li>
                      <li><strong>Customer Support:</strong> support@cardboom.com</li>
                      <li><strong>Data Protection:</strong> privacy@cardboom.com</li>
                      <li><strong>Address:</strong> Istanbul, Turkey</li>
                    </ul>
                  </div>
                </section>

                <section className="border-t border-border pt-6">
                  <h2 className="text-xl font-semibold mb-4">Related Legal Documents</h2>
                  <ul className="space-y-2">
                    <li>
                      <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                    </li>
                    <li>
                      <Link to="/kvkk" className="text-primary hover:underline">KVKK Privacy Notice (Turkish Data Protection)</Link>
                    </li>
                    <li>
                      <Link to="/mesafeli-satis-sozlesmesi" className="text-primary hover:underline">Distance Sales Contract (Mesafeli Satış Sözleşmesi)</Link>
                    </li>
                    <li>
                      <Link to="/kullanici-sozlesmesi" className="text-primary hover:underline">User Agreement (Kullanıcı Sözleşmesi)</Link>
                    </li>
                  </ul>
                </section>
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