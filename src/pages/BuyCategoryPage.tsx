import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { CategorySchema } from '@/components/seo/CategorySchema';
import { ListingsTable } from '@/components/market/ListingsTable';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORY_SEO_DATA, SITE_URL, generateFAQSchema } from '@/lib/seoUtils';
import { 
  TrendingUp, 
  Shield, 
  Truck, 
  Star, 
  ChevronRight,
  Filter,
  SortAsc
} from 'lucide-react';
import { ScrollReveal } from '@/components/ScrollReveal';

const BuyCategoryPage = () => {
  const { category } = useParams<{ category: string }>();
  const [searchParams] = useSearchParams();
  const [cartOpen, setCartOpen] = useState(false);

  // Extract category from URL pattern like "pokemon-cards"
  const normalizedCategory = category?.replace(/-cards$/, '') || 'pokemon';
  const categoryData = CATEGORY_SEO_DATA[normalizedCategory];

  // Fetch category item count
  const { data: itemCount } = useQuery({
    queryKey: ['category-count', normalizedCategory],
    queryFn: async () => {
      const { count } = await supabase
        .from('market_items')
        .select('id', { count: 'exact', head: true })
        .ilike('category', `%${normalizedCategory}%`);
      return count || 0;
    },
  });

  // Fetch active listings count
  const { data: listingCount } = useQuery({
    queryKey: ['category-listings', normalizedCategory],
    queryFn: async () => {
      const { count } = await supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .ilike('category', `%${normalizedCategory}%`);
      return count || 0;
    },
  });

  // Category-specific FAQs
  const categoryFaqs = [
    {
      question: `Are ${categoryData?.pluralName || 'cards'} on CardBoom authentic?`,
      answer: `Yes, all ${categoryData?.pluralName || 'cards'} sold on CardBoom are verified by our sellers. We offer buyer protection and a dispute resolution process to ensure authenticity.`,
    },
    {
      question: `How do I sell my ${categoryData?.pluralName || 'cards'}?`,
      answer: `Create a free account, click "Sell", upload photos of your cards, and set your price. Our AI helps grade your cards and suggests competitive pricing.`,
    },
    {
      question: `What payment methods are accepted?`,
      answer: `We accept credit/debit cards and wallet balance. All transactions are secured with buyer protection.`,
    },
    {
      question: `Do you offer grading services?`,
      answer: `Yes! CardBoom offers AI-powered card grading and partners with professional grading companies like PSA, BGS, and CGC.`,
    },
  ];

  const features = [
    { icon: Shield, title: 'Buyer Protection', description: 'Every purchase is protected' },
    { icon: TrendingUp, title: 'Live Prices', description: 'Real-time market data' },
    { icon: Truck, title: 'Secure Shipping', description: 'Tracked & insured delivery' },
    { icon: Star, title: 'Verified Sellers', description: 'Trusted marketplace' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <CategorySchema 
        category={normalizedCategory} 
        itemCount={itemCount || 0}
      />

      <Header cartCount={0} onCartClick={() => setCartOpen(!cartOpen)} />

      <main className="container mx-auto px-4 py-6">
        {/* Breadcrumbs */}
        <BreadcrumbSchema
          items={[
            { name: 'Marketplace', href: '/markets' },
            { name: categoryData?.pluralName || `${normalizedCategory} Cards` },
          ]}
          className="mb-6"
        />

        {/* Hero Section */}
        <ScrollReveal>
          <section className="text-center py-12 mb-8">
            <Badge className="mb-4">{listingCount || 0} Active Listings</Badge>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              Buy {categoryData?.pluralName || `${normalizedCategory} Cards`} Online
            </h1>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto mb-8">
              {categoryData?.description || `Shop ${normalizedCategory} trading cards and collectibles from verified sellers. Best prices, buyer protection, and secure shipping.`}
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted"
                >
                  <feature.icon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{feature.title}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" asChild>
                <Link to={`/markets?category=${normalizedCategory}`}>
                  Browse Listings
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/sell">
                  Sell Your Cards
                </Link>
              </Button>
            </div>
          </section>
        </ScrollReveal>

        {/* Stats Row */}
        <ScrollReveal delay={0.1}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-primary">{itemCount?.toLocaleString() || '0'}</div>
                <div className="text-sm text-muted-foreground">Cards in Database</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-primary">{listingCount?.toLocaleString() || '0'}</div>
                <div className="text-sm text-muted-foreground">Active Listings</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-gain">100%</div>
                <div className="text-sm text-muted-foreground">Buyer Protection</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-primary">24/7</div>
                <div className="text-sm text-muted-foreground">Live Prices</div>
              </CardContent>
            </Card>
          </div>
        </ScrollReveal>

        {/* Listings Section */}
        <ScrollReveal delay={0.2}>
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-bold">
                {categoryData?.pluralName || `${normalizedCategory} Cards`} For Sale
              </h2>
              <Link 
                to={`/markets?category=${normalizedCategory}`}
                className="text-primary hover:underline text-sm font-medium flex items-center gap-1"
              >
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            
            <ListingsTable 
              search=""
              category={normalizedCategory}
            />
          </section>
        </ScrollReveal>

        {/* FAQ Section */}
        <ScrollReveal delay={0.3}>
          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold mb-6 text-center">
              Frequently Asked Questions
            </h2>
            <div className="max-w-3xl mx-auto space-y-4">
              {categoryFaqs.map((faq, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2">{faq.question}</h3>
                    <p className="text-muted-foreground text-sm">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* FAQ Schema */}
            <Helmet>
              <script type="application/ld+json">
                {JSON.stringify(generateFAQSchema(categoryFaqs))}
              </script>
            </Helmet>
          </section>
        </ScrollReveal>

        {/* SEO Content Block */}
        <ScrollReveal delay={0.4}>
          <section className="bg-muted rounded-2xl p-8 mb-12">
            <h2 className="font-display text-2xl font-bold mb-4">
              About Buying {categoryData?.pluralName || `${normalizedCategory} Cards`}
            </h2>
            <div className="prose prose-sm max-w-none text-muted-foreground">
              <p>
                CardBoom is the premier marketplace for {categoryData?.pluralName?.toLowerCase() || `${normalizedCategory} cards`}. 
                Whether you're looking for rare vintage cards, tournament staples, or the latest releases, 
                our verified sellers offer competitive prices with full buyer protection.
              </p>
              <p>
                Every {categoryData?.name || normalizedCategory} card sold on CardBoom comes with our guarantee. 
                We verify seller authenticity, provide secure payment processing, and offer dispute resolution 
                if anything goes wrong. Shop with confidence knowing your purchase is protected.
              </p>
              {categoryData?.keywords && (
                <p className="text-xs mt-4">
                  Popular searches: {categoryData.keywords.join(', ')}
                </p>
              )}
            </div>
          </section>
        </ScrollReveal>

        {/* Related Categories */}
        <ScrollReveal delay={0.5}>
          <section>
            <h2 className="font-display text-2xl font-bold mb-6 text-center">
              Explore More Categories
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Object.entries(CATEGORY_SEO_DATA)
                .filter(([slug]) => slug !== normalizedCategory)
                .slice(0, 5)
                .map(([slug, data]) => (
                  <Link
                    key={slug}
                    to={`/buy/${slug}-cards`}
                    className="p-4 rounded-xl bg-muted hover:bg-muted/80 transition-colors text-center"
                  >
                    <div className="font-medium">{data.pluralName}</div>
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

export default BuyCategoryPage;
