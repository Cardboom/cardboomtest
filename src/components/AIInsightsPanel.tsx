import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Brain, TrendingUp, TrendingDown, AlertCircle, 
  Sparkles, Target, Zap, ChevronRight, Lightbulb, Loader2, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

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

export const AIInsightsPanel = () => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-insights');
      
      if (error) throw error;
      
      if (data?.insights && Array.isArray(data.insights)) {
        setInsights(data.insights);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch AI insights:', err);
      // Fallback to generic insights
      setInsights([
        {
          id: '1',
          type: 'neutral',
          title: 'Market Analysis Loading',
          description: 'AI is analyzing current market conditions. Check back shortly for fresh insights.',
          confidence: 50,
          impact: 'medium',
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getTimeSinceUpdate = () => {
    if (!lastUpdated) return 'Just now';
    const mins = Math.floor((Date.now() - lastUpdated.getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins === 1) return '1m ago';
    return `${mins}m ago`;
  };

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

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent border-b border-border/50">
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <span>AI Market Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing market conditions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
              Live AI
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {getTimeSinceUpdate()}
            </Badge>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={fetchInsights}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-1">
        {insights.map((insight, index) => {
          const style = typeStyles[insight.type] || typeStyles.neutral;
          const isExpanded = expandedInsight === insight.id;
          
          return (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all cursor-pointer hover:bg-muted/50",
                style.border,
                isExpanded && "ring-1 ring-primary/30 bg-muted/30"
              )}
              onClick={() => setExpandedInsight(isExpanded ? null : insight.id)}
            >
              {/* Icon */}
              <div className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center shrink-0",
                style.bg
              )}>
                <style.icon className={cn("w-4 h-4", style.iconColor)} />
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm text-foreground truncate">{insight.title}</h4>
                  {insight.impact === 'high' && (
                    <Zap className="w-3 h-3 text-gold shrink-0" />
                  )}
                </div>
                {!isExpanded && (
                  <p className="text-xs text-muted-foreground truncate">{insight.description}</p>
                )}
                
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2"
                  >
                    <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={cn("text-xs", style.labelBg)}>
                        {style.label}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {insight.confidence}% conf.
                      </Badge>
                    </div>
                    {insight.action && (
                      <div className="flex items-center gap-2 mt-2 p-2 rounded-md bg-background/50 text-xs">
                        <Lightbulb className="w-3 h-3 text-gold shrink-0" />
                        <span>{insight.action}</span>
                      </div>
                    )}
                    {insight.relatedItems && insight.relatedItems.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {insight.relatedItems.slice(0, 3).map(item => (
                          <Badge key={item} variant="secondary" className="text-xs">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Right side badges */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                  {insight.confidence}%
                </Badge>
                <ChevronRight className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform",
                  isExpanded && "rotate-90"
                )} />
              </div>
            </motion.div>
          );
        })}
        
        <Button variant="ghost" size="sm" className="w-full gap-2 mt-2 text-xs" onClick={() => window.location.href = '/auth'}>
          <Brain className="w-3 h-3" />
          Get Personalized Insights
        </Button>
      </CardContent>
    </Card>
  );
};
