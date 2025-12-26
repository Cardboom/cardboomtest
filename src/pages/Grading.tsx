import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { Award, Clock, Shield, Sparkles, ChevronRight, ListOrdered, Zap, Star, CheckCircle, ArrowRight } from 'lucide-react';
import { GRADING_PRICE_USD } from '@/hooks/useGrading';
import { Collectible } from '@/types/collectible';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';

export default function Grading() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<Collectible[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const features = [
    { icon: Zap, title: 'AI-Powered Analysis', description: 'Advanced ML evaluates corners, edges, surface & centering' },
    { icon: Clock, title: '1-5 Day Turnaround', description: 'Get results faster than traditional grading services' },
    { icon: Shield, title: 'Secure & Private', description: 'Your card images are encrypted and processed securely' },
    { icon: Star, title: 'Detailed Breakdown', description: 'Subgrades for all key card condition factors' },
  ];

  const howItWorks = [
    { step: 1, title: 'Upload Photos', description: 'Take clear photos of front and back' },
    { step: 2, title: 'Pay & Submit', description: `$${GRADING_PRICE_USD} from your CardBoom balance` },
    { step: 3, title: 'AI Analysis', description: 'Our AI analyzes every detail' },
    { step: 4, title: 'Get Results', description: 'Detailed grade report in 1-5 days' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>AI Card Grading - CardBoom</title>
        <meta name="description" content="Get professional AI grading for your trading cards. Fast, accurate, and affordable at just $20 per card." />
      </Helmet>
      
      <Header cartCount={cartItems.length} onCartClick={() => setIsCartOpen(true)} />
      <CartDrawer 
        items={cartItems} 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        onRemoveItem={(id) => setCartItems(items => items.filter(item => item.id !== id))}
      />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-blue-500/5" />
          
          <div className="container mx-auto px-4 py-16 lg:py-24">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-xl"
              >
                <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  AI-Powered Grading
                </Badge>
                
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                  The future of card grading is here.
                </h1>
                
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  Get professional AI grading for your cards. Fast, accurate, and affordable at just <span className="font-bold text-foreground">${GRADING_PRICE_USD}</span>.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                  <Button 
                    size="lg" 
                    className="text-base h-12 px-6 gap-2 rounded-full"
                    onClick={() => navigate('/grading/new')}
                  >
                    Start Grading
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="text-base h-12 px-6 gap-2 rounded-full"
                    onClick={() => navigate('/grading/orders')}
                  >
                    <ListOrdered className="w-4 h-4" />
                    My Orders
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>1-5 day turnaround</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>${GRADING_PRICE_USD} per card</span>
                  </div>
                </div>
              </motion.div>

              {/* Phone mockup */}
              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative hidden lg:flex justify-center"
              >
                <div className="relative">
                  <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 via-blue-500/20 to-cyan-500/20 rounded-[3rem] blur-3xl" />
                  <div className="relative bg-card rounded-[2.5rem] p-2 shadow-2xl border border-border/50">
                    <div className="bg-background rounded-[2rem] p-6 w-[280px] min-h-[480px]">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Sample Result</span>
                          <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-500 border-0">
                            Completed
                          </Badge>
                        </div>
                        
                        <motion.div 
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.5, delay: 0.5 }}
                          className="text-center py-6"
                        >
                          <div className="text-6xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                            9.5
                          </div>
                          <span className="text-sm text-muted-foreground">Gem Mint</span>
                        </motion.div>

                        <div className="space-y-3">
                          {[
                            { label: 'Corners', value: 9.5 },
                            { label: 'Edges', value: 10 },
                            { label: 'Surface', value: 9 },
                            { label: 'Centering', value: 9.5 },
                          ].map((item, i) => (
                            <motion.div 
                              key={item.label}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: 0.6 + i * 0.1 }}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-muted-foreground">{item.label}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <motion.div 
                                    className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(item.value / 10) * 100}%` }}
                                    transition={{ duration: 0.6, delay: 0.8 + i * 0.1 }}
                                  />
                                </div>
                                <span className="font-medium w-8 text-right">{item.value}</span>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="group p-5 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-3">How It Works</h2>
              <p className="text-muted-foreground">Simple process, professional results</p>
            </motion.div>
            
            <div className="max-w-4xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {howItWorks.map((item, i) => (
                <motion.div 
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.15 }}
                  className="relative text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-blue-500 text-primary-foreground font-bold text-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
                    {item.step}
                  </div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  {i < howItWorks.length - 1 && (
                    <ChevronRight className="hidden lg:block absolute top-6 -right-3 w-5 h-5 text-muted-foreground/30" />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="max-w-2xl mx-auto text-center p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-primary/10 via-blue-500/5 to-cyan-500/10 border border-primary/20"
            >
              <Award className="w-14 h-14 text-primary mx-auto mb-5" />
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">Ready to Grade Your Card?</h2>
              <p className="text-muted-foreground mb-6">
                Upload photos and get AI-powered grading results in just 1-5 days.
              </p>
              <Button 
                size="lg" 
                className="gap-2 rounded-full h-12 px-8"
                onClick={() => navigate('/grading/new')}
              >
                Start Now - ${GRADING_PRICE_USD}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
