import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Film, 
  Shield, 
  Swords, 
  Gamepad2, 
  TrendingUp, 
  PieChart,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Feature {
  id: string;
  icon: React.ElementType;
  title: string;
  tagline: string;
  description: string;
  gradient: string;
  accentColor: string;
  route: string;
}

const features: Feature[] = [
  {
    id: 'reels',
    icon: Film,
    title: 'Boom Reels',
    tagline: 'Watch & Discover',
    description: 'Short-form card content. Unboxings, pulls, and collection showcases from the community.',
    gradient: 'from-pink-500 to-rose-500',
    accentColor: 'text-pink-500',
    route: '/reels',
  },
  {
    id: 'grading',
    icon: Shield,
    title: 'AI Grading',
    tagline: 'Instant Results',
    description: 'Get AI-powered condition grades in seconds. Professional accuracy at a fraction of the cost.',
    gradient: 'from-[#3CBCC3] to-[#2DA8AE]',
    accentColor: 'text-primary',
    route: '/grading',
  },
  {
    id: 'cardwars',
    icon: Swords,
    title: 'Card Wars',
    tagline: 'Vote & Win',
    description: 'Battle royale voting. Pick champions, compete for $100 prize pools. Pro votes earn payouts.',
    gradient: 'from-orange-500 to-red-500',
    accentColor: 'text-orange-500',
    route: '/#card-wars',
  },
  {
    id: 'gaming',
    icon: Gamepad2,
    title: 'Gaming',
    tagline: 'Play & Trade',
    description: 'In-game currency, coaching, and esports collectibles. Level up your gaming portfolio.',
    gradient: 'from-purple-500 to-violet-500',
    accentColor: 'text-purple-500',
    route: '/gaming',
  },
  {
    id: 'arbitrage',
    icon: TrendingUp,
    title: 'Arbitrage',
    tagline: 'Spot Deals',
    description: 'Find price gaps across platforms. Buy low, sell high with real-time opportunity alerts.',
    gradient: 'from-emerald-500 to-green-500',
    accentColor: 'text-emerald-500',
    route: '/deals',
  },
  {
    id: 'portfolio',
    icon: PieChart,
    title: 'Portfolio',
    tagline: 'Track & Grow',
    description: 'Monitor your collection value in real-time. Analytics, trends, and performance insights.',
    gradient: 'from-amber-500 to-yellow-500',
    accentColor: 'text-amber-500',
    route: '/portfolio',
  },
];

export const FeatureShowcase = () => {
  const navigate = useNavigate();
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

  return (
    <section className="pt-8 pb-16 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <motion.div 
        className="absolute inset-0 opacity-30"
        animate={{ 
          background: [
            'radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.1) 0%, transparent 50%)',
            'radial-gradient(circle at 80% 50%, hsl(var(--primary) / 0.1) 0%, transparent 50%)',
            'radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.1) 0%, transparent 50%)',
          ]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
      
      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">Why CardBoom</span>
          </motion.div>
          
          <motion.h1 
            className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Everything you need.
          </motion.h1>
          <motion.p 
            className="text-2xl md:text-3xl lg:text-4xl font-bold text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Nothing you don't.
          </motion.p>
        </motion.div>

        {/* Feature Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ 
                duration: 0.5, 
                delay: 0.5 + index * 0.08,
                type: "spring",
                stiffness: 100
              }}
              onMouseEnter={() => setHoveredFeature(feature.id)}
              onMouseLeave={() => setHoveredFeature(null)}
              onClick={() => navigate(feature.route)}
              className="group cursor-pointer"
            >
              <div className={cn(
                "relative h-full p-5 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm",
                "transition-all duration-500 ease-out",
                "hover:border-border hover:bg-card hover:shadow-2xl hover:-translate-y-2",
                hoveredFeature && hoveredFeature !== feature.id && "opacity-40 scale-95"
              )}>
                {/* Gradient glow on hover */}
                <motion.div 
                  className={cn(
                    "absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500",
                    "bg-gradient-to-br",
                    feature.gradient,
                    "group-hover:opacity-[0.12]"
                  )}
                  animate={hoveredFeature === feature.id ? { 
                    opacity: [0.08, 0.15, 0.08] 
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                />

                {/* Icon with pulse animation on hover */}
                <motion.div 
                  className={cn(
                    "relative w-11 h-11 rounded-xl flex items-center justify-center mb-3",
                    "bg-gradient-to-br",
                    feature.gradient,
                    "shadow-lg"
                  )}
                  whileHover={{ scale: 1.15, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <feature.icon className="w-5 h-5 text-white" />
                </motion.div>

                {/* Content */}
                <div className="relative space-y-0.5">
                  <h3 className="font-display text-base font-bold text-foreground group-hover:text-foreground transition-colors">
                    {feature.title}
                  </h3>
                  <p className={cn(
                    "text-xs font-medium transition-colors",
                    feature.accentColor
                  )}>
                    {feature.tagline}
                  </p>
                </div>

                {/* Expanded description on hover */}
                <AnimatePresence>
                  {hoveredFeature === feature.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        {feature.description}
                      </p>
                      <motion.div 
                        className="flex items-center gap-1 mt-2 text-xs font-medium text-primary"
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        <span>Explore</span>
                        <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div 
          className="mt-10 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1 }}
        >
          <p className="text-muted-foreground text-sm mb-4">
            Built for collectors, by collectors.
          </p>
          <motion.div
            className="inline-flex items-center gap-2 text-sm font-medium text-primary"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span>Scroll to explore</span>
            <ArrowRight className="w-4 h-4 rotate-90" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};