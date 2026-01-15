import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Shield, ArrowRight, Sparkles, Clock, Zap, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const GradingHero = () => {
  const navigate = useNavigate();

  // Auth-aware navigation to grading flow
  const handleStartGrading = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.info("Please sign in to grade your cards");
      navigate('/auth?returnTo=/grading/new');
      return;
    }
    navigate('/grading/new');
  }, [navigate]);

  return (
    <section className="relative py-20 lg:py-28 overflow-hidden">
      {/* Flowing gradient background using primary color */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
      <motion.div 
        className="absolute inset-0"
        animate={{ 
          background: [
            'radial-gradient(ellipse 80% 50% at 20% 40%, hsl(182 58% 50% / 0.08) 0%, transparent 50%)',
            'radial-gradient(ellipse 80% 50% at 80% 60%, hsl(182 58% 55% / 0.08) 0%, transparent 50%)',
            'radial-gradient(ellipse 80% 50% at 50% 30%, hsl(182 58% 50% / 0.08) 0%, transparent 50%)',
            'radial-gradient(ellipse 80% 50% at 20% 40%, hsl(182 58% 50% / 0.08) 0%, transparent 50%)',
          ]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Animated grid */}
      <div className="absolute inset-0 bg-[linear-gradient(hsl(182_58%_50%/0.03)_1px,transparent_1px),linear-gradient(90deg,hsl(182_58%_50%/0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      
      <div className="container mx-auto px-4 relative">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left content */}
          <motion.div 
            className="flex-1 text-center lg:text-left"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Shield className="w-4 h-4 text-primary" />
              </motion.div>
              <span className="text-sm font-medium text-primary">AI-Powered Grading</span>
            </motion.div>
            
            <motion.h1 
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              Grade Your Card
              <br />
              <motion.span 
                className="text-primary"
              >
                In Seconds
              </motion.span>
            </motion.h1>
            
            <motion.p 
              className="text-muted-foreground text-lg md:text-xl mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              Professional-quality AI grading at a fraction of the cost. Upload, scan, and get instant results.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <Button 
                size="lg"
                onClick={handleStartGrading}
                className="bg-primary hover:bg-primary/90 shadow-xl shadow-primary/25 text-base px-8 group"
              >
                <Shield className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Start Grading
                <motion.div
                  className="ml-2"
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight className="w-4 h-4" />
                </motion.div>
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => navigate('/grading')}
                className="text-base group"
              >
                Learn More
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
            
            <motion.div 
              className="flex flex-wrap items-center gap-6 mt-8 justify-center lg:justify-start text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.7 }}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                Free credits on signup
              </span>
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                30 second results
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                PSA-accurate
              </span>
            </motion.div>
          </motion.div>
          
          {/* Right card preview */}
          <motion.div 
            className="flex-1 max-w-md w-full"
            initial={{ opacity: 0, x: 30, rotateY: -10 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="relative perspective-1000">
              {/* Animated glow */}
              <motion.div 
                className="absolute -inset-6 bg-primary/30 rounded-3xl blur-3xl"
                animate={{ 
                  opacity: [0.3, 0.5, 0.3],
                  scale: [1, 1.05, 1]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              
              <motion.div 
                className="relative bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-2xl"
                whileHover={{ scale: 1.02, rotateY: 5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="flex items-center justify-between mb-5">
                  <span className="text-sm font-medium text-muted-foreground">Live Grade Preview</span>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.8, type: "spring" }}
                  >
                    <Badge className="bg-primary text-primary-foreground shadow-lg">
                      PSA 9 Equivalent
                    </Badge>
                  </motion.div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[
                    { label: 'Centering', value: '9.0', delay: 0.6 },
                    { label: 'Corners', value: '9.5', delay: 0.7 },
                    { label: 'Edges', value: '9.0', delay: 0.8 },
                    { label: 'Surface', value: '9.5', delay: 0.9 },
                  ].map((item) => (
                    <motion.div 
                      key={item.label}
                      className="p-4 rounded-xl bg-muted/50 border border-border/30"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: item.delay, duration: 0.5 }}
                      whileHover={{ scale: 1.05, backgroundColor: 'hsl(var(--muted))' }}
                    >
                      <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                      <motion.div 
                        className="text-xl font-bold text-foreground"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: item.delay + 0.2 }}
                      >
                        {item.value}
                      </motion.div>
                    </motion.div>
                  ))}
                </div>
                
                <motion.div 
                  className="p-5 rounded-xl bg-primary/10 border border-primary/20"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1, duration: 0.5 }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">Final Grade</span>
                    <motion.span 
                      className="text-3xl font-bold text-primary"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      9.0
                    </motion.span>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
