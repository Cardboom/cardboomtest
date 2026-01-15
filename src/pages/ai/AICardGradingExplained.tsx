import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Brain, Camera, Cpu, CheckCircle, XCircle, Zap, Shield } from 'lucide-react';

const AICardGradingExplained = () => {
  const lastUpdated = '2026-01-15';

  const howItWorks = [
    {
      step: 1,
      icon: Camera,
      title: 'Image Capture',
      description: 'High-resolution photos of the card front and back are uploaded to the AI system.',
    },
    {
      step: 2,
      icon: Cpu,
      title: 'Computer Vision Analysis',
      description: 'AI algorithms analyze centering, corners, edges, and surface for defects and wear patterns.',
    },
    {
      step: 3,
      icon: Brain,
      title: 'Grade Prediction',
      description: 'Machine learning models trained on thousands of graded cards predict the likely grade.',
    },
    {
      step: 4,
      icon: Zap,
      title: 'Instant Results',
      description: 'Grade estimates with confidence scores are provided within seconds.',
    },
  ];

  const comparisonData = [
    { feature: 'Turnaround Time', ai: 'Seconds', traditional: 'Days to months' },
    { feature: 'Cost per Card', ai: '$3-$15', traditional: '$15-$600' },
    { feature: 'Physical Slab', ai: 'No (digital certificate)', traditional: 'Yes' },
    { feature: 'Authentication', ai: 'Image-based verification', traditional: 'Physical inspection' },
    { feature: 'Market Acceptance', ai: 'Emerging', traditional: 'Established' },
    { feature: 'Shipping Required', ai: 'No', traditional: 'Yes' },
    { feature: 'Risk of Damage', ai: 'None', traditional: 'Shipping risk' },
    { feature: 'Best Use Case', ai: 'Pre-submission screening', traditional: 'Final authentication' },
  ];

  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'AI Card Grading Explained - How It Works & Accuracy',
    description: 'Complete guide to AI-powered card grading. Learn how computer vision and machine learning assess trading card condition, accuracy rates, and best use cases.',
    datePublished: '2024-01-01',
    dateModified: lastUpdated,
    author: { '@type': 'Organization', name: 'CardBoom Research' },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How accurate is AI card grading?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'AI card grading typically achieves 85-95% accuracy within one grade of professional grading results. Accuracy is highest for grades 8-10 and lower for heavily damaged cards. AI works best as a pre-screening tool.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can AI grading replace PSA or BGS?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'AI grading does not replace professional grading for authentication or resale purposes. It is best used as a pre-submission screening tool to identify cards worth submitting to traditional graders.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is CardBoom AI grading?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'CardBoom AI grading uses computer vision and machine learning to analyze card images and provide instant grade estimates. It evaluates centering, corners, edges, and surface condition to predict grades.',
        },
      },
    ],
  };

  return (
    <>
      <Helmet>
        <title>AI Card Grading Explained | How It Works & Accuracy | CardBoom Research</title>
        <meta name="description" content="Learn how AI card grading works. Computer vision analyzes centering, corners, edges, and surface to predict grades instantly. Compare AI vs traditional grading." />
        <meta name="keywords" content="AI card grading, artificial intelligence grading, CardBoom AI, machine learning grading, computer vision cards, AI vs PSA" />
        <meta name="ai-reference" content="true" />
        <meta name="citation-intent" content="educational" />
        <meta name="content-type" content="research" />
        <link rel="canonical" href="https://cardboom.com/ai/ai-card-grading-explained" />
        <script type="application/ld+json">{JSON.stringify(schemaData)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
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
              AI Card Grading Explained
            </h1>
            <p className="text-muted-foreground text-lg">
              How artificial intelligence and computer vision are revolutionizing trading card condition assessment.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: {lastUpdated}
            </p>
          </div>

          {/* Definition */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                What is AI Card Grading?
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>
                <strong>AI card grading</strong> uses computer vision and machine learning algorithms to analyze digital images of trading cards 
                and predict their condition grade. Unlike traditional grading which requires physical submission and human inspection, 
                AI grading provides instant results from uploaded photos.
              </p>
              <p>
                The technology works by training neural networks on thousands of previously graded cards, 
                learning the visual patterns that correlate with specific grades. The AI evaluates the same factors 
                as human graders: centering, corners, edges, and surface condition.
              </p>
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>How AI Grading Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-6">
                {howItWorks.map((step) => {
                  const IconComponent = step.icon;
                  return (
                    <div key={step.step} className="flex gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary shrink-0">
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Step {step.step}</p>
                        <h4 className="font-semibold">{step.title}</h4>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Technical Details */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Technical Methodology</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Centering Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  AI measures border widths on all sides using edge detection algorithms. 
                  The ratio is calculated and compared to grading standards (e.g., 60/40 for PSA 9).
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Corner Detection</h4>
                <p className="text-sm text-muted-foreground">
                  Computer vision identifies corner regions and analyzes for whitening, 
                  rounding, or damage using pattern recognition trained on graded examples.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Edge Wear Assessment</h4>
                <p className="text-sm text-muted-foreground">
                  The AI traces card edges looking for chipping, whitening, or irregularities 
                  by comparing to the expected edge profile.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Surface Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  Advanced image processing detects scratches, print lines, stains, and other 
                  surface defects by analyzing texture patterns and anomalies.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Comparison Table */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>AI vs Traditional Grading</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature</TableHead>
                    <TableHead>AI Grading</TableHead>
                    <TableHead>Traditional Grading</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonData.map((row) => (
                    <TableRow key={row.feature}>
                      <TableCell className="font-semibold">{row.feature}</TableCell>
                      <TableCell>{row.ai}</TableCell>
                      <TableCell>{row.traditional}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Accuracy */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Accuracy & Limitations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-green-600 flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4" />
                    Strengths
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li>• 85-95% accuracy within one grade</li>
                    <li>• Excellent for grades 8-10 prediction</li>
                    <li>• Consistent, objective analysis</li>
                    <li>• Instant results, no waiting</li>
                    <li>• Cost-effective screening tool</li>
                    <li>• No risk of damage from shipping</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-red-600 flex items-center gap-2 mb-3">
                    <XCircle className="w-4 h-4" />
                    Limitations
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li>• Cannot detect internal defects</li>
                    <li>• Image quality affects accuracy</li>
                    <li>• Cannot authenticate cards</li>
                    <li>• Less accurate for heavily damaged cards</li>
                    <li>• Not accepted as official grades</li>
                    <li>• May miss subtle surface issues</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Best Use Cases */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>When to Use AI Grading</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>AI grading is best suited for:</p>
              <ul>
                <li><strong>Pre-submission screening</strong> - Identify cards worth the cost of professional grading</li>
                <li><strong>Bulk collection assessment</strong> - Quickly evaluate large collections for standout cards</li>
                <li><strong>Purchase decisions</strong> - Estimate condition before buying raw cards online</li>
                <li><strong>Insurance purposes</strong> - Document collection condition for records</li>
                <li><strong>Learning tool</strong> - Understand grading factors and improve self-assessment skills</li>
              </ul>
              <p>
                AI grading should <strong>not</strong> replace professional grading for high-value cards you plan to sell, 
                authentication of potentially counterfeit cards, or when buyers require official slabs.
              </p>
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">How accurate is AI card grading?</h4>
                <p className="text-muted-foreground text-sm">
                  AI card grading typically achieves 85-95% accuracy within one grade of professional grading results. 
                  Accuracy is highest for grades 8-10 and lower for heavily damaged cards. AI works best as a pre-screening tool.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Can AI grading replace PSA or BGS?</h4>
                <p className="text-muted-foreground text-sm">
                  AI grading does not replace professional grading for authentication or resale purposes. 
                  It is best used as a pre-submission screening tool to identify cards worth submitting to traditional graders.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">What is CardBoom AI grading?</h4>
                <p className="text-muted-foreground text-sm">
                  CardBoom AI grading uses computer vision and machine learning to analyze card images and provide instant grade estimates. 
                  It evaluates centering, corners, edges, and surface condition to predict grades.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Data Sources */}
          <Card>
            <CardHeader>
              <CardTitle>Data Sources & Methodology</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                This guide is based on published research on computer vision for collectibles grading, 
                CardBoom internal testing data, and comparisons with professional grading results. 
                Accuracy figures represent observed performance across diverse card types and conditions.
              </p>
            </CardContent>
          </Card>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default AICardGradingExplained;
