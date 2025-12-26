import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { Award, Clock, Shield, ChevronRight, Zap, CheckCircle, ArrowRight, Camera, CreditCard, BarChart3, Sparkles } from 'lucide-react';
import { GRADING_PRICE_USD } from '@/hooks/useGrading';
import { Collectible } from '@/types/collectible';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';

export default function Grading() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<Collectible[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const stats = [
    { value: '50K+', label: 'Cards Graded' },
    { value: '99.2%', label: 'Accuracy Rate' },
    { value: '<24h', label: 'Avg Turnaround' },
  ];

  const steps = [
    { icon: Camera, title: 'Upload', description: 'Snap front & back' },
    { icon: CreditCard, title: 'Pay', description: `$${GRADING_PRICE_USD} per card` },
    { icon: BarChart3, title: 'Results', description: 'Get detailed grade' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>AI Card Grading - CardBoom</title>
        <meta name="description" content="Get professional AI grading for your trading cards. Fast, accurate, and affordable." />
      </Helmet>
      
      <Header cartCount={cartItems.length} onCartClick={() => setIsCartOpen(true)} />
      <CartDrawer 
        items={cartItems} 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        onRemoveItem={(id) => setCartItems(items => items.filter(item => item.id !== id))}
      />
      
      <main className="pt-16 md:pt-20">
        {/* Hero - Clean & Minimal */}
        <section className="relative overflow-hidden">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent" />
          
          <div className="container mx-auto px-4 py-12 md:py-20 lg:py-28">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 bg-primary/10 rounded-full text-sm font-medium text-primary">
                  <Sparkles className="w-4 h-4" />
                  AI-Powered Grading
                </div>
                
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 md:mb-6">
                  Know your card's true value
                </h1>
                
                <p className="text-base sm:text-lg text-muted-foreground mb-6 md:mb-8 max-w-2xl mx-auto px-4">
                  Professional AI grading in under 24 hours. Get detailed subgrades for corners, edges, surface, and centering.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8 md:mb-12 px-4">
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto h-12 px-8 text-base font-semibold rounded-full gap-2"
                    onClick={() => navigate('/grading/new')}
                  >
                    Grade Your Card
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="w-full sm:w-auto h-12 px-8 text-base rounded-full"
                    onClick={() => navigate('/grading/orders')}
                  >
                    View My Orders
                  </Button>
                </div>

                {/* Stats row */}
                <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 text-center">
                  {stats.map((stat, i) => (
                    <motion.div 
                      key={stat.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                    >
                      <div className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</div>
                      <div className="text-xs md:text-sm text-muted-foreground">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Sample Grade Card - Visual Hook */}
        <section className="py-8 md:py-16">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="max-w-sm mx-auto"
            >
              <div className="relative bg-card rounded-2xl md:rounded-3xl p-5 md:p-6 border border-border shadow-xl">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                  Sample Result
                </div>
                
                {/* Grade Circle */}
                <div className="text-center py-6 md:py-8">
                  <motion.div 
                    className="inline-flex items-center justify-center w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  >
                    <div>
                      <div className="text-3xl md:text-4xl font-bold">9.5</div>
                      <div className="text-[10px] md:text-xs uppercase tracking-wide opacity-90">Gem Mint</div>
                    </div>
                  </motion.div>
                </div>

                {/* Subgrades */}
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {[
                    { label: 'Corners', value: 9.5, color: 'bg-emerald-500' },
                    { label: 'Edges', value: 10, color: 'bg-emerald-500' },
                    { label: 'Surface', value: 9, color: 'bg-yellow-500' },
                    { label: 'Centering', value: 9.5, color: 'bg-emerald-500' },
                  ].map((item, i) => (
                    <motion.div 
                      key={item.label}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.4 + i * 0.1 }}
                      className="flex items-center justify-between p-2.5 md:p-3 bg-muted/50 rounded-xl"
                    >
                      <span className="text-xs md:text-sm text-muted-foreground">{item.label}</span>
                      <span className={`px-2 py-0.5 rounded-md text-xs md:text-sm font-bold text-white ${item.color}`}>
                        {item.value}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* How It Works - Simple Steps */}
        <section className="py-12 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-xl md:text-2xl font-bold text-center mb-8 md:mb-12"
            >
              Three simple steps
            </motion.h2>
            
            <div className="max-w-3xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {steps.map((step, i) => (
                  <motion.div 
                    key={step.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    className="relative flex md:flex-col items-center md:text-center gap-4 md:gap-3 p-4 md:p-6 bg-card rounded-xl md:rounded-2xl border border-border"
                  >
                    <div className="flex-shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-primary/10 flex items-center justify-center">
                      <step.icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                    </div>
                    <div className="flex-1 md:flex-none">
                      <div className="font-semibold text-sm md:text-base mb-0.5">{step.title}</div>
                      <div className="text-xs md:text-sm text-muted-foreground">{step.description}</div>
                    </div>
                    {i < steps.length - 1 && (
                      <ChevronRight className="hidden md:block absolute -right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {[
                { icon: Zap, label: 'AI-Powered' },
                { icon: Clock, label: 'Fast Results' },
                { icon: Shield, label: 'Secure' },
                { icon: Award, label: 'Accurate' },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="flex flex-col items-center justify-center p-4 md:p-6 rounded-xl md:rounded-2xl bg-muted/40 border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <item.icon className="w-5 h-5 md:w-6 md:h-6 text-primary mb-2" />
                  <span className="text-xs md:text-sm font-medium text-center">{item.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-xl mx-auto text-center px-4"
            >
              <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Ready to grade?</h2>
              <p className="text-sm md:text-base text-muted-foreground mb-6">
                Start for just ${GRADING_PRICE_USD} per card. No subscription required.
              </p>
              <Button 
                size="lg" 
                className="w-full sm:w-auto h-12 px-8 rounded-full font-semibold gap-2"
                onClick={() => navigate('/grading/new')}
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Button>
              
              <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mt-6 md:mt-8 text-xs md:text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>No subscription</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>Pay per card</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>Results in 24h</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
