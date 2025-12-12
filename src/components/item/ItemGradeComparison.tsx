import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Droplets } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ItemGradeComparisonProps {
  itemId: string;
  selectedGrade: string;
  onGradeChange: (grade: string) => void;
}

// Mock grade data
const MOCK_GRADES = [
  { grade: 'PSA 10', price: 420000, change_24h: 12.3, change_30d: 25.2, sales_30d: 45, avgDaysToSell: 3.2, liquidity: 'high' },
  { grade: 'PSA 9', price: 180000, change_24h: 8.1, change_30d: 18.5, sales_30d: 78, avgDaysToSell: 2.1, liquidity: 'high' },
  { grade: 'PSA 8', price: 85000, change_24h: 5.2, change_30d: 12.3, sales_30d: 120, avgDaysToSell: 1.5, liquidity: 'high' },
  { grade: 'PSA 7', price: 35000, change_24h: 2.1, change_30d: 8.4, sales_30d: 65, avgDaysToSell: 4.2, liquidity: 'medium' },
  { grade: 'Raw', price: 12000, change_24h: -1.2, change_30d: 5.1, sales_30d: 210, avgDaysToSell: 1.8, liquidity: 'high' },
];

export const ItemGradeComparison = ({ itemId, selectedGrade, onGradeChange }: ItemGradeComparisonProps) => {
  const formatPrice = (price: number) => {
    if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`;
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`;
    return `$${price.toLocaleString()}`;
  };

  const getLiquidityColor = (liquidity: string) => {
    switch (liquidity) {
      case 'high': return 'text-gain bg-gain/10';
      case 'medium': return 'text-accent bg-accent/10';
      case 'low': return 'text-loss bg-loss/10';
      default: return 'text-muted-foreground bg-secondary';
    }
  };

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="p-6 border-b border-border/50">
        <h3 className="font-display text-xl font-semibold text-foreground">Grade Comparison</h3>
        <p className="text-muted-foreground text-sm mt-1">
          Compare prices and liquidity across different grades
        </p>
      </div>

      {/* Grade Buttons */}
      <div className="p-4 border-b border-border/30 flex flex-wrap gap-2">
        {MOCK_GRADES.map((g) => (
          <Button
            key={g.grade}
            variant={selectedGrade === g.grade.toLowerCase().replace(' ', '') ? 'default' : 'outline'}
            size="sm"
            onClick={() => onGradeChange(g.grade.toLowerCase().replace(' ', ''))}
            className={cn(
              selectedGrade === g.grade.toLowerCase().replace(' ', '') && "bg-primary text-primary-foreground"
            )}
          >
            {g.grade}
          </Button>
        ))}
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-secondary/50 text-muted-foreground text-sm">
              <th className="text-left p-4 font-medium">Grade</th>
              <th className="text-right p-4 font-medium">Price</th>
              <th className="text-right p-4 font-medium">24h %</th>
              <th className="text-right p-4 font-medium">30d %</th>
              <th className="text-right p-4 font-medium">Sales (30d)</th>
              <th className="text-right p-4 font-medium">Avg. Days to Sell</th>
              <th className="text-center p-4 font-medium">Liquidity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {MOCK_GRADES.map((g, index) => (
              <tr 
                key={g.grade}
                className={cn(
                  "hover:bg-secondary/30 transition-colors",
                  selectedGrade === g.grade.toLowerCase().replace(' ', '') && "bg-primary/5"
                )}
              >
                <td className="p-4">
                  <span className={cn(
                    "px-3 py-1.5 rounded text-sm font-medium",
                    g.grade === 'PSA 10' && "bg-gold/20 text-gold",
                    g.grade === 'PSA 9' && "bg-purple-500/20 text-purple-400",
                    g.grade === 'Raw' && "bg-secondary text-muted-foreground",
                    !['PSA 10', 'PSA 9', 'Raw'].includes(g.grade) && "bg-blue-500/20 text-blue-400"
                  )}>
                    {g.grade}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <span className="text-foreground font-semibold">{formatPrice(g.price)}</span>
                  {index > 0 && (
                    <span className="text-muted-foreground text-xs block">
                      {(MOCK_GRADES[index - 1].price / g.price).toFixed(1)}× vs {MOCK_GRADES[index - 1].grade}
                    </span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <span className={cn(
                    "inline-flex items-center gap-1",
                    g.change_24h >= 0 ? "text-gain" : "text-loss"
                  )}>
                    {g.change_24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {g.change_24h >= 0 ? '+' : ''}{g.change_24h.toFixed(1)}%
                  </span>
                </td>
                <td className="p-4 text-right">
                  <span className={cn(
                    g.change_30d >= 0 ? "text-gain" : "text-loss"
                  )}>
                    {g.change_30d >= 0 ? '+' : ''}{g.change_30d.toFixed(1)}%
                  </span>
                </td>
                <td className="p-4 text-right text-foreground font-medium">
                  {g.sales_30d}
                </td>
                <td className="p-4 text-right text-muted-foreground">
                  {g.avgDaysToSell.toFixed(1)} days
                </td>
                <td className="p-4 text-center">
                  <span className={cn("px-2 py-1 rounded text-xs font-medium capitalize", getLiquidityColor(g.liquidity))}>
                    <Droplets className="w-3 h-3 inline mr-1" />
                    {g.liquidity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Insights */}
      <div className="p-4 bg-secondary/30 border-t border-border/30">
        <p className="text-sm text-muted-foreground">
          <span className="text-accent font-medium">💡 Insight:</span> PSA 10 trades at{' '}
          <span className="text-foreground font-medium">2.3×</span> the price of PSA 9, but PSA 9 sells{' '}
          <span className="text-foreground font-medium">1.5× faster</span> on average.
        </p>
      </div>
    </div>
  );
};
