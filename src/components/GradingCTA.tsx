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
    <section className="relative py-20 overflow-hidden">
      {/* Flowing gradient that connects with sections above */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-blue-500/5 to-background" />
      <motion.div 
        className="absolute inset-0"
        animate={{ 
          background: [
            'radial-gradient(ellipse 60% 40% at 30% 50%, hsl(210 100% 50% / 0.06) 0%, transparent 50%)',
            'radial-gradient(ellipse 60% 40% at 70% 50%, hsl(190 100% 50% / 0.06) 0%, transparent 50%)',
            'radial-gradient(ellipse 60% 40% at 30% 50%, hsl(210 100% 50% / 0.06) 0%, transparent 50%)',
          ]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      />
      
      <div className="container mx-auto px-4 relative">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <Shield className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-500">How It Works</span>
          </motion.div>
          
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-4">
            Three Steps to Your Grade
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            No shipping, no waiting weeks. Get accurate grades in seconds.
          </p>
        </motion.div>
        
        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
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
                className="relative p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm h-full"
                whileHover={{ scale: 1.03, y: -5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {/* Step number */}
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  {index + 1}
                </div>
                
                {/* Icon */}
                <motion.div 
                  className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 flex items-center justify-center mb-4"
                  whileHover={{ rotate: 5, scale: 1.1 }}
                >
                  <step.icon className="w-7 h-7 text-blue-500" />
                </motion.div>
                
                <h3 className="font-display text-xl font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
                
                {/* Connector line (except last) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gradient-to-r from-blue-500/50 to-transparent" />
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
          <div className="inline-flex flex-col sm:flex-row gap-4 items-center">
            <Button 
              size="lg"
              onClick={() => navigate('/grading')}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-xl shadow-blue-500/25 text-base px-8 group"
            >
              <Shield className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
              Grade Your First Card Free
              <motion.div
                className="ml-2"
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ArrowRight className="w-4 h-4" />
              </motion.div>
            </Button>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                No credit card required
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
