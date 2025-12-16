import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Briefcase, Users } from 'lucide-react';
import { useState } from 'react';
import { CartDrawer } from '@/components/CartDrawer';

const Careers = () => {
  const [cartOpen, setCartOpen] = useState(false);

  const positions = [
    { title: 'Senior Frontend Developer', department: 'Engineering', location: 'Istanbul, Turkey', type: 'Full-time' },
    { title: 'Product Designer', department: 'Design', location: 'Remote', type: 'Full-time' },
    { title: 'Community Manager', department: 'Marketing', location: 'Istanbul, Turkey', type: 'Full-time' },
    { title: 'Customer Support Specialist', department: 'Operations', location: 'Remote', type: 'Full-time' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Careers | Cardboom - Join Our Team</title>
        <meta name="description" content="Join the Cardboom team and help build the future of collectibles trading. View open positions in engineering, design, marketing, and operations." />
        <meta name="keywords" content="Cardboom careers, trading card jobs, fintech jobs Istanbul, remote jobs, startup careers" />
        <link rel="canonical" href="https://cardboom.com/careers" />
        <meta property="og:title" content="Careers | Cardboom" />
        <meta property="og:description" content="Join our team and help build the future of collectibles trading." />
        <meta property="og:url" content="https://cardboom.com/careers" />
      </Helmet>
      <Header cartCount={0} onCartClick={() => setCartOpen(true)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={[]} onRemoveItem={() => {}} />

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4">Careers</Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Join Our Team
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Help us build the future of collectibles trading. We're looking for passionate 
              individuals who share our vision.
            </p>
          </div>

          <div className="grid gap-4">
            {positions.map((position) => (
              <Card key={position.title} className="hover:border-primary/50 transition-colors">
                <CardContent className="py-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-lg">{position.title}</h3>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4" />
                          {position.department}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {position.location}
                        </span>
                        <Badge variant="secondary">{position.type}</Badge>
                      </div>
                    </div>
                    <Button>Apply Now</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-12">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold text-xl mb-2">Don't see a role that fits?</h3>
              <p className="text-muted-foreground mb-6">
                We're always looking for talented people. Send us your resume and we'll keep you in mind.
              </p>
              <Button variant="outline">Send General Application</Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Careers;