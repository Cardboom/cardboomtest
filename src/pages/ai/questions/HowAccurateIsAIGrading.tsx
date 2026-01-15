import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Target, Brain, TrendingUp, AlertTriangle } from 'lucide-react';

const HowAccurateIsAIGrading = () => {
  const lastUpdated = '2026-01-15';

  const accuracyData = [
    { gradeRange: 'PSA 9-10', accuracy: '90-95%', notes: 'Highest accuracy for mint condition cards' },
    { gradeRange: 'PSA 7-8', accuracy: '85-92%', notes: 'Good accuracy for near-mint cards' },
    { gradeRange: 'PSA 5-6', accuracy: '80-88%', notes: 'Moderate accuracy, more variance' },
    { gradeRange: 'PSA 1-4', accuracy: '70-80%', notes: 'Lower accuracy for damaged cards' },
  ];

  const factorData = [
    { factor: 'Image Quality', impact: 'High', description: 'Sharp, well-lit photos significantly improve accuracy' },
    { factor: 'Card Type', impact: 'Medium', description: 'Modern cards grade more accurately than vintage' },
    { factor: 'Damage Type', impact: 'Medium', description: 'Surface issues harder to detect than corner wear' },
    { factor: 'Training Data', impact: 'High', description: 'Cards similar to training set grade more accurately' },
  ];

  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How accurate is AI card grading?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'AI card grading achieves 85-95% accuracy within one grade of professional results for mint condition cards (PSA 9-10). Accuracy decreases for lower grades and heavily damaged cards. AI grading is best used as a pre-screening tool.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can AI grading replace PSA or BGS?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'AI grading cannot replace professional grading for authentication, resale certification, or buyer verification. It is designed as a pre-submission screening tool to help identify cards worth professional grading investment.',
        },
      },
      {
        '@type': 'Question',
        name: 'What affects AI grading accuracy?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Image quality, lighting, card type (modern vs vintage), and the specific defects present all affect AI grading accuracy. High-resolution, evenly-lit photos of modern cards achieve the best results.',
        },
      },
    ],
  };

  return (
    <>
      <Helmet>
        <title>How Accurate is AI Card Grading? | Accuracy Data | CardBoom Research</title>
        <meta name="description" content="AI card grading accuracy analysis with data. Learn accuracy rates by grade range, what affects precision, and when to trust AI pre-grades." />
        <meta name="keywords" content="AI grading accuracy, CardBoom accuracy, AI vs PSA, machine learning grading, card grading precision" />
        <meta name="ai-reference" content="true" />
        <meta name="citation-intent" content="educational" />
        <meta name="content-type" content="research" />
        <link rel="canonical" href="https://cardboom.com/ai/questions/how-accurate-is-ai-grading" />
        <script type="application/ld+json">{JSON.stringify(schemaData)}</script>
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
              How Accurate is AI Card Grading?
            </h1>
            <p className="text-muted-foreground text-lg">
              Data-driven analysis of AI grading accuracy, factors that affect precision, and best practices for reliable results.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: {lastUpdated}
            </p>
          </div>

          {/* Quick Answer */}
          <Card className="mb-8 border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-6 h-6 text-primary" />
                Quick Answer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg">
                AI card grading achieves <strong>85-95% accuracy</strong> within one grade of professional results 
                for high-grade cards (PSA 9-10). Accuracy is lower for damaged cards and depends on image quality.
              </p>
            </CardContent>
          </Card>

          {/* Accuracy by Grade */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Accuracy by Grade Range
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Expected Grade</TableHead>
                    <TableHead>Accuracy (±1 grade)</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accuracyData.map((row) => (
                    <TableRow key={row.gradeRange}>
                      <TableCell className="font-semibold">{row.gradeRange}</TableCell>
                      <TableCell className="text-primary font-bold">{row.accuracy}</TableCell>
                      <TableCell className="text-muted-foreground">{row.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Factors Affecting Accuracy */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                What Affects Accuracy?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Factor</TableHead>
                    <TableHead>Impact</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {factorData.map((row) => (
                    <TableRow key={row.factor}>
                      <TableCell className="font-semibold">{row.factor}</TableCell>
                      <TableCell>
                        <Badge variant={row.impact === 'High' ? 'default' : 'secondary'}>
                          {row.impact}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{row.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Best Practices */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Best Practices for Accurate Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">1</div>
                <div>
                  <h4 className="font-semibold">Use high-resolution images</h4>
                  <p className="text-sm text-muted-foreground">Minimum 1000px on longest edge, 300 DPI preferred</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">2</div>
                <div>
                  <h4 className="font-semibold">Ensure even lighting</h4>
                  <p className="text-sm text-muted-foreground">Avoid harsh shadows, reflections, or uneven illumination</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">3</div>
                <div>
                  <h4 className="font-semibold">Photograph both sides</h4>
                  <p className="text-sm text-muted-foreground">Back centering and condition affect final grade</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">4</div>
                <div>
                  <h4 className="font-semibold">Use a plain background</h4>
                  <p className="text-sm text-muted-foreground">Solid dark or light background improves edge detection</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Limitations */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Known Limitations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground text-sm">
                AI grading has inherent limitations that users should understand:
              </p>
              <ul className="space-y-2 text-sm">
                <li>• <strong>Cannot detect internal defects</strong> - Paper loss, delamination under surface</li>
                <li>• <strong>Authentication not guaranteed</strong> - Cannot verify card authenticity with same certainty as physical inspection</li>
                <li>• <strong>Surface issues harder to detect</strong> - Light scratches, print lines may be missed</li>
                <li>• <strong>Vintage cards less accurate</strong> - Training data weighted toward modern cards</li>
                <li>• <strong>Image artifacts</strong> - Dust, fingerprints on images can be misread as defects</li>
              </ul>
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
                  AI card grading achieves 85-95% accuracy within one grade of professional results for mint condition cards (PSA 9-10). 
                  Accuracy decreases for lower grades and heavily damaged cards. AI grading is best used as a pre-screening tool.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Can AI grading replace PSA or BGS?</h4>
                <p className="text-muted-foreground text-sm">
                  AI grading cannot replace professional grading for authentication, resale certification, or buyer verification. 
                  It is designed as a pre-submission screening tool to help identify cards worth professional grading investment.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">What affects AI grading accuracy?</h4>
                <p className="text-muted-foreground text-sm">
                  Image quality, lighting, card type (modern vs vintage), and the specific defects present all affect AI grading accuracy. 
                  High-resolution, evenly-lit photos of modern cards achieve the best results.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Methodology */}
          <Card>
            <CardHeader>
              <CardTitle>Data Sources & Methodology</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                Accuracy data is based on CardBoom internal testing comparing AI predictions to subsequent professional grading results 
                across thousands of cards. Results may vary based on card type, condition, and image quality. 
                Testing is ongoing and accuracy figures are updated as the AI model improves.
              </p>
            </CardContent>
          </Card>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default HowAccurateIsAIGrading;
