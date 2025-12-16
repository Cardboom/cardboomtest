import { CheckCircle2, AlertCircle, XCircle, ImageOff, Search, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface ImportedItem {
  name: string;
  status: 'complete' | 'needs_image' | 'needs_match' | 'error';
  imageUrl?: string | null;
  matchedId?: string | null;
  message?: string;
  category?: string;
}

interface ImportSummaryProps {
  items: ImportedItem[];
  onFixImage?: (item: ImportedItem) => void;
  onFixMatch?: (item: ImportedItem) => void;
  onRetryAll?: () => void;
}

export const ImportSummary = ({ items, onFixImage, onFixMatch, onRetryAll }: ImportSummaryProps) => {
  const stats = {
    total: items.length,
    complete: items.filter(i => i.status === 'complete').length,
    needsImage: items.filter(i => i.status === 'needs_image').length,
    needsMatch: items.filter(i => i.status === 'needs_match').length,
    errors: items.filter(i => i.status === 'error').length,
  };

  const successRate = stats.total > 0 ? (stats.complete / stats.total) * 100 : 0;
  const needsReview = stats.needsImage + stats.needsMatch;

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5 border border-primary/20">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">Import Summary</h3>
          <Badge variant={successRate >= 80 ? 'default' : successRate >= 50 ? 'secondary' : 'destructive'}>
            {successRate.toFixed(0)}% Complete
          </Badge>
        </div>
        
        <Progress value={successRate} className="h-2 mb-4" />
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            icon={<CheckCircle2 className="w-5 h-5 text-gain" />}
            label="Complete"
            count={stats.complete}
            color="text-gain"
          />
          <SummaryCard
            icon={<ImageOff className="w-5 h-5 text-amber-500" />}
            label="Needs Image"
            count={stats.needsImage}
            color="text-amber-500"
          />
          <SummaryCard
            icon={<AlertCircle className="w-5 h-5 text-orange-500" />}
            label="Needs Match"
            count={stats.needsMatch}
            color="text-orange-500"
          />
          <SummaryCard
            icon={<XCircle className="w-5 h-5 text-loss" />}
            label="Errors"
            count={stats.errors}
            color="text-loss"
          />
        </div>
      </div>

      {/* Next Actions */}
      {needsReview > 0 && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-amber-500" />
            <span className="text-sm">
              <strong>{needsReview}</strong> items need your attention
            </span>
          </div>
          {onRetryAll && (
            <Button size="sm" variant="outline" onClick={onRetryAll}>
              Auto-Fix All
            </Button>
          )}
        </div>
      )}

      {/* Items List */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {items.map((item, i) => (
          <ImportItemRow 
            key={i} 
            item={item} 
            onFixImage={onFixImage}
            onFixMatch={onFixMatch}
          />
        ))}
      </div>
    </div>
  );
};

const SummaryCard = ({ 
  icon, 
  label, 
  count, 
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  count: number; 
  color: string;
}) => (
  <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
    {icon}
    <div>
      <p className={cn("font-bold text-lg", color)}>{count}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  </div>
);

const ImportItemRow = ({ 
  item, 
  onFixImage, 
  onFixMatch 
}: { 
  item: ImportedItem;
  onFixImage?: (item: ImportedItem) => void;
  onFixMatch?: (item: ImportedItem) => void;
}) => {
  const statusConfig = {
    complete: {
      icon: <CheckCircle2 className="w-4 h-4 text-gain" />,
      badge: <Badge variant="default" className="bg-gain/20 text-gain border-gain/30">✓ Complete</Badge>,
    },
    needs_image: {
      icon: <ImageOff className="w-4 h-4 text-amber-500" />,
      badge: <Badge variant="secondary" className="bg-amber-500/20 text-amber-500 border-amber-500/30">⚠️ Needs Image</Badge>,
    },
    needs_match: {
      icon: <AlertCircle className="w-4 h-4 text-orange-500" />,
      badge: <Badge variant="secondary" className="bg-orange-500/20 text-orange-500 border-orange-500/30">❌ Needs Match</Badge>,
    },
    error: {
      icon: <XCircle className="w-4 h-4 text-loss" />,
      badge: <Badge variant="destructive">Error</Badge>,
    },
  };

  const config = statusConfig[item.status];

  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {config.icon}
        <span className="text-sm truncate">{item.name}</span>
        {config.badge}
      </div>
      
      <div className="flex items-center gap-2">
        {item.status === 'needs_image' && onFixImage && (
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => onFixImage(item)}
            className="h-7 text-xs"
          >
            <Search className="w-3 h-3 mr-1" />
            Fix Image
          </Button>
        )}
        {item.status === 'needs_match' && onFixMatch && (
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => onFixMatch(item)}
            className="h-7 text-xs"
          >
            <Search className="w-3 h-3 mr-1" />
            Find Match
          </Button>
        )}
      </div>
    </div>
  );
};
