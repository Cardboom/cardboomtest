import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, MessageCircle, BookOpen, CreditCard, Package, Shield, HelpCircle, Send, Phone, Mail, Gamepad2, PieChart, TrendingUp, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const Help = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('getting-started');
  const [ticketForm, setTicketForm] = useState({ subject: '', message: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    { id: 'getting-started', icon: BookOpen, title: 'Getting Started', description: 'Learn the basics of using CardBoom' },
    { id: 'buying-selling', icon: Package, title: 'Buying & Selling', description: 'How to buy and sell collectibles' },
    { id: 'payments', icon: CreditCard, title: 'Payments & Wallet', description: 'Payment methods, fees, and wallet' },
    { id: 'security', icon: Shield, title: 'Security & Verification', description: 'Account security and KYC' },
    { id: 'fractional', icon: PieChart, title: 'Fractional Shares', description: 'Investing in card shares' },
    { id: 'gaming', icon: Gamepad2, title: 'Gaming Services', description: 'VP, UC, coaching & more' },
  ];

  const faqData: Record<string, Array<{ q: string; a: string }>> = {
    'getting-started': [
      { q: 'How do I create an account?', a: 'Click "Register" in the header, fill in your details including phone number and T.C. Kimlik No for verification, then confirm your email.' },
      { q: 'What collectibles can I trade on CardBoom?', a: 'We support Pokemon, Yu-Gi-Oh!, One Piece, Lorcana, Magic: The Gathering, sports cards (NBA, NFL), designer figures (KAWS, Bearbrick), and more.' },
      { q: 'How does the XP and level system work?', a: 'Earn XP through purchases, sales, listings, referrals, daily logins, and reviews. Higher levels unlock rewards like fee discounts and exclusive drops.' },
      { q: 'Is CardBoom available in my country?', a: 'CardBoom is operated by Brainbaby Bilişim A.Ş. in Turkey but serves collectors worldwide. Shipping availability varies by seller.' },
    ],
    'buying-selling': [
      { q: 'How do I list an item for sale?', a: 'Go to "Sell" in the menu, upload photos, set your price, choose delivery options (ship/vault/trade), and publish your listing.' },
      { q: 'How does buyer protection work?', a: 'All purchases are protected by escrow. Funds are held until the buyer confirms receipt. If items don\'t match descriptions, you can open a dispute.' },
      { q: 'What are the seller fees?', a: 'Sellers pay 5% commission on successful sales. Verified Sellers enjoy reduced 3% rates. There are no listing fees.' },
      { q: 'How long does shipping take?', a: 'Standard shipping within Turkey is 3-5 business days. International shipping varies by destination. Vault items can be traded instantly.' },
    ],
    'payments': [
      { q: 'How do I add money to my wallet?', a: 'Go to Wallet, click "Top Up", choose credit card or bank transfer. For wire transfers, use your unique transfer code in the description.' },
      { q: 'How do withdrawals work?', a: 'Add your verified IBAN, request withdrawal from your wallet. Processing takes 1-3 business days after KYC verification.' },
      { q: 'What currencies are supported?', a: 'We support TRY, USD, and EUR. Currency conversion is automatic based on live exchange rates.' },
      { q: 'Are my payment details secure?', a: 'All payments are processed through licensed providers with 3D Secure. We never store full card numbers.' },
    ],
    'security': [
      { q: 'How do I verify my identity?', a: 'Go to Profile → Verification. Upload your ID document and complete the verification process. This is required for withdrawals and selling.' },
      { q: 'What is 2FA and how do I enable it?', a: 'Two-factor authentication adds an extra security layer. Enable it in Profile → Security settings using your phone number.' },
      { q: 'What should I do if my account is compromised?', a: 'Contact support immediately at destek@cardboom.com. We\'ll help you secure your account and investigate any unauthorized activity.' },
      { q: 'How does CardBoom detect fake cards?', a: 'We accept PSA/BGS/CGC graded cards, have a Verified Seller program, AI-assisted card scanning, and full buyer protection with refunds for counterfeits.' },
    ],
    'fractional': [
      { q: 'What are fractional shares?', a: 'Buy shares of expensive collectibles you couldn\'t afford alone. For example, own 1% of a $50,000 card for $500.' },
      { q: 'How do I sell my shares?', a: 'List your shares on the secondary market at your desired price. When someone buys, you receive funds minus the 1% transaction fee.' },
      { q: 'Where is the physical card stored?', a: 'All fractional cards are stored in CardBoom\'s insured Vault facility. Daily verification photos confirm card condition.' },
      { q: 'What happens when a fractional card sells?', a: 'Shareholders vote on sale offers. When approved, proceeds are distributed proportionally. You can also trade shares anytime.' },
    ],
    'gaming': [
      { q: 'How do I buy Valorant Points (VP)?', a: 'Go to Gaming → Valorant, select your region and VP amount, complete payment, and receive your VP code via email within minutes.' },
      { q: 'How does coaching work?', a: 'Browse verified coaches, check their reviews and expertise, and book 1-on-1 sessions or VOD reviews. Coaches provide personalized training to help you improve.' },
      { q: 'What games does CardBoom Gaming support?', a: 'Valorant (VP), PUBG Mobile (UC), League of Legends, and coaching/VOD review services for various competitive games.' },
      { q: 'Can I get a refund for gaming purchases?', a: 'Unused codes can be refunded within 24 hours. Activated codes and completed coaching sessions are non-refundable.' },
    ],
  };

  const filteredFaqs = searchQuery 
    ? Object.values(faqData).flat().filter(
        faq => faq.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
               faq.a.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : faqData[activeCategory] || [];

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.subject || !ticketForm.message || !ticketForm.email) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setIsSubmitting(true);
    // Simulate ticket submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Support ticket submitted! We\'ll respond within 24 hours.');
    setTicketForm({ subject: '', message: '', email: '' });
    setIsSubmitting(false);
  };

  return (
    <>
      <Helmet>
        <title>Help Center | CardBoom</title>
        <meta name="description" content="Get help with CardBoom - FAQs, guides, and support for buying, selling, payments, security, and more." />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />

        <main className="container mx-auto px-4 py-12">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="text-center mb-10">
              <Badge className="mb-4">Help Center</Badge>
              <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
                How can we help?
              </h1>
              <p className="text-muted-foreground text-lg mb-6">
                Search our knowledge base or browse categories below
              </p>
              <div className="relative max-w-xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search for help..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-14 text-lg"
                />
              </div>
            </div>

            <Tabs defaultValue="faq" className="space-y-8">
              <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
                <TabsTrigger value="faq">FAQ</TabsTrigger>
                <TabsTrigger value="contact">Contact Us</TabsTrigger>
                <TabsTrigger value="guides">Quick Guides</TabsTrigger>
              </TabsList>

              {/* FAQ Tab */}
              <TabsContent value="faq" className="space-y-6">
                {/* Category Buttons */}
                {!searchQuery && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          activeCategory === cat.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border/50 hover:border-primary/50 bg-card/50'
                        }`}
                      >
                        <cat.icon className={`w-6 h-6 mb-2 ${activeCategory === cat.id ? 'text-primary' : 'text-muted-foreground'}`} />
                        <h3 className="font-semibold text-sm">{cat.title}</h3>
                        <p className="text-xs text-muted-foreground">{cat.description}</p>
                      </button>
                    ))}
                  </div>
                )}

                {/* FAQ Accordion */}
                <Card>
                  <CardContent className="py-6">
                    {searchQuery && (
                      <p className="text-sm text-muted-foreground mb-4">
                        Found {filteredFaqs.length} results for "{searchQuery}"
                      </p>
                    )}
                    <Accordion type="single" collapsible className="space-y-2">
                      {filteredFaqs.map((faq, idx) => (
                        <AccordionItem key={idx} value={`faq-${idx}`} className="border rounded-lg px-4">
                          <AccordionTrigger className="text-left hover:no-underline py-4">
                            {faq.q}
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground pb-4">
                            {faq.a}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Contact Tab */}
              <TabsContent value="contact" className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Contact Info */}
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="py-6 space-y-4">
                        <h3 className="font-semibold text-lg">Contact Information</h3>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Mail className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Email</p>
                              <p className="font-medium">destek@cardboom.com</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Phone className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Phone</p>
                              <p className="font-medium">+90 (212) XXX XX XX</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <MessageCircle className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Live Chat</p>
                              <p className="font-medium">Available 9AM-9PM (GMT+3)</p>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground pt-4 border-t">
                          Operated by Brainbaby Bilişim A.Ş., Istanbul, Turkey
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Support Ticket Form */}
                  <Card>
                    <CardContent className="py-6">
                      <h3 className="font-semibold text-lg mb-4">Submit a Support Ticket</h3>
                      <form onSubmit={handleSubmitTicket} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Your Email</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="your@email.com"
                            value={ticketForm.email}
                            onChange={(e) => setTicketForm({ ...ticketForm, email: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="subject">Subject</Label>
                          <Input
                            id="subject"
                            placeholder="Brief description of your issue"
                            value={ticketForm.subject}
                            onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="message">Message</Label>
                          <Textarea
                            id="message"
                            placeholder="Describe your issue in detail..."
                            rows={5}
                            value={ticketForm.message}
                            onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                          <Send className="w-4 h-4" />
                          {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Quick Guides Tab */}
              <TabsContent value="guides" className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { title: 'First Purchase Guide', icon: Package, desc: 'Complete your first purchase step by step', time: '3 min read' },
                    { title: 'Seller Quick Start', icon: TrendingUp, desc: 'List your first item and make a sale', time: '5 min read' },
                    { title: 'Wallet & Payments', icon: Wallet, desc: 'Fund your wallet and understand fees', time: '4 min read' },
                    { title: 'Identity Verification', icon: Shield, desc: 'Complete KYC to unlock all features', time: '2 min read' },
                    { title: 'Fractional Investing', icon: PieChart, desc: 'Invest in high-value cards with shares', time: '6 min read' },
                    { title: 'Gaming Services', icon: Gamepad2, desc: 'Buy VP, UC, and boosting services', time: '3 min read' },
                  ].map((guide, idx) => (
                    <Card key={idx} className="hover:border-primary/50 transition-colors cursor-pointer">
                      <CardContent className="py-5">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <guide.icon className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{guide.title}</h3>
                            <p className="text-sm text-muted-foreground">{guide.desc}</p>
                            <span className="text-xs text-primary mt-2 inline-block">{guide.time}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Help;