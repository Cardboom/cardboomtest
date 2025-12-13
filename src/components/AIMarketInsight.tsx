import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface MarketInsight {
  text: string;
  type: 'bullish' | 'bearish' | 'neutral';
  category?: string;
}

const fallbackInsights: MarketInsight[] = [
  { text: "Pokemon Charizard cards up 15% this week", type: 'bullish', category: 'pokemon' },
  { text: "Sports card market showing strong momentum", type: 'bullish', category: 'sports' },
  { text: "Yu-Gi-Oh! Blue-Eyes demand increasing", type: 'bullish', category: 'yugioh' },
  { text: "Gaming collectibles gaining investor interest", type: 'bullish', category: 'gaming' },
  { text: "PSA 10 graded cards commanding 40% premium", type: 'neutral', category: 'grading' },
  { text: "One Piece TCG emerging as top performer", type: 'bullish', category: 'one-piece' },
  { text: "Market consolidating around blue-chip cards", type: 'neutral', category: 'market' },
  { text: "Vintage sports cards showing stability", type: 'neutral', category: 'sports' },
];

export const AIMarketInsight = () => {
  const [insight, setInsight] = useState<MarketInsight>(fallbackInsights[0]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Rotate through insights
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % fallbackInsights.length);
      setInsight(fallbackInsights[(currentIndex + 1) % fallbackInsights.length]);
    }, 8000);

    return () => clearInterval(interval);
  }, [currentIndex]);

  // Use fallback insights - no API call needed for the ticker
  // The AI edge function is only used for detailed item analysis

  const getIcon = () => {
    switch (insight.type) {
      case 'bullish':
        return <TrendingUp className="w-3.5 h-3.5 text-gain" />;
      case 'bearish':
        return <TrendingDown className="w-3.5 h-3.5 text-loss" />;
      default:
        return <AlertCircle className="w-3.5 h-3.5 text-primary" />;
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20">
      <Sparkles className="w-3.5 h-3.5 text-primary" />
      <span className="text-xs font-medium text-muted-foreground">AI Insight:</span>
      <span className="text-xs text-foreground font-medium truncate max-w-[200px] md:max-w-[400px]">
        {insight.text}
      </span>
      {getIcon()}
    </div>
  );
};
