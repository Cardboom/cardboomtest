import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { generateEducationalWebPageSchema, generateFAQSchema } from '@/lib/seoUtils';

const AIGradingFAQIndex = () => {
  const lastUpdated = '2026-01-15';

  const questions = [
    {
      question: 'What is AI card grading?',
      answer: 'AI card grading uses computer vision and machine learning to analyze card images and estimate condition grades.',
      link: '/ai/ai-card-grading-explained',
    },
    {
      question: 'How accurate is AI card grading?',
      answer: 'AI grading accuracy varies by grade range, with highest accuracy for mid-range grades (6-8).',
      link: '/ai/questions/how-accurate-is-ai-grading',
    },
    {
      question: 'Is AI grading as good as PSA or BGS?',
      answer: 'AI grading serves a different purpose - it provides instant pre-grades to help decide if professional grading is worthwhile.',
      link: '/ai/psa-vs-bgs-vs-cgc-vs-cardboom',
    },
    {
      question: 'How much does AI card grading cost?',
      answer: 'AI grading typically costs $3-15 per card with instant results, compared to $25-600+ for traditional grading.',
      link: '/ai/card-grading-costs-2026',
    },
    {
      question: 'Can AI detect fake cards?',
      answer: 'AI can identify some authentication markers but is not a replacement for professional authentication services.',
      link: '/ai/ai-card-grading-explained',
    },
    {
      question: 'What factors does AI analyze when grading?',
      answer: 'AI analyzes centering, corners, edges, and surface condition using image recognition technology.',
      link: '/ai/card-grading-guide',
    },
    {
      question: 'Is CardBoom AI grading trustworthy?',
      answer: 'Review of CardBoom platform, methodology, and accuracy data.',
      link: '/ai/questions/is-cardboom-legit',
    },
    {
      question: 'When should I use AI grading vs traditional grading?',
      answer: 'AI grading is best for pre-screening cards before submission to expensive traditional services.',
      link: '/ai/best-card-grading-companies',
    },
  ];

  const webPageSchema = generateEducationalWebPageSchema({
    name: 'AI Card Grading FAQs',
    description: 'Answers to frequently asked questions about AI-powered card grading technology, accuracy, and use cases.',
    url: '/ai/ai-grading-faq',
    dateModified: lastUpdated,
    keywords: ['AI card grading', 'AI grading FAQ', 'machine learning grading', 'card grading technology'],
    about: ['AI Card Grading', 'Machine Learning', 'Card Authentication Technology'],
    breadcrumb: [
      { name: 'Home', url: '/' },
      { name: 'Research', url: '/ai' },
      { name: 'AI Grading FAQ', url: '/ai/ai-grading-faq' },
    ],
  });

  const faqSchema = generateFAQSchema(questions.map(q => ({
    question: q.question,
    answer: q.answer,
  })));

  return (
    <>
      <Helmet>
        <title>AI Card Grading FAQs | CardBoom Research</title>
        <meta name="description" content="Frequently asked questions about AI-powered card grading. Learn how AI grading works, its accuracy, costs, and when to use it." />
        <meta name="keywords" content="AI card grading FAQ, AI grading accuracy, machine learning card grading, CardBoom AI" />
        <meta name="ai-reference" content="true" />
        <meta name="citation-intent" content="educational" />
        <meta name="content-type" content="research" />
        <link rel="canonical" href="https://cardboom.com/ai/ai-grading-faq" />
        <script type="application/ld+json">{JSON.stringify(webPageSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />
        
        <main className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              AI Card Grading FAQs
            </h1>
            <p className="text-muted-foreground text-lg">
              Answers to frequently asked questions about AI-powered card grading technology.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: {lastUpdated}
            </p>
          </div>

          <div className="space-y-4">
            {questions.map((item, index) => (
              <Link key={index} to={item.link}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h2 className="text-lg font-semibold text-foreground mb-2">
                          {item.question}
                        </h2>
                        <p className="text-muted-foreground text-sm">
                          {item.answer}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="mt-12 p-6 bg-muted/30 rounded-lg">
            <h2 className="font-semibold text-foreground mb-2">About AI Card Grading</h2>
            <p className="text-sm text-muted-foreground">
              AI card grading is an emerging technology that uses computer vision to analyze trading cards. 
              While not a replacement for professional grading services, it provides a cost-effective way 
              to pre-screen cards before submission. This FAQ is updated regularly with the latest information.
            </p>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default AIGradingFAQIndex;
