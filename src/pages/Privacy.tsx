import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const Privacy = () => {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | CardBoom</title>
        <meta name="description" content="CardBoom Privacy Policy - Learn how Brainbaby Bilişim A.Ş. collects, uses, and protects your personal information in compliance with GDPR and KVKK." />
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
              <p className="text-muted-foreground">Last updated: January 13, 2026</p>
              <p className="text-sm text-muted-foreground mt-2">Effective Date: January 13, 2026</p>
            </div>

            <Card>
              <CardContent className="py-8 prose prose-invert max-w-none space-y-6">
                <section>
                  <h2 className="text-xl font-semibold mb-4">1. Data Controller</h2>
                  <p className="text-muted-foreground mb-4">
                    <strong>Brainbaby Bilişim Anonim Şirketi</strong> ("Brainbaby Bilişim A.Ş.", "Company", "we", "us", or "CardBoom") is the data controller responsible for your personal data under the EU General Data Protection Regulation (GDPR) and Turkish Personal Data Protection Law No. 6698 (KVKK).
                  </p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    <li><strong>Company Name:</strong> Brainbaby Bilişim Anonim Şirketi</li>
                    <li><strong>Data Protection Officer:</strong> privacy@cardboom.com</li>
                    <li><strong>Registered Address:</strong> Istanbul, Turkey</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">2. Information We Collect</h2>
                  
                  <h3 className="text-lg font-medium mt-4 mb-2">2.1 Information You Provide</h3>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
                    <li><strong>Identity Data:</strong> Full name, username, date of birth, T.C. Kimlik No (Turkish ID), passport number</li>
                    <li><strong>Contact Data:</strong> Email address, phone number, shipping address, billing address</li>
                    <li><strong>Financial Data:</strong> Bank account details (IBAN), payment card information (processed by payment providers)</li>
                    <li><strong>Profile Data:</strong> Avatar, bio, preferences, transaction history</li>
                    <li><strong>Communication Data:</strong> Messages, support tickets, feedback</li>
                  </ul>

                  <h3 className="text-lg font-medium mt-4 mb-2">2.2 Information Collected Automatically</h3>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    <li><strong>Device Data:</strong> IP address, browser type, operating system, device identifiers</li>
                    <li><strong>Usage Data:</strong> Pages visited, features used, time spent, click patterns</li>
                    <li><strong>Location Data:</strong> Approximate location based on IP address</li>
                    <li><strong>Cookie Data:</strong> Session identifiers, preferences, analytics (see Section 8)</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">3. Legal Basis for Processing</h2>
                  <p className="text-muted-foreground mb-4">We process your personal data based on:</p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    <li><strong>Contract Performance:</strong> To provide our marketplace services</li>
                    <li><strong>Legal Obligation:</strong> Tax compliance, anti-money laundering, fraud prevention</li>
                    <li><strong>Legitimate Interest:</strong> Security, analytics, service improvement</li>
                    <li><strong>Consent:</strong> Marketing communications (where applicable)</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">4. How We Use Your Information</h2>
                  <p className="text-muted-foreground mb-4">Brainbaby Bilişim A.Ş. uses your data to:</p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    <li>Provide, maintain, and improve our Platform and services</li>
                    <li>Process transactions, payments, and withdrawals</li>
                    <li>Verify your identity and prevent fraud</li>
                    <li>Send transactional notifications (orders, shipping, account security)</li>
                    <li>Provide customer support and respond to inquiries</li>
                    <li>Enforce our Terms of Service and policies</li>
                    <li>Comply with legal obligations (tax, AML, regulatory)</li>
                    <li>Analyze usage patterns to improve user experience</li>
                    <li>Send marketing communications (with your consent)</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">5. Information Sharing & Disclosure</h2>
                  <p className="text-muted-foreground mb-4">
                    <strong>We do NOT sell your personal data.</strong> We may share your information with:
                  </p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                    <li><strong>Other Users:</strong> Sellers see buyer shipping info; buyers see seller store info</li>
                    <li><strong>Payment Processors:</strong> To process transactions (Stripe, bank partners)</li>
                    <li><strong>Shipping Partners:</strong> Carrier information for delivery</li>
                    <li><strong>Grading Services:</strong> When you submit cards for authentication</li>
                    <li><strong>Service Providers:</strong> Hosting, analytics, customer support tools</li>
                    <li><strong>Legal Authorities:</strong> When required by law, court order, or to protect rights</li>
                    <li><strong>Business Transfers:</strong> In connection with merger, acquisition, or asset sale</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">6. International Data Transfers</h2>
                  <p className="text-muted-foreground">
                    Your data may be transferred to and processed in countries outside Turkey or the EU/EEA. We ensure appropriate safeguards through Standard Contractual Clauses (SCCs), adequacy decisions, or other lawful transfer mechanisms. By using CardBoom, you consent to such transfers.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">7. Data Security</h2>
                  <p className="text-muted-foreground mb-4">We implement industry-standard security measures:</p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    <li>256-bit TLS/SSL encryption for data in transit</li>
                    <li>AES-256 encryption for sensitive data at rest</li>
                    <li>Regular security audits and penetration testing</li>
                    <li>Role-based access controls for employee access</li>
                    <li>Multi-factor authentication for account security</li>
                    <li>Secure, certified data centers</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">8. Cookies & Tracking Technologies</h2>
                  <p className="text-muted-foreground mb-4">We use cookies and similar technologies for:</p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
                    <li><strong>Essential Cookies:</strong> Authentication, security, cart functionality</li>
                    <li><strong>Preference Cookies:</strong> Language, currency, display settings</li>
                    <li><strong>Analytics Cookies:</strong> Usage patterns, performance monitoring</li>
                    <li><strong>Marketing Cookies:</strong> Advertising effectiveness (with consent)</li>
                  </ul>
                  <p className="text-muted-foreground">
                    You can manage cookie preferences through our cookie banner or your browser settings. Note that disabling essential cookies may affect Platform functionality.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">9. Your Rights (GDPR)</h2>
                  <p className="text-muted-foreground mb-4">If you are in the EU/EEA, you have the right to:</p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    <li><strong>Access:</strong> Obtain a copy of your personal data</li>
                    <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
                    <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
                    <li><strong>Restriction:</strong> Limit how we process your data</li>
                    <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format</li>
                    <li><strong>Object:</strong> Object to processing based on legitimate interests</li>
                    <li><strong>Withdraw Consent:</strong> Revoke consent at any time (without affecting prior processing)</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    Contact privacy@cardboom.com to exercise these rights. You also have the right to lodge a complaint with your local data protection authority.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">10. Your Rights (KVKK - Turkey)</h2>
                  <p className="text-muted-foreground mb-4">
                    Under Turkish Law No. 6698 (KVKK), you have the right to:
                  </p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    <li>Learn whether your personal data is being processed</li>
                    <li>Request information about data processing</li>
                    <li>Learn the purpose of processing and whether data is used accordingly</li>
                    <li>Know third parties to whom data is transferred</li>
                    <li>Request rectification of incomplete or inaccurate data</li>
                    <li>Request deletion or destruction of data</li>
                    <li>Object to automated decision-making</li>
                    <li>Claim compensation for damages due to unlawful processing</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    See our full <Link to="/kvkk" className="text-primary hover:underline">KVKK Privacy Notice</Link> for detailed information.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">11. Data Retention</h2>
                  <p className="text-muted-foreground mb-4">We retain your data for:</p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    <li><strong>Account Data:</strong> Duration of account + 5 years</li>
                    <li><strong>Transaction Records:</strong> 10 years (Turkish commercial law requirement)</li>
                    <li><strong>Tax Records:</strong> 5 years (tax authority requirements)</li>
                    <li><strong>Communication Logs:</strong> 3 years</li>
                    <li><strong>Analytics Data:</strong> 26 months (anonymized thereafter)</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">12. Children's Privacy</h2>
                  <p className="text-muted-foreground">
                    CardBoom is not intended for users under 18 years of age. We do not knowingly collect personal data from children. If we learn that we have collected data from a child without parental consent, we will delete it promptly. Parents or guardians who believe their child has provided data should contact us at privacy@cardboom.com.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">13. Changes to This Policy</h2>
                  <p className="text-muted-foreground">
                    We may update this Privacy Policy from time to time. Material changes will be notified via email or prominent notice on the Platform at least 30 days before taking effect. The "Last updated" date at the top indicates when the policy was last revised.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">14. Contact Us</h2>
                  <div className="text-muted-foreground">
                    <p className="font-semibold mb-2">Brainbaby Bilişim Anonim Şirketi</p>
                    <ul className="space-y-1">
                      <li><strong>Data Protection Officer:</strong> privacy@cardboom.com</li>
                      <li><strong>Legal Inquiries:</strong> legal@cardboom.com</li>
                      <li><strong>Customer Support:</strong> support@cardboom.com</li>
                      <li><strong>Address:</strong> Istanbul, Turkey</li>
                    </ul>
                  </div>
                </section>

                <section className="border-t border-border pt-6">
                  <h2 className="text-xl font-semibold mb-4">Related Legal Documents</h2>
                  <ul className="space-y-2">
                    <li>
                      <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
                    </li>
                    <li>
                      <Link to="/kvkk" className="text-primary hover:underline">KVKK Privacy Notice (Turkish Data Protection)</Link>
                    </li>
                    <li>
                      <Link to="/mesafeli-satis-sozlesmesi" className="text-primary hover:underline">Distance Sales Contract</Link>
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

export default Privacy;