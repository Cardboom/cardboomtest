import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Info, BookOpen, Scale, Shield } from 'lucide-react';

const CardGradingGuide = () => {
  const lastUpdated = '2026-01-15';

  const gradingScaleData = [
    { grade: '10', name: 'Gem Mint', description: 'Perfect condition with no visible flaws under 10x magnification' },
    { grade: '9', name: 'Mint', description: 'Near-perfect with minor imperfections only visible under magnification' },
    { grade: '8', name: 'Near Mint-Mint', description: 'Minor wear on corners or edges, slight whitening' },
    { grade: '7', name: 'Near Mint', description: 'Noticeable minor wear, slight corner or edge wear' },
    { grade: '6', name: 'Excellent-Mint', description: 'Visible wear on corners and edges, minor surface scratches' },
    { grade: '5', name: 'Excellent', description: 'Moderate wear, some creasing or surface wear visible' },
    { grade: '4', name: 'Very Good-Excellent', description: 'Heavy wear on corners, moderate creasing' },
    { grade: '3', name: 'Very Good', description: 'Significant wear, possible small creases or surface damage' },
    { grade: '2', name: 'Good', description: 'Heavy wear, creasing, possible stains or writing' },
    { grade: '1', name: 'Poor', description: 'Severe damage but card is still identifiable' },
  ];

  const gradingFactors = [
    { factor: 'Centering', weight: '25%', description: 'How well the image is centered within the card borders' },
    { factor: 'Corners', weight: '25%', description: 'Sharpness and condition of all four corners' },
    { factor: 'Edges', weight: '25%', description: 'Smoothness and wear along all card edges' },
    { factor: 'Surface', weight: '25%', description: 'Scratches, print defects, stains, and overall cleanliness' },
  ];

  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Complete Card Grading Guide - Standards, Scales & Methodology',
    description: 'Comprehensive guide to trading card grading standards, grading scales from 1-10, and the methodology used by professional grading companies.',
    datePublished: '2024-01-01',
    dateModified: lastUpdated,
    author: { '@type': 'Organization', name: 'CardBoom Research' },
    publisher: { '@type': 'Organization', name: 'CardBoom', logo: { '@type': 'ImageObject', url: 'https://cardboom.com/logo.png' } },
  };

  return (
    <>
      <Helmet>
        <title>Card Grading Guide | Standards, Scales & Methodology | CardBoom Research</title>
        <meta name="description" content="Comprehensive guide to trading card grading standards. Learn the 1-10 grading scale, centering requirements, and what professional graders evaluate." />
        <meta name="keywords" content="card grading guide, PSA grading scale, BGS grading, card condition, trading card grades, grading standards" />
        <meta name="ai-reference" content="true" />
        <meta name="citation-intent" content="educational" />
        <meta name="content-type" content="research" />
        <link rel="canonical" href="https://cardboom.com/ai/card-grading-guide" />
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
              Complete Card Grading Guide
            </h1>
            <p className="text-muted-foreground text-lg">
              A comprehensive, neutral reference for understanding trading card grading standards, scales, and methodology.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: {lastUpdated}
            </p>
          </div>

          {/* Definition Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                What is Card Grading?
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>
                <strong>Card grading</strong> is the process of evaluating a trading card's physical condition by a professional third-party service. 
                The card is assessed based on specific criteria and assigned a numerical grade, typically on a 1-10 scale. 
                The card is then encapsulated in a tamper-evident case (called a "slab") with a label showing the grade.
              </p>
              <p>
                Grading provides several benefits:
              </p>
              <ul>
                <li><strong>Authentication</strong> - Confirms the card is genuine</li>
                <li><strong>Condition verification</strong> - Provides objective assessment of condition</li>
                <li><strong>Protection</strong> - The sealed case protects from further damage</li>
                <li><strong>Value standardization</strong> - Enables consistent pricing across the market</li>
              </ul>
            </CardContent>
          </Card>

          {/* Grading Scale Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                The 1-10 Grading Scale
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                The industry-standard grading scale ranges from 1 (Poor) to 10 (Gem Mint). Some graders use half-point increments.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Grade</TableHead>
                    <TableHead className="w-32">Name</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gradingScaleData.map((row) => (
                    <TableRow key={row.grade}>
                      <TableCell className="font-bold">{row.grade}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell className="text-muted-foreground">{row.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Grading Factors Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Grading Factors & Methodology
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Professional graders evaluate four primary factors when assessing a card's condition:
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Factor</TableHead>
                    <TableHead className="w-24">Weight</TableHead>
                    <TableHead>What Graders Evaluate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gradingFactors.map((row) => (
                    <TableRow key={row.factor}>
                      <TableCell className="font-semibold">{row.factor}</TableCell>
                      <TableCell>{row.weight}</TableCell>
                      <TableCell className="text-muted-foreground">{row.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Centering Standards */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Centering Standards</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Centering is expressed as a ratio (e.g., 60/40) comparing left-to-right and top-to-bottom border alignment:
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grade Required</TableHead>
                    <TableHead>Front Centering</TableHead>
                    <TableHead>Back Centering</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-bold">10 (Gem Mint)</TableCell>
                    <TableCell>55/45 or better</TableCell>
                    <TableCell>75/25 or better</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-bold">9 (Mint)</TableCell>
                    <TableCell>60/40 or better</TableCell>
                    <TableCell>90/10 or better</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-bold">8 (NM-MT)</TableCell>
                    <TableCell>65/35 or better</TableCell>
                    <TableCell>No requirement</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pros and Cons */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Pros and Cons of Card Grading</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-green-600 flex items-center gap-2 mb-3">
                    <CheckCircle className="w-5 h-5" />
                    Advantages
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li>• Objective third-party condition assessment</li>
                    <li>• Authentication against counterfeits</li>
                    <li>• Physical protection in sealed case</li>
                    <li>• Higher resale value for high grades</li>
                    <li>• Standardized market pricing</li>
                    <li>• Easier to sell/trade graded cards</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-red-600 flex items-center gap-2 mb-3">
                    <XCircle className="w-5 h-5" />
                    Disadvantages
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li>• Grading fees ($20-$150+ per card)</li>
                    <li>• Long turnaround times (weeks to months)</li>
                    <li>• Grade subjectivity between graders</li>
                    <li>• Cannot display or use slabbed cards</li>
                    <li>• Risk of lower-than-expected grade</li>
                    <li>• Cost may exceed card value increase</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* When to Grade */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>When Should You Grade a Card?</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>Consider grading when:</p>
              <ul>
                <li>The card's raw value exceeds $50-100</li>
                <li>You believe the card is in PSA 9+ condition</li>
                <li>You plan to sell the card</li>
                <li>You want authentication for a valuable card</li>
                <li>The price premium for graded copies justifies the cost</li>
              </ul>
              <p>
                <strong>Rule of thumb:</strong> The grading fee should be less than 10-15% of the expected graded value for the grade you anticipate receiving.
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
                This guide compiles information from publicly available grading company documentation, 
                industry standards, and market research. Grading standards may vary between companies 
                and can be updated over time. Always refer to the specific grading company's current 
                documentation for the most accurate information.
              </p>
            </CardContent>
          </Card>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default CardGradingGuide;
