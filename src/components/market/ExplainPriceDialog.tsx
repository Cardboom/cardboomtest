import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HelpCircle, TrendingUp, TrendingDown, Users, BarChart3, Clock, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExplainPriceDialogProps {
  itemName: string;
  currentPrice: number;
  priceChange24h?: number;
  priceChange7d?: number;
  priceChange30d?: number;
  liquidityLevel?: 'high' | 'medium' | 'low';
  salesCount?: number;
  watchlistCount?: number;
  category?: string;
  lastSalePrice?: number;
  lastSaleDate?: string;
  children?: React.ReactNode;
}

export const ExplainPriceDialog = ({
  itemName,
  currentPrice,
  priceChange24h = 0,
  priceChange7d = 0,
  priceChange30d = 0,
  liquidityLevel = 'medium',
  salesCount = 0,
  watchlistCount = 0,
  category,
  lastSalePrice,
  lastSaleDate,
  children,
}: ExplainPriceDialogProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  // Generate plain language summary
  const generateSummary = () => {
    const parts: string[] = [];

    // Price trend
    if (priceChange30d > 10) {
      parts.push(`This card has been on an upward trend, gaining ${priceChange30d.toFixed(1)}% over the past month.`);
    } else if (priceChange30d < -10) {
      parts.push(`This card has declined ${Math.abs(priceChange30d).toFixed(1)}% over the past month.`);
    } else {
      parts.push(`Price has been relatively stable over the past month.`);
    }

    // Liquidity
    if (liquidityLevel === 'high') {
      parts.push(`High trading volume means you can buy or sell quickly.`);
    } else if (liquidityLevel === 'low') {
      parts.push(`Low trading volume - finding buyers may take longer.`);
    }

    // Demand
    if (watchlistCount > 100) {
      parts.push(`${watchlistCount} collectors are watching this item, indicating strong interest.`);
    }

    // Recent sale
    if (lastSalePrice && lastSaleDate) {
      const saleDiff = ((currentPrice - lastSalePrice) / lastSalePrice) * 100;
      parts.push(`Last sold for $${lastSalePrice.toFixed(2)} (${saleDiff > 0 ? '+' : ''}${saleDiff.toFixed(1)}% vs current).`);
    }

    return parts.join(' ');
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    // Simulate AI generation - in production this would call an edge function
    await new Promise(resolve => setTimeout(resolve, 1500));
    setAiInsight(
      `Based on market analysis, ${itemName} is currently ${priceChange7d >= 0 ? 'gaining momentum' : 'experiencing a pullback'}. ` +
      `Similar cards in the ${category || 'collectibles'} category have shown ${priceChange30d >= 0 ? 'strength' : 'weakness'} recently. ` +
      `The current price represents ${liquidityLevel === 'high' ? 'fair market value with good liquidity' : 'an opportunity, though finding buyers may take time'}.`
    );
    setIsGenerating(false);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs">
            <HelpCircle className="w-3.5 h-3.5" />
            Explain This
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Price Analysis: {itemName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Price */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
            <span className="text-sm text-muted-foreground">Current Price</span>
            <span className="text-2xl font-bold font-display">${currentPrice.toFixed(2)}</span>
          </div>

          {/* Price Changes Grid */}
          <div className="grid grid-cols-3 gap-3">
            <PriceChangeCard label="24h" change={priceChange24h} />
            <PriceChangeCard label="7d" change={priceChange7d} />
            <PriceChangeCard label="30d" change={priceChange30d} />
          </div>

          {/* Key Factors */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Price Drivers</h4>
            <div className="space-y-2">
              <FactorRow 
                icon={<BarChart3 className="w-4 h-4" />}
                label="Liquidity"
                value={liquidityLevel === 'high' ? 'High volume' : liquidityLevel === 'medium' ? 'Moderate' : 'Low volume'}
                color={liquidityLevel === 'high' ? 'text-gain' : liquidityLevel === 'medium' ? 'text-amber-500' : 'text-loss'}
              />
              <FactorRow 
                icon={<Users className="w-4 h-4" />}
                label="Demand"
                value={`${watchlistCount} watching`}
                color={watchlistCount > 50 ? 'text-gain' : 'text-muted-foreground'}
              />
              <FactorRow 
                icon={<Clock className="w-4 h-4" />}
                label="Recent Sales"
                value={salesCount > 0 ? `${salesCount} in 30 days` : 'No recent sales'}
                color={salesCount > 10 ? 'text-gain' : 'text-muted-foreground'}
              />
            </div>
          </div>

          {/* Plain Language Summary */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {generateSummary()}
            </p>
          </div>

          {/* AI Insight */}
          {aiInsight ? (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">AI Insight</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{aiInsight}</p>
            </div>
          ) : (
            <Button 
              variant="outline" 
              className="w-full gap-2" 
              onClick={handleGenerateAI}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isGenerating ? 'Analyzing...' : 'Generate AI Analysis'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const PriceChangeCard = ({ label, change }: { label: string; change: number }) => {
  const isPositive = change >= 0;
  return (
    <div className="p-3 rounded-lg bg-muted/50 border border-border text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className={cn(
        "flex items-center justify-center gap-1 font-semibold",
        isPositive ? 'text-gain' : 'text-loss'
      )}>
        {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
        {isPositive ? '+' : ''}{change.toFixed(1)}%
      </div>
    </div>
  );
};

const FactorRow = ({ 
  icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  color: string;
}) => (
  <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
    <div className="flex items-center gap-2 text-muted-foreground">
      {icon}
      <span className="text-sm">{label}</span>
    </div>
    <span className={cn("text-sm font-medium", color)}>{value}</span>
  </div>
);
