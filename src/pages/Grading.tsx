import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Clock, Shield, Sparkles, ChevronRight, ListOrdered, Zap, Star, CheckCircle } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { GRADING_PRICE_USD } from '@/hooks/useGrading';

export default function Grading() {
  const navigate = useNavigate();

  const features = [
    { icon: Zap, title: 'AI-Powered Analysis', description: 'Advanced machine learning evaluates corners, edges, surface, and centering' },
    { icon: Clock, title: '1-5 Day Turnaround', description: 'Get professional-grade results faster than traditional grading services' },
    { icon: Shield, title: 'Secure & Private', description: 'Your card images are encrypted and processed securely' },
    { icon: Star, title: 'Detailed Breakdown', description: 'Subgrades for corners, edges, surface, and centering' },
  ];

  const howItWorks = [
    { step: 1, title: 'Upload Photos', description: 'Take or upload clear photos of front and back' },
    { step: 2, title: 'Pay & Submit', description: `One-time fee of $${GRADING_PRICE_USD} from your CardBoom balance` },
    { step: 3, title: 'AI Analysis', description: 'Our AI analyzes every detail of your card' },
    { step: 4, title: 'Get Results', description: 'Receive detailed grade report within 1-5 days' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 pt-24 pb-16">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <Badge variant="secondary" className="mb-4 px-4 py-1.5">
            <Sparkles className="w-3 h-3 mr-1" />
            AI-Powered Grading
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            CardBoom Grading
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Get professional AI grading for your trading cards. Fast, accurate, and affordable 
            at just <span className="text-primary font-bold">${GRADING_PRICE_USD}</span> per card.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button 
              size="lg" 
              className="text-lg px-8 gap-2"
              onClick={() => navigate('/grading/new')}
            >
              <Award className="w-5 h-5" />
              Start Grading
              <ChevronRight className="w-4 h-4" />
            </Button>
            
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 gap-2"
              onClick={() => navigate('/grading/orders')}
            >
              <ListOrdered className="w-5 h-5" />
              My Orders
            </Button>
          </div>

          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span>Turnaround: 1-5 days</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span>Price: ${GRADING_PRICE_USD}</span>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature) => (
            <Card key={feature.title} className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* How It Works */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
          
          <div className="grid md:grid-cols-4 gap-6">
            {howItWorks.map((item, index) => (
              <div key={item.step} className="relative text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-xl flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
                
                {index < howItWorks.length - 1 && (
                  <ChevronRight className="hidden md:block absolute top-6 -right-3 w-6 h-6 text-muted-foreground/50" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <Card className="max-w-2xl mx-auto border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-8 text-center">
            <Award className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Ready to Grade Your Card?</h2>
            <p className="text-muted-foreground mb-6">
              Upload photos and get AI-powered grading results in just 1-5 days.
            </p>
            <Button 
              size="lg" 
              className="gap-2"
              onClick={() => navigate('/grading/new')}
            >
              Start Now - ${GRADING_PRICE_USD}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
