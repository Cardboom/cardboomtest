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
    gradient: 'from-blue-500 to-cyan-500',
    accentColor: 'text-blue-500',
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
    <section className="py-20 border-t border-border/50 relative overflow-hidden">
      {/* Subtle background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      
      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Why CardBoom</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            Everything you need.
            <br />
            <span className="text-muted-foreground">Nothing you don't.</span>
          </h2>
        </motion.div>

        {/* Feature Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              onMouseEnter={() => setHoveredFeature(feature.id)}
              onMouseLeave={() => setHoveredFeature(null)}
              onClick={() => navigate(feature.route)}
              className="group cursor-pointer"
            >
              <div className={cn(
                "relative h-full p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm",
                "transition-all duration-500 ease-out",
                "hover:border-border hover:bg-card hover:shadow-2xl hover:-translate-y-2",
                hoveredFeature && hoveredFeature !== feature.id && "opacity-40"
              )}>
                {/* Gradient glow on hover */}
                <div className={cn(
                  "absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500",
                  "bg-gradient-to-br",
                  feature.gradient,
                  "group-hover:opacity-[0.08]"
                )} />

                {/* Icon */}
                <div className={cn(
                  "relative w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                  "bg-gradient-to-br",
                  feature.gradient,
                  "shadow-lg transition-transform duration-500 group-hover:scale-110"
                )}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>

                {/* Content */}
                <div className="relative space-y-1">
                  <h3 className="font-display text-lg font-bold text-foreground group-hover:text-foreground transition-colors">
                    {feature.title}
                  </h3>
                  <p className={cn(
                    "text-sm font-medium transition-colors",
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
                      <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                        {feature.description}
                      </p>
                      <div className="flex items-center gap-1 mt-3 text-sm font-medium text-primary">
                        <span>Explore</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom accent */}
        <motion.div 
          className="mt-16 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <p className="text-muted-foreground text-sm">
            Built for collectors, by collectors. Join 10,000+ users.
          </p>
        </motion.div>
      </div>
    </section>
  );
};