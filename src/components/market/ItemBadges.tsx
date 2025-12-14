import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Sparkles, Flame, Clock } from 'lucide-react';

interface ItemBadgesProps {
  justListed?: boolean;
  justSold?: boolean;
  isTrending?: boolean;
  isNew?: boolean;
  className?: string;
}

export const ItemBadges = ({ 
  justListed, 
  justSold, 
  isTrending,
  isNew,
  className 
}: ItemBadgesProps) => {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {justListed && (
        <Badge 
          variant="outline" 
          className="bg-primary/20 text-primary border-primary/30 text-[10px] py-0 px-1.5 animate-pulse"
        >
          <Sparkles className="w-2.5 h-2.5 mr-0.5" />
          Just Listed
        </Badge>
      )}
      
      {justSold && (
        <Badge 
          variant="outline" 
          className="bg-loss/20 text-loss border-loss/30 text-[10px] py-0 px-1.5"
        >
          Sold
        </Badge>
      )}
      
      {isTrending && !justListed && (
        <Badge 
          variant="outline" 
          className="bg-orange-500/20 text-orange-500 border-orange-500/30 text-[10px] py-0 px-1.5"
        >
          <Flame className="w-2.5 h-2.5 mr-0.5" />
          Hot
        </Badge>
      )}
      
      {isNew && !justListed && (
        <Badge 
          variant="outline" 
          className="bg-blue-500/20 text-blue-500 border-blue-500/30 text-[10px] py-0 px-1.5"
        >
          <Clock className="w-2.5 h-2.5 mr-0.5" />
          New
        </Badge>
      )}
    </div>
  );
};
