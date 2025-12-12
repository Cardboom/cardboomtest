import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingDown, Clock, Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Deal {
  id: string;
  name: string;
  category: string;
  image: string;
  price: number;
  marketAvg: number;
  psaFairValue: number;
  dealLabel: string;
  dealScore: number;
  timeToSell: number;
  condition: string;
}

interface DealCardProps {
  deal: Deal;
  index: number;
  onClick: () => void;
}

export const DealCard = ({ deal, index, onClick }: DealCardProps) => {
  const formatPrice = (price: number) => {
    if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`;
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`;
    return `$${price.toLocaleString()}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass rounded-xl overflow-hidden hover:shadow-glow transition-all duration-300 cursor-pointer group"
      onClick={onClick}
    >
      {/* Deal Badge */}
      <div className="relative">
        <div className="absolute top-3 left-3 z-10">
          <Badge className="bg-gain text-gain-foreground gap-1 shadow-lg">
            <Sparkles className="w-3 h-3" />
            {deal.dealLabel}
          </Badge>
        </div>
        <div className="absolute top-3 right-3 z-10">
          <Badge variant="secondary" className="capitalize">
            {deal.category}
          </Badge>
        </div>
        <div className="aspect-[4/3] bg-secondary/30 p-4">
          <img 
            src={deal.image} 
            alt={deal.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {deal.name}
          </h3>
          <p className="text-sm text-muted-foreground">{deal.condition}</p>
        </div>

        {/* Price Comparison */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">CardBoom Price</span>
            <span className="font-bold text-foreground">{formatPrice(deal.price)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Market Avg</span>
            <span className="text-sm line-through text-muted-foreground">{formatPrice(deal.marketAvg)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">PSA Fair Value</span>
            <span className="text-sm text-muted-foreground">{formatPrice(deal.psaFairValue)}</span>
          </div>
        </div>

        {/* Savings & Time to Sell */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <div className="flex items-center gap-1 text-gain">
            <TrendingDown className="w-4 h-4" />
            <span className="font-semibold">{deal.dealScore.toFixed(0)}% off</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <Clock className="w-4 h-4" />
            <span>Sells in ~{deal.timeToSell.toFixed(1)}d</span>
          </div>
        </div>

        <Button className="w-full gap-2 group-hover:bg-primary/90">
          View Deal
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </motion.div>
  );
};
