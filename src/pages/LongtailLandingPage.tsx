import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { FilteredPageSEO } from '@/components/seo/FilteredPageSEO';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORY_SEO_DATA, SITE_URL, generateFAQSchema } from '@/lib/seoUtils';
import { useCurrency } from '@/contexts/CurrencyContext';
import { 
  TrendingUp, 
  Shield, 
  Truck, 
  Star, 
  ChevronRight,
  DollarSign,
  Tag,
  Award
} from 'lucide-react';
import { ScrollReveal } from '@/components/ScrollReveal';

// Long-tail landing page configurations
const LONGTAIL_CONFIGS: Record<string, {
  title: string;
  h1: string;
  description: string;
  category?: string;
  maxPrice?: number;
  minPrice?: number;
  grade?: string;
  condition?: string;
  keywords: string[];
}> = {
  'pokemon-cards-under-10': {
    title: 'Pokemon Cards Under $10',
    h1: 'Affordable Pokemon Cards Under $10',
    description: 'Find cheap Pokemon cards for sale under $10. Perfect for collectors on a budget or building competitive decks without breaking the bank.',
    category: 'pokemon',
    maxPrice: 10,
    keywords: ['cheap pokemon cards', 'pokemon cards under 10', 'budget pokemon tcg', 'affordable pokemon cards'],
  },
  'pokemon-cards-under-50': {
    title: 'Pokemon Cards Under $50',
    h1: 'Quality Pokemon Cards Under $50',
    description: 'Shop mid-range Pokemon cards under $50. Find holos, rares, and vintage cards at affordable prices from verified sellers.',
    category: 'pokemon',
    maxPrice: 50,
    keywords: ['pokemon cards under 50', 'mid range pokemon cards', 'holo pokemon cards cheap'],
  },
  'psa-10-pokemon-cards': {
    title: 'PSA 10 Pokemon Cards',
    h1: 'Gem Mint PSA 10 Pokemon Cards',
    description: 'Buy PSA 10 graded Pokemon cards. Gem mint condition, professionally authenticated. Investment-grade collectibles from trusted sellers.',
    category: 'pokemon',
    grade: 'PSA 10',
    keywords: ['psa 10 pokemon cards', 'gem mint pokemon', 'graded pokemon cards', 'investment pokemon cards'],
  },
  'psa-10-baseball-cards': {
    title: 'PSA 10 Baseball Cards',
    h1: 'Gem Mint PSA 10 Baseball Cards',
    description: 'Premium PSA 10 graded baseball cards. Rookie cards, vintage legends, and modern stars in perfect condition.',
    category: 'nba',
    grade: 'PSA 10',
    keywords: ['psa 10 baseball cards', 'graded baseball cards', 'gem mint sports cards'],
  },
  'vintage-pokemon-cards': {
    title: 'Vintage Pokemon Cards',
    h1: 'Vintage Pokemon Cards (1999-2003)',
    description: 'Collect vintage Pokemon cards from Base Set, Jungle, Fossil, and Team Rocket. Authentic vintage cards from the original era.',
    category: 'pokemon',
    keywords: ['vintage pokemon cards', 'base set pokemon', '1999 pokemon cards', 'original pokemon cards'],
  },
  'japanese-pokemon-cards': {
    title: 'Japanese Pokemon Cards',
    h1: 'Authentic Japanese Pokemon Cards',
    description: 'Import Japanese Pokemon cards with exclusive artwork and early releases. Shop Japan-exclusive promos and sets.',
    category: 'pokemon',
    keywords: ['japanese pokemon cards', 'japan exclusive pokemon', 'pokemon cards japan import'],
  },
  'charizard-cards': {
    title: 'Charizard Cards for Sale',
    h1: 'Charizard Pokemon Cards',
    description: 'Find Charizard cards from every era. Base Set, Rainbow Rare, VMAX, and more. The most iconic Pokemon card for collectors.',
    category: 'pokemon',
    keywords: ['charizard cards', 'charizard pokemon card', 'buy charizard', 'charizard for sale'],
  },
  'one-piece-cards-under-20': {
    title: 'One Piece Cards Under $20',
    h1: 'Affordable One Piece Cards Under $20',
    description: 'Build your One Piece TCG collection on a budget. Find Luffy, Zoro, and crew cards at great prices.',
    category: 'onepiece',
    maxPrice: 20,
    keywords: ['cheap one piece cards', 'one piece tcg budget', 'affordable one piece cards'],
  },
  'mtg-commander-cards': {
    title: 'MTG Commander Cards',
    h1: 'Magic: The Gathering Commander Cards',
    description: 'Shop Commander/EDH staples for Magic: The Gathering. Find legendary creatures, mana rocks, and format essentials.',
    category: 'mtg',
    keywords: ['mtg commander cards', 'edh cards', 'commander staples', 'magic commander'],
  },
};

const LongtailLandingPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [cartOpen, setCartOpen] = useState(false);
  const { formatPrice } = useCurrency();

  const config = slug ? LONGTAIL_CONFIGS[slug] : null;

  // Fetch matching items
  const { data: items, isLoading } = useQuery({
    queryKey: ['longtail-items', slug],
    queryFn: async () => {
      if (!config) return [];

      let query = supabase
        .from('market_items')
        .select('id, name, category, current_price, image_url, change_24h')
        .order('current_price', { ascending: true })
        .limit(24);

      if (config.category) {
        query = query.ilike('category', `%${config.category}%`);
      }
      if (config.maxPrice) {
        query = query.lte('current_price', config.maxPrice);
      }
      if (config.minPrice) {
        query = query.gte('current_price', config.minPrice);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!config,
  });

  // Fetch listings count
  const { data: listingCount } = useQuery({
    queryKey: ['longtail-listings', slug],
    queryFn: async () => {
      if (!config?.category) return 0;

      let query = supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .ilike('category', `%${config.category}%`);

      if (config.maxPrice) {
        query = query.lte('price', config.maxPrice);
      }

      const { count } = await query;
      return count || 0;
    },
    enabled: !!config,
  });

  if (!config) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />
        <main className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
          <Button asChild>
            <Link to="/markets">Browse Marketplace</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const faqs = [
    {
      question: `Where can I find ${config.title.toLowerCase()}?`,
      answer: `CardBoom offers a curated selection of ${config.title.toLowerCase()} from verified sellers. Browse our marketplace for the best deals with buyer protection.`,
    },
    {
      question: `Are these cards authentic?`,
      answer: `Yes, all cards on CardBoom are sold by verified sellers. We offer buyer protection and dispute resolution to ensure authenticity.`,
    },
    {
      question: `How do I know I'm getting a good price?`,
      answer: `CardBoom provides real-time market data and price history so you can compare prices and find the best deals.`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <FilteredPageSEO canonicalPath={`/deals/${slug}`} />
      
      <Helmet>
        <title>{config.title} | CardBoom</title>
        <meta name="description" content={config.description} />
        <meta name="keywords" content={config.keywords.join(', ')} />
        <meta property="og:title" content={`${config.title} | CardBoom`} />
        <meta property="og:description" content={config.description} />
        <meta property="og:type" content="website" />
        <meta name="robots" content="index, follow" />
        
        <script type="application/ld+json">
          {JSON.stringify(generateFAQSchema(faqs))}
        </script>
      </Helmet>

      <Header cartCount={0} onCartClick={() => setCartOpen(!cartOpen)} />

      <main className="container mx-auto px-4 py-6">
        <BreadcrumbSchema
          items={[
            { name: 'Marketplace', href: '/markets' },
            { name: 'Deals', href: '/deals' },
            { name: config.title },
          ]}
          className="mb-6"
        />

        {/* Hero */}
        <ScrollReveal>
          <section className="text-center py-12 mb-8">
            <Badge className="mb-4" variant="secondary">
              <Tag className="w-3 h-3 mr-1" />
              {listingCount || 0} Listings Available
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              {config.h1}
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
              {config.description}
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm">Buyer Protection</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted">
                <Award className="w-4 h-4 text-primary" />
                <span className="text-sm">Verified Sellers</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm">Live Prices</span>
              </div>
            </div>

            <Button size="lg" asChild>
              <Link to={`/markets?category=${config.category || 'all'}${config.maxPrice ? `&max_price=${config.maxPrice}` : ''}`}>
                Browse All Listings
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </section>
        </ScrollReveal>

        {/* Items Grid */}
        <ScrollReveal delay={0.1}>
          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold mb-6">
              Featured {config.title}
            </h2>
            
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="aspect-[3/4] rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : items && items.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {items.map((item) => (
                  <Link
                    key={item.id}
                    to={`/card/${item.id}`}
                    className="group"
                  >
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="aspect-[3/4] relative">
                        <img
                          src={item.image_url || '/placeholder.svg'}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                        {item.change_24h && item.change_24h > 0 && (
                          <Badge className="absolute top-2 right-2 bg-gain text-gain-foreground text-[10px]">
                            +{item.change_24h.toFixed(1)}%
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-primary font-bold">
                          {formatPrice(item.current_price || 0)}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No items found matching these criteria.</p>
                <Button asChild className="mt-4">
                  <Link to="/markets">Browse All Cards</Link>
                </Button>
              </Card>
            )}
          </section>
        </ScrollReveal>

        {/* FAQ Section */}
        <ScrollReveal delay={0.2}>
          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold mb-6 text-center">
              Frequently Asked Questions
            </h2>
            <div className="max-w-3xl mx-auto space-y-4">
              {faqs.map((faq, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2">{faq.question}</h3>
                    <p className="text-muted-foreground text-sm">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </ScrollReveal>

        {/* Related Long-tail Pages */}
        <ScrollReveal delay={0.3}>
          <section className="bg-muted rounded-2xl p-8">
            <h2 className="font-display text-xl font-bold mb-4 text-center">
              Related Collections
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {Object.entries(LONGTAIL_CONFIGS)
                .filter(([key]) => key !== slug)
                .slice(0, 6)
                .map(([key, cfg]) => (
                  <Link
                    key={key}
                    to={`/deals/${key}`}
                    className="px-4 py-2 rounded-full bg-background hover:bg-primary/10 transition-colors text-sm font-medium"
                  >
                    {cfg.title}
                  </Link>
                ))}
            </div>
          </section>
        </ScrollReveal>
      </main>

      <Footer />
    </div>
  );
};

export default LongtailLandingPage;
