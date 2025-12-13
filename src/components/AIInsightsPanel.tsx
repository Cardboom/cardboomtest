import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Brain, TrendingUp, TrendingDown, AlertCircle, 
  Sparkles, Target, Zap, ChevronRight, Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import { motion } from 'framer-motion';

interface AIInsight {
  id: string;
  type: 'bullish' | 'bearish' | 'neutral' | 'opportunity';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  relatedItems?: string[];
  action?: string;
}

const MOCK_INSIGHTS: AIInsight[] = [
  {
    id: '1',
    type: 'bullish',
    title: 'Pokémon Base Set Momentum',
    description: 'Charizard prices showing strong upward momentum. Historical patterns suggest 15-20% increase potential.',
    confidence: 87,
    impact: 'high',
    relatedItems: ['Charizard 1st Ed', 'Blastoise Holo'],
    action: 'Consider buying before next price surge',
  },
  {
    id: '2',
    type: 'opportunity',
    title: 'Undervalued NBA Rookies',
    description: 'Luka Doncic PSA 10s trading below 30-day average. Potential arbitrage opportunity.',
    confidence: 73,
    impact: 'medium',
    action: 'Set price alert at $2,800',
  },
  {
    id: '3',
    type: 'bearish',
    title: 'One Piece Correction Expected',
    description: 'OP-01 prices showing signs of overextension. Short-term pullback likely.',
    confidence: 65,
    impact: 'medium',
  },
];

export const AIInsightsPanel = () => {
  const { formatPrice } = useCurrency();
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  const typeStyles = {
    bullish: {
      bg: 'bg-gain/10',
      border: 'border-gain/20',
      icon: TrendingUp,
      iconColor: 'text-gain',
      label: 'Bullish',
      labelBg: 'bg-gain/20 text-gain',
    },
    bearish: {
      bg: 'bg-loss/10',
      border: 'border-loss/20',
      icon: TrendingDown,
      iconColor: 'text-loss',
      label: 'Bearish',
      labelBg: 'bg-loss/20 text-loss',
    },
    neutral: {
      bg: 'bg-muted',
      border: 'border-border',
      icon: AlertCircle,
      iconColor: 'text-muted-foreground',
      label: 'Neutral',
      labelBg: 'bg-muted text-muted-foreground',
    },
    opportunity: {
      bg: 'bg-gold/10',
      border: 'border-gold/20',
      icon: Target,
      iconColor: 'text-gold',
      label: 'Opportunity',
      labelBg: 'bg-gold/20 text-gold',
    },
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent border-b border-border/50">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <span>AI Market Insights</span>
            <Badge variant="secondary" className="gap-1 text-xs">
              <Sparkles className="w-3 h-3" />
              Powered by AI
            </Badge>
          </div>
          <Badge variant="outline" className="text-xs">
            Updated 5m ago
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {MOCK_INSIGHTS.map((insight, index) => {
          const style = typeStyles[insight.type];
          const isExpanded = expandedInsight === insight.id;
          
          return (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "p-4 rounded-xl border transition-all cursor-pointer",
                style.bg,
                style.border,
                isExpanded && "ring-2 ring-primary/20"
              )}
              onClick={() => setExpandedInsight(isExpanded ? null : insight.id)}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  style.bg
                )}>
                  <style.icon className={cn("w-5 h-5", style.iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={cn("text-xs", style.labelBg)}>
                      {style.label}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {insight.confidence}% confidence
                    </Badge>
                    {insight.impact === 'high' && (
                      <Badge variant="destructive" className="text-xs gap-1">
                        <Zap className="w-3 h-3" />
                        High Impact
                      </Badge>
                    )}
                  </div>
                  <h4 className="font-semibold text-foreground">{insight.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                  
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 pt-3 border-t border-border/50"
                    >
                      {insight.action && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50 mb-2">
                          <Lightbulb className="w-4 h-4 text-gold" />
                          <span className="text-sm font-medium">{insight.action}</span>
                        </div>
                      )}
                      {insight.relatedItems && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {insight.relatedItems.map(item => (
                            <Badge key={item} variant="secondary" className="text-xs">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <Button size="sm" className="mt-3 w-full gap-2">
                        View Analysis
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
        
        <Button variant="outline" className="w-full gap-2">
          <Brain className="w-4 h-4" />
          Get Personalized Insights
        </Button>
      </CardContent>
    </Card>
  );
};
