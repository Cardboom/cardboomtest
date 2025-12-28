import { Helmet } from 'react-helmet-async';
import { 
  Shield, TrendingUp, PieChart, Swords, Film, Gamepad2, 
  CreditCard, Award, Users, Bell, Search, BarChart3,
  Wallet, Store, Globe, Lock, Zap, Target, MessageCircle,
  Camera, Trophy, Gift, Star, Heart, Layers, Box
} from 'lucide-react';
import { cn } from '@/lib/utils';

const allFeatures = [
  // Core Trading Features
  {
    category: 'Marketplace',
    items: [
      { icon: Store, title: 'Live Marketplace', description: 'Buy and sell Pokemon cards, Magic the Gathering, Yu-Gi-Oh, sports cards, and collectibles with real-time pricing' },
      { icon: Search, title: 'Smart Search', description: 'AI-powered card search across all TCG categories with instant price comparisons' },
      { icon: Target, title: 'Arbitrage Finder', description: 'Spot price gaps across platforms. Find undervalued cards and flip for profit' },
      { icon: Bell, title: 'Price Alerts', description: 'Get notified when card prices drop or reach your target. Never miss a deal' },
      { icon: MessageCircle, title: 'Secure Messaging', description: 'Direct communication with sellers and buyers for trades and negotiations' },
    ]
  },
  // AI Grading Features
  {
    category: 'AI Grading',
    items: [
      { icon: Shield, title: 'Instant AI Grading', description: 'Get PSA-equivalent card grades in seconds using computer vision technology' },
      { icon: Camera, title: 'Photo Analysis', description: 'Upload front and back photos for comprehensive centering, corners, edges, and surface analysis' },
      { icon: Award, title: 'Grade Certification', description: 'Digital certificates with unique IDs for your graded cards' },
      { icon: BarChart3, title: 'Grade Comparison', description: 'See how different grades affect your card value with real market data' },
    ]
  },
  // Portfolio & Analytics
  {
    category: 'Portfolio Tracking',
    items: [
      { icon: PieChart, title: 'Portfolio Dashboard', description: 'Track your entire card collection value with real-time market updates' },
      { icon: TrendingUp, title: 'Performance Analytics', description: 'Monitor gains, losses, and ROI across your trading card investments' },
      { icon: Layers, title: 'Collection Import', description: 'Import cards from other platforms or spreadsheets instantly' },
      { icon: Zap, title: 'Heat Score', description: 'Know which cards in your portfolio are hot right now based on market activity' },
    ]
  },
  // Social & Community
  {
    category: 'Community',
    items: [
      { icon: Film, title: 'Boom Reels', description: 'TikTok-style short videos for pack openings, pulls, and collection showcases' },
      { icon: Swords, title: 'Card Wars', description: 'Vote on card battles and compete for prize pools. Pro members earn real rewards' },
      { icon: Users, title: 'Creator Profiles', description: 'Follow top collectors and traders. Copy their picks and strategies' },
      { icon: Trophy, title: 'Leaderboards', description: 'Compete globally for XP, trading volume, and collection value rankings' },
      { icon: Star, title: 'Achievements', description: 'Unlock badges and earn XP for trading milestones and community participation' },
    ]
  },
  // Trading & Payments
  {
    category: 'Trading & Payments',
    items: [
      { icon: CreditCard, title: 'Secure Payments', description: 'Credit card and wire transfer support with buyer and seller protection' },
      { icon: Wallet, title: 'Digital Wallet', description: 'Instant deposits and withdrawals. Keep funds ready for quick purchases' },
      { icon: Lock, title: 'Escrow Protection', description: 'Funds held securely until both parties confirm successful transactions' },
      { icon: Gift, title: 'Referral Rewards', description: 'Earn bonuses for inviting friends. Get XP and wallet credits' },
    ]
  },
  // Advanced Features
  {
    category: 'Advanced',
    items: [
      { icon: Box, title: 'Fractional Ownership', description: 'Own shares of high-value graded cards. Invest in expensive collectibles affordably' },
      { icon: Gamepad2, title: 'Gaming Integration', description: 'Trade in-game currency, esports collectibles, and gaming memorabilia' },
      { icon: Globe, title: 'Multi-TCG Support', description: 'Pokemon, Magic, Yu-Gi-Oh, One Piece, Lorcana, Digimon, sports cards, and more' },
      { icon: Heart, title: 'Watchlist', description: 'Save cards you want to track. Get alerts on price changes and new listings' },
    ]
  },
];

// Keywords for SEO
const seoKeywords = [
  'Pokemon card marketplace',
  'Magic the Gathering prices',
  'Yu-Gi-Oh card values',
  'sports card trading',
  'AI card grading',
  'PSA grading alternative',
  'trading card portfolio tracker',
  'card price alerts',
  'TCG investing platform',
  'card collection manager',
  'graded card marketplace',
  'vintage Pokemon cards',
  'modern sports cards',
  'One Piece TCG',
  'Lorcana cards',
  'Digimon card game',
  'fractional card ownership',
  'card arbitrage',
  'TCG price comparison',
  'card authentication',
];

export const SEOFeaturesSection = () => {
  return (
    <>
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "CardBoom",
            "applicationCategory": "FinanceApplication",
            "operatingSystem": "Web, iOS, Android",
            "description": "The ultimate trading card marketplace and portfolio tracker. Buy, sell, and grade Pokemon cards, Magic the Gathering, Yu-Gi-Oh, sports cards with AI-powered tools.",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD",
              "description": "Free to use with optional Pro subscription"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "ratingCount": "2847",
              "bestRating": "5"
            },
            "featureList": allFeatures.flatMap(cat => cat.items.map(i => i.title)).join(', ')
          })}
        </script>
      </Helmet>

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          {/* SEO Header */}
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Trade Cards
            </h2>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
              The complete platform for Pokemon, Magic the Gathering, Yu-Gi-Oh, sports cards, 
              and collectibles. AI grading, live marketplace, portfolio tracking, and community features.
            </p>
          </div>

          {/* Feature Grid by Category */}
          <div className="space-y-12">
            {allFeatures.map((category) => (
              <div key={category.category}>
                <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                  <span className="w-1 h-6 bg-primary rounded-full" />
                  {category.category}
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {category.items.map((feature) => (
                    <article 
                      key={feature.title}
                      className="p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-colors"
                    >
                      <feature.icon className="w-8 h-8 text-primary mb-3" />
                      <h4 className="font-semibold text-foreground mb-1">{feature.title}</h4>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* SEO Keywords as accessible text */}
          <div className="mt-12 pt-8 border-t border-border/50">
            <p className="text-xs text-muted-foreground/60 text-center max-w-4xl mx-auto">
              CardBoom supports trading and collecting: {seoKeywords.join(' • ')}
            </p>
          </div>
        </div>
      </section>
    </>
  );
};
