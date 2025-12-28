import { motion } from 'framer-motion';
import { Shield, ArrowRight, Upload, Scan, Award, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const steps = [
  { icon: Upload, title: 'Upload', description: 'Take a photo of your card' },
  { icon: Scan, title: 'Scan', description: 'AI analyzes every detail' },
  { icon: Award, title: 'Grade', description: 'Get instant PSA-equivalent grade' },
];

export const GradingCTA = () => {
  const navigate = useNavigate();

  return (
    <section className="relative py-12 sm:py-16 md:py-20 overflow-hidden">
      {/* Flowing gradient using primary color */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      <motion.div 
        className="absolute inset-0"
        animate={{ 
          background: [
            'radial-gradient(ellipse 60% 40% at 30% 50%, hsl(182 58% 50% / 0.08) 0%, transparent 50%)',
            'radial-gradient(ellipse 60% 40% at 70% 50%, hsl(182 58% 55% / 0.08) 0%, transparent 50%)',
            'radial-gradient(ellipse 60% 40% at 30% 50%, hsl(182 58% 50% / 0.08) 0%, transparent 50%)',
          ]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      />
      
      <div className="container mx-auto px-4 relative">
        <motion.div 
          className="text-center mb-8 sm:mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.div 
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-3 sm:mb-4"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
            <span className="text-xs sm:text-sm font-medium text-primary">How It Works</span>
          </motion.div>
          
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-3 sm:mb-4">
            Three Steps to Your Grade
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-2">
            No shipping, no waiting weeks. Get accurate grades in seconds.
          </p>
        </motion.div>
        
        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="group"
            >
              <motion.div 
                className="relative p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm h-full"
                whileHover={{ scale: 1.03, y: -5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {/* Step number - using primary color */}
                <div className="absolute -top-2 -left-2 sm:-top-3 sm:-left-3 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs sm:text-sm shadow-lg shadow-primary/25">
                  {index + 1}
                </div>
                
                {/* Icon */}
                <motion.div 
                  className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3 sm:mb-4"
                  whileHover={{ rotate: 5, scale: 1.1 }}
                >
                  <step.icon className="w-5 h-5 sm:w-7 sm:h-7 text-primary" />
                </motion.div>
                
                <h3 className="font-display text-lg sm:text-xl font-bold text-foreground mb-1 sm:mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm sm:text-base">{step.description}</p>
                
                {/* Connector line (except last) */}
                {index < steps.length - 1 && (
                  <div className="hidden sm:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
                )}
              </motion.div>
            </motion.div>
          ))}
        </div>
        
        {/* CTA */}
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="inline-flex flex-col sm:flex-row gap-3 sm:gap-4 items-center px-4 sm:px-0">
            <Button 
              size="lg"
              onClick={() => navigate('/grading')}
              className="bg-primary hover:bg-primary/90 shadow-xl shadow-primary/25 text-sm sm:text-base px-6 sm:px-8 h-11 sm:h-12 group w-full sm:w-auto"
            >
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:scale-110 transition-transform" />
              Grade Your First Card Free
              <motion.div
                className="ml-2"
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
              </motion.div>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
