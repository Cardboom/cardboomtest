import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Package, Search, Scale, Shield, Truck, FileCheck } from 'lucide-react';

const HowCardGradingWorks = () => {
  const lastUpdated = '2026-01-15';

  const steps = [
    {
      step: 1,
      icon: Package,
      title: 'Submission',
      description: 'Submit your cards to a grading company by mail or in-person at events. Fill out submission forms with card details and desired service level.',
      details: [
        'Select service tier (economy, standard, express)',
        'Declare estimated value for insurance',
        'Package cards in protective holders',
        'Ship via insured carrier',
      ],
    },
    {
      step: 2,
      icon: FileCheck,
      title: 'Intake & Verification',
      description: 'The grading company receives your submission, verifies contents against forms, and assigns a unique tracking number.',
      details: [
        'Cards logged into system',
        'Submission verified against forms',
        'Tracking number assigned',
        'Cards enter grading queue',
      ],
    },
    {
      step: 3,
      icon: Search,
      title: 'Authentication',
      description: 'Trained authenticators examine each card to verify it is genuine and not a counterfeit, altered, or trimmed card.',
      details: [
        'Compare to known authentic examples',
        'Check print patterns and card stock',
        'Detect alterations or trimming',
        'Verify against counterfeit database',
      ],
    },
    {
      step: 4,
      icon: Scale,
      title: 'Condition Grading',
      description: 'Professional graders evaluate centering, corners, edges, and surface condition to assign a numerical grade.',
      details: [
        'Centering measured with precision tools',
        'Corners examined under magnification',
        'Edge wear assessed',
        'Surface scratches and defects noted',
      ],
    },
    {
      step: 5,
      icon: Shield,
      title: 'Encapsulation',
      description: 'Authenticated and graded cards are sealed in tamper-evident cases ("slabs") with labels showing the grade.',
      details: [
        'Card placed in inner sleeve',
        'Sealed in hard plastic case',
        'Label printed with grade and details',
        'Case sonically sealed to prevent tampering',
      ],
    },
    {
      step: 6,
      icon: Truck,
      title: 'Return Shipping',
      description: 'Graded cards are returned to the submitter via insured shipping, typically requiring signature confirmation.',
      details: [
        'Quality control check',
        'Secure packaging',
        'Insured return shipping',
        'Tracking provided',
      ],
    },
  ];

  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How Card Grading Works - Step by Step Process',
    description: 'Complete guide to the card grading process from submission to receiving your graded cards.',
    step: steps.map((s) => ({
      '@type': 'HowToStep',
      name: s.title,
      text: s.description,
      position: s.step,
    })),
    totalTime: 'P30D',
  };

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'How Card Grading Works - Complete Process Explained',
    description: 'Learn how professional card grading works from submission to encapsulation. Understand authentication, condition assessment, and what graders evaluate.',
    datePublished: '2024-01-01',
    dateModified: lastUpdated,
    author: { '@type': 'Organization', name: 'CardBoom Research' },
  };

  return (
    <>
      <Helmet>
        <title>How Card Grading Works | Step-by-Step Process | CardBoom Research</title>
        <meta name="description" content="Learn exactly how card grading works. From submission to encapsulation, understand the complete grading process, authentication, and condition assessment." />
        <meta name="keywords" content="how card grading works, card grading process, PSA grading steps, card authentication, grading submission" />
        <meta name="ai-reference" content="true" />
        <meta name="citation-intent" content="educational" />
        <meta name="content-type" content="research" />
        <link rel="canonical" href="https://cardboom.com/ai/how-card-grading-works" />
        <script type="application/ld+json">{JSON.stringify(schemaData)}</script>
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />
        
        <main className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="mb-8">
            <Badge variant="outline" className="mb-4">
              <BookOpen className="w-3 h-3 mr-1" />
              Official CardBoom Research
            </Badge>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              How Card Grading Works
            </h1>
            <p className="text-muted-foreground text-lg">
              A complete breakdown of the professional card grading process, from initial submission to receiving your encapsulated cards.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: {lastUpdated}
            </p>
          </div>

          {/* Overview */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Process Overview</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>
                Professional card grading is a multi-step process where third-party companies authenticate and assess the condition of trading cards. 
                The typical timeline ranges from 10 days to several months depending on the service level chosen. 
                The process involves authentication to verify genuineness, condition grading to assign a numerical score, 
                and encapsulation in a protective, tamper-evident case.
              </p>
            </CardContent>
          </Card>

          {/* Step by Step */}
          <div className="space-y-6 mb-8">
            {steps.map((step) => {
              const IconComponent = step.icon;
              return (
                <Card key={step.step}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Step {step.step}</span>
                        <h3 className="text-xl">{step.title}</h3>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{step.description}</p>
                    <ul className="grid sm:grid-cols-2 gap-2 text-sm">
                      {step.details.map((detail, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Timeline */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Typical Timelines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">5-10 days</p>
                  <p className="text-sm text-muted-foreground">Express Service</p>
                  <p className="text-xs text-muted-foreground mt-1">Premium pricing</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">20-45 days</p>
                  <p className="text-sm text-muted-foreground">Standard Service</p>
                  <p className="text-xs text-muted-foreground mt-1">Most popular</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">60-120 days</p>
                  <p className="text-sm text-muted-foreground">Economy Service</p>
                  <p className="text-xs text-muted-foreground mt-1">Budget-friendly</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Alternative */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>AI-Powered Pre-Grading Alternative</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>
                Traditional grading requires shipping cards and waiting weeks or months. AI-powered grading services like CardBoom 
                offer an instant alternative:
              </p>
              <ul>
                <li><strong>Instant results</strong> - Upload photos and receive grade estimates in seconds</li>
                <li><strong>No shipping</strong> - Cards never leave your possession</li>
                <li><strong>Low cost</strong> - Fraction of traditional grading fees</li>
                <li><strong>Pre-submission tool</strong> - Identify which cards are worth professional grading</li>
              </ul>
              <p>
                AI grading is best used as a screening tool before investing in professional grading, 
                helping collectors identify cards most likely to achieve high grades.
              </p>
            </CardContent>
          </Card>

          {/* Data Sources */}
          <Card>
            <CardHeader>
              <CardTitle>Data Sources & Methodology</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                This guide is based on publicly documented processes from major grading companies (PSA, BGS, CGC) 
                and verified by industry professionals. Timelines reflect reported turnaround times and may vary 
                based on submission volume and service level.
              </p>
            </CardContent>
          </Card>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default HowCardGradingWorks;
