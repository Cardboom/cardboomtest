import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Map, 
  ShoppingCart, 
  TrendingUp, 
  Newspaper, 
  HelpCircle, 
  Shield, 
  FileText,
  Users,
  Award,
  Gamepad2,
  BookOpen,
  Gavel,
  DollarSign,
  CreditCard,
  Star,
  Trophy
} from 'lucide-react';
import { CATEGORY_SEO_DATA, SITE_URL } from '@/lib/seoUtils';

const Sitemap = () => {
  const [cartOpen, setCartOpen] = useState(false);

  // Define all site sections
  const sections = [
    {
      title: 'Marketplace',
      icon: ShoppingCart,
      description: 'Buy and sell trading cards',
      links: [
        { name: 'Browse Marketplace', href: '/markets', priority: 'high' },
        { name: 'Active Listings', href: '/markets', priority: 'high' },
        { name: 'Wanted Board', href: '/markets#wanted', priority: 'medium' },
        { name: 'Deals & Discounts', href: '/deals', priority: 'medium' },
      ],
    },
    {
      title: 'Card Categories',
      icon: Gamepad2,
      description: 'Browse by card type',
      links: Object.entries(CATEGORY_SEO_DATA).map(([slug, data]) => ({
        name: data.pluralName,
        href: `/buy/${slug}-cards`,
        priority: 'high' as const,
      })),
    },
    {
      title: 'Price & Market Data',
      icon: TrendingUp,
      description: 'Track card values',
      links: [
        { name: 'Market Overview', href: '/', priority: 'high' },
        { name: 'Price Charts', href: '/markets', priority: 'medium' },
        { name: 'Top Gainers', href: '/', priority: 'medium' },
        { name: 'Top Losers', href: '/', priority: 'medium' },
      ],
    },
    {
      title: 'Card Grading',
      icon: Award,
      description: 'AI-powered card grading',
      links: [
        { name: 'Grading Services', href: '/grading', priority: 'high' },
        { name: 'Submit Cards', href: '/grading/new', priority: 'high' },
        { name: 'My Grading Orders', href: '/grading/orders', priority: 'medium' },
        { name: 'Grading API', href: '/api', priority: 'medium' },
      ],
    },
    {
      title: 'Community',
      icon: Users,
      description: 'Connect with collectors',
      links: [
        { name: 'Leaderboard', href: '/leaderboard', priority: 'medium' },
        { name: 'Hall of Fame', href: '/hall-of-fame', priority: 'medium' },
        { name: 'Card Wars', href: '/card-wars', priority: 'medium' },
        { name: 'CardBoom Pass', href: '/pass', priority: 'medium' },
        { name: 'Gaming Hub', href: '/gaming', priority: 'low' },
      ],
    },
    {
      title: 'News & Insights',
      icon: Newspaper,
      description: 'Stay informed',
      links: [
        { name: 'Blog', href: '/blog', priority: 'high' },
        { name: 'Market Insights', href: '/insights', priority: 'high' },
        { name: 'News', href: '/news', priority: 'medium' },
        { name: 'Press Room', href: '/press', priority: 'low' },
      ],
    },
    {
      title: 'Seller Tools',
      icon: DollarSign,
      description: 'For sellers',
      links: [
        { name: 'List a Card', href: '/sell', priority: 'high' },
        { name: 'Become Verified Seller', href: '/verified-seller', priority: 'high' },
        { name: 'Seller Pricing', href: '/pricing', priority: 'medium' },
        { name: 'API Access', href: '/api', priority: 'medium' },
      ],
    },
    {
      title: 'Help & Support',
      icon: HelpCircle,
      description: 'Get assistance',
      links: [
        { name: 'Help Center', href: '/help', priority: 'high' },
        { name: 'Safety Guide', href: '/safety', priority: 'high' },
        { name: 'Referral Program', href: '/referrals', priority: 'medium' },
      ],
    },
    {
      title: 'Company',
      icon: BookOpen,
      description: 'About CardBoom',
      links: [
        { name: 'About Us', href: '/about', priority: 'medium' },
        { name: 'Careers', href: '/careers', priority: 'low' },
        { name: 'Press', href: '/press', priority: 'low' },
      ],
    },
    {
      title: 'Legal',
      icon: FileText,
      description: 'Policies and terms',
      links: [
        { name: 'Terms of Service', href: '/terms', priority: 'low' },
        { name: 'Privacy Policy', href: '/privacy', priority: 'low' },
        { name: 'KVKK', href: '/kvkk', priority: 'low' },
        { name: 'User Agreement', href: '/kullanici-sozlesmesi', priority: 'low' },
        { name: 'Distance Sales Contract', href: '/mesafeli-satis-sozlesmesi', priority: 'low' },
      ],
    },
  ];

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-primary/20 text-primary text-[10px]">Popular</Badge>;
      case 'medium':
        return null;
      case 'low':
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Sitemap | CardBoom - All Pages</title>
        <meta name="description" content="Complete sitemap of CardBoom. Find all pages including marketplace, card categories, grading services, community features, and more." />
        <link rel="canonical" href="https://cardboom.com/sitemap" />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <Header cartCount={0} onCartClick={() => setCartOpen(!cartOpen)} />

      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted mb-4">
            <Map className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Site Navigation</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Sitemap
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Find everything on CardBoom. Browse all pages organized by category to quickly find what you're looking for.
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { name: 'Marketplace', href: '/markets', icon: ShoppingCart },
            { name: 'Grading', href: '/grading', icon: Award },
            { name: 'Blog', href: '/blog', icon: Newspaper },
            { name: 'Help', href: '/help', icon: HelpCircle },
          ].map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="flex items-center justify-center gap-2 p-4 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
            >
              <item.icon className="w-5 h-5 text-primary" />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </div>

        {/* All Sections */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section) => (
            <Card key={section.title} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <section.icon className="w-5 h-5 text-primary" />
                  {section.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {section.links.map((link) => (
                    <li key={link.href + link.name}>
                      <Link
                        to={link.href}
                        className="flex items-center justify-between group py-1.5 px-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <span className="text-sm group-hover:text-primary transition-colors">
                          {link.name}
                        </span>
                        {getPriorityBadge(link.priority)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* XML Sitemap Reference */}
        <div className="mt-12 p-6 rounded-xl bg-muted text-center">
          <h2 className="font-semibold mb-2">For Search Engines</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Our XML sitemaps are available for search engine crawlers
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <a 
              href="/sitemap-static.xml" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              sitemap-static.xml
            </a>
            <span className="text-muted-foreground">•</span>
            <a 
              href="https://kgffwhyfgkqeevsuhldt.supabase.co/functions/v1/sitemap?type=index" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Dynamic Sitemap Index
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Sitemap;
