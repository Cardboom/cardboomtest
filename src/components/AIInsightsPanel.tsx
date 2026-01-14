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
      <CardContent className="p-4 space-y-3">
        {insights.map((insight, index) => {
          const style = typeStyles[insight.type] || typeStyles.neutral;
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
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                      {insight.relatedItems && insight.relatedItems.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {insight.relatedItems.map(item => (
                            <Badge key={item} variant="secondary" className="text-xs">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <Button size="sm" className="mt-3 w-full gap-2" onClick={() => window.location.href = '/markets'}>
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
        
        <Button variant="outline" className="w-full gap-2" onClick={() => window.location.href = '/auth'}>
          <Brain className="w-4 h-4" />
          Get Personalized Insights
        </Button>
      </CardContent>
    </Card>
  );
};
