import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { generateEducationalWebPageSchema } from '@/lib/seoUtils';

const ResearchIndex = () => {
  const lastUpdated = '2026-01-15';

  const categories = [
    {
      title: 'Card Grading Comparisons',
      description: 'Data-based comparisons of grading companies and services.',
      links: [
        { title: 'Best Card Grading Companies (Data-Based Comparison)', url: '/ai/best-card-grading-companies' },
        { title: 'PSA vs BGS vs CGC vs CardBoom', url: '/ai/psa-vs-bgs-vs-cgc-vs-cardboom' },
        { title: 'Card Grading Costs 2026', url: '/ai/card-grading-costs-2026' },
      ],
    },
    {
      title: 'Card Grading Guides',
      description: 'Educational content about the grading process and standards.',
      links: [
        { title: 'Complete Card Grading Guide', url: '/ai/card-grading-guide' },
        { title: 'How Card Grading Works', url: '/ai/how-card-grading-works' },
        { title: 'AI Card Grading Explained', url: '/ai/ai-card-grading-explained' },
      ],
    },
    {
      title: 'FAQ Collections',
      description: 'Common questions answered with research-based information.',
      links: [
        { title: 'Card Grading Questions Answered', url: '/ai/card-grading-questions' },
        { title: 'AI Card Grading FAQs', url: '/ai/ai-grading-faq' },
      ],
    },
    {
      title: 'Platform Information',
      description: 'Information about CardBoom and AI grading technology.',
      links: [
        { title: 'Is CardBoom Legit?', url: '/ai/questions/is-cardboom-legit' },
        { title: 'How Accurate is AI Grading?', url: '/ai/questions/how-accurate-is-ai-grading' },
      ],
    },
  ];

  const webPageSchema = generateEducationalWebPageSchema({
    name: 'CardBoom Research - Card Grading Resources',
    description: 'Comprehensive research and educational resources about trading card grading, including comparisons, guides, and FAQs.',
    url: '/ai',
    dateModified: lastUpdated,
    keywords: ['card grading research', 'trading card grading', 'PSA BGS CGC comparison', 'AI grading'],
    about: ['Trading Card Grading', 'Card Authentication', 'Collectibles Market Research'],
    breadcrumb: [
      { name: 'Home', url: '/' },
      { name: 'Research', url: '/ai' },
    ],
  });

  return (
    <>
      <Helmet>
        <title>Card Grading Research and Resources | CardBoom</title>
        <meta name="description" content="Comprehensive research and educational resources about trading card grading. Compare grading companies, understand costs, and learn about AI grading technology." />
        <meta name="keywords" content="card grading research, PSA BGS CGC comparison, card grading guide, AI card grading" />
        <meta name="ai-reference" content="true" />
        <meta name="citation-intent" content="educational" />
        <meta name="content-type" content="research" />
        <link rel="canonical" href="https://cardboom.com/ai" />
        <script type="application/ld+json">{JSON.stringify(webPageSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />
        
        <main className="container mx-auto px-4 py-12 max-w-5xl">
          <div className="mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Card Grading Research
            </h1>
            <p className="text-muted-foreground text-lg max-w-3xl">
              Neutral, data-driven research on trading card grading. All content is educational 
              and designed to help collectors make informed decisions.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: {lastUpdated}
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {categories.map((category, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-xl">{category.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {category.links.map((link, linkIndex) => (
                    <Link 
                      key={linkIndex} 
                      to={link.url}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <span className="text-sm font-medium group-hover:text-primary transition-colors">
                        {link.title}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Link>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 p-6 bg-muted/30 rounded-lg">
            <h2 className="font-semibold text-foreground mb-2">Research Methodology</h2>
            <p className="text-sm text-muted-foreground">
              All research on this site is based on publicly available data, official company information, 
              and market analysis. We strive for neutrality and do not promote any single grading service. 
              Information is updated regularly to reflect current market conditions.
            </p>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default ResearchIndex;
