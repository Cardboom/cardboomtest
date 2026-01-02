import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Shield,
  Truck,
  AlertTriangle,
  Award,
  TrendingUp,
  Clock,
  Star,
  Info,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SellerTrustScoreProps {
  sellerId: string;
  compact?: boolean;
}

const TIER_CONFIG = {
  new: { label: 'New Seller', color: 'bg-gray-500', icon: Star },
  bronze: { label: 'Bronze', color: 'bg-amber-700', icon: Shield },
  silver: { label: 'Silver', color: 'bg-gray-400', icon: Shield },
  gold: { label: 'Gold', color: 'bg-yellow-500', icon: Award },
  platinum: { label: 'Platinum', color: 'bg-cyan-400', icon: Award },
  diamond: { label: 'Diamond', color: 'bg-purple-500', icon: Award },
};

export const SellerTrustScore = ({ sellerId, compact = false }: SellerTrustScoreProps) => {
  const { data: trustScore, isLoading } = useQuery({
    queryKey: ['seller-trust-score', sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seller_trust_scores')
        .select('*')
        .eq('seller_id', sellerId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!sellerId,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-muted rounded w-24" />
      </div>
    );
  }

  // Default for new sellers
  const tier = trustScore?.tier || 'new';
  const score = trustScore?.overall_score || 0;
  const config = TIER_CONFIG[tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.new;
  const TierIcon = config.icon;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`gap-1.5 ${tier === 'diamond' ? 'border-purple-500 text-purple-500' : tier === 'platinum' ? 'border-cyan-400 text-cyan-400' : tier === 'gold' ? 'border-yellow-500 text-yellow-500' : ''}`}
          >
            <TierIcon className="w-3.5 h-3.5" />
            {config.label}
            <span className="text-xs opacity-70">{Math.round(score)}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Trust Score: {Math.round(score)}/100</p>
          <p className="text-xs text-muted-foreground">
            Based on delivery speed, disputes, and sales volume
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${config.color}/10`}>
              <TierIcon className={`w-5 h-5 ${tier === 'diamond' ? 'text-purple-500' : tier === 'platinum' ? 'text-cyan-400' : tier === 'gold' ? 'text-yellow-500' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <h4 className="font-semibold">Seller Trust Score</h4>
              <p className="text-sm text-muted-foreground">{config.label} Seller</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{Math.round(score)}</p>
            <p className="text-xs text-muted-foreground">/100</p>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="space-y-1">
          <Progress value={score} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>100</span>
          </div>
        </div>

        {/* Score Breakdown */}
        {trustScore && (
          <div className="grid grid-cols-2 gap-3">
            <ScoreMetric
              icon={Truck}
              label="Delivery Speed"
              score={trustScore.delivery_speed_score || 0}
              detail={trustScore.avg_delivery_days ? `${trustScore.avg_delivery_days.toFixed(1)} days avg` : 'N/A'}
            />
            <ScoreMetric
              icon={AlertTriangle}
              label="Dispute Rate"
              score={trustScore.dispute_rate_score || 0}
              detail={trustScore.dispute_rate ? `${(trustScore.dispute_rate * 100).toFixed(1)}%` : '0%'}
              inverseColor
            />
            <ScoreMetric
              icon={Award}
              label="Graded Cards"
              score={trustScore.graded_ratio_score || 0}
              detail={trustScore.graded_sales_ratio ? `${(trustScore.graded_sales_ratio * 100).toFixed(0)}% graded` : '0%'}
            />
            <ScoreMetric
              icon={TrendingUp}
              label="Sales Volume"
              score={trustScore.volume_score || 0}
              detail={`${trustScore.total_sales || 0} sales`}
            />
          </div>
        )}

        {/* Info */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <p>
            Trust scores are calculated from delivery times, dispute rates, graded card ratios, and sales volume.
            Higher scores unlock premium seller benefits.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

const ScoreMetric = ({
  icon: Icon,
  label,
  score,
  detail,
  inverseColor = false,
}: {
  icon: typeof Truck;
  label: string;
  score: number;
  detail: string;
  inverseColor?: boolean;
}) => {
  const getColor = () => {
    if (inverseColor) {
      return score >= 80 ? 'text-green-500' : score >= 50 ? 'text-yellow-500' : 'text-red-500';
    }
    return score >= 80 ? 'text-green-500' : score >= 50 ? 'text-yellow-500' : 'text-muted-foreground';
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
      <Icon className={`w-4 h-4 ${getColor()}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-sm font-medium">{Math.round(score)}</p>
      </div>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
};
