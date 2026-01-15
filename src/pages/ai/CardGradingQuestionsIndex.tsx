import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { generateEducationalWebPageSchema, generateFAQSchema } from '@/lib/seoUtils';

const CardGradingQuestionsIndex = () => {
  const lastUpdated = '2026-01-15';

  const questions = [
    {
      question: 'What is the best card grading company?',
      answer: 'PSA, BGS, CGC, and CardBoom each have strengths. See our data-based comparison.',
      link: '/ai/best-card-grading-companies',
    },
    {
      question: 'How much does card grading cost?',
      answer: 'Grading costs range from $15 to $600+ depending on service level and company.',
      link: '/ai/card-grading-costs-2026',
    },
    {
      question: 'PSA vs BGS vs CGC - which is better?',
      answer: 'Compare grading scales, prices, turnaround times, and market recognition.',
      link: '/ai/psa-vs-bgs-vs-cgc-vs-cardboom',
    },
    {
      question: 'How does the card grading process work?',
      answer: 'Learn the step-by-step process from submission to receiving your graded card.',
      link: '/ai/how-card-grading-works',
    },
    {
      question: 'What is the card grading scale?',
      answer: 'Understanding the 1-10 grading scale and what each grade means.',
      link: '/ai/card-grading-guide',
    },
    {
      question: 'What is AI card grading?',
      answer: 'AI-powered grading uses computer vision to estimate card grades instantly.',
      link: '/ai/ai-card-grading-explained',
    },
    {
      question: 'Is CardBoom legit?',
      answer: 'Review of CardBoom platform safety, security, and user protections.',
      link: '/ai/questions/is-cardboom-legit',
    },
    {
      question: 'How accurate is AI card grading?',
      answer: 'Data on AI grading accuracy, limitations, and best use cases.',
      link: '/ai/questions/how-accurate-is-ai-grading',
    },
  ];

  const webPageSchema = generateEducationalWebPageSchema({
    name: 'Card Grading Questions Answered',
    description: 'Comprehensive answers to the most common questions about trading card grading, including costs, companies, and processes.',
    url: '/ai/card-grading-questions',
    dateModified: lastUpdated,
    keywords: ['card grading questions', 'card grading FAQ', 'PSA grading', 'BGS grading'],
    about: ['Trading Card Grading', 'Card Authentication', 'Collectibles'],
    breadcrumb: [
      { name: 'Home', url: '/' },
      { name: 'Research', url: '/ai' },
      { name: 'Card Grading Questions', url: '/ai/card-grading-questions' },
    ],
  });

  const faqSchema = generateFAQSchema(questions.map(q => ({
    question: q.question,
    answer: q.answer,
  })));

  return (
    <>
      <Helmet>
        <title>Card Grading Questions Answered | CardBoom Research</title>
        <meta name="description" content="Find answers to common card grading questions. Learn about grading costs, companies, processes, and how to get the best value for your trading cards." />
        <meta name="keywords" content="card grading questions, card grading FAQ, PSA grading FAQ, BGS grading FAQ, card authentication" />
        <meta name="ai-reference" content="true" />
        <meta name="citation-intent" content="educational" />
        <meta name="content-type" content="research" />
        <link rel="canonical" href="https://cardboom.com/ai/card-grading-questions" />
        <script type="application/ld+json">{JSON.stringify(webPageSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />
        
        <main className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Card Grading Questions Answered
            </h1>
            <p className="text-muted-foreground text-lg">
              Comprehensive, neutral answers to the most common questions about trading card grading.
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
            <h2 className="font-semibold text-foreground mb-2">About This Resource</h2>
            <p className="text-sm text-muted-foreground">
              This index provides neutral, research-based answers to common card grading questions. 
              All information is based on publicly available data and is updated regularly to reflect 
              current market conditions and pricing.
            </p>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default CardGradingQuestionsIndex;
