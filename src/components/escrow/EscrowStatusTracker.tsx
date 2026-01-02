import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  Lock,
  Truck,
  Package,
  CheckCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type EscrowStatus = 'pending' | 'funds_locked' | 'shipped' | 'delivered' | 'released' | 'disputed' | 'refunded';

interface EscrowStatusTrackerProps {
  status: EscrowStatus;
  lockedAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  releasedAt?: string | null;
  shipByDeadline?: string | null;
  deliveryDeadline?: string | null;
  orderTotal: number;
  compact?: boolean;
}

const ESCROW_STEPS = [
  { key: 'funds_locked', label: 'Funds Locked', icon: Lock },
  { key: 'shipped', label: 'Item Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Package },
  { key: 'released', label: 'Funds Released', icon: CheckCircle },
];

const STATUS_CONFIG: Record<EscrowStatus, { label: string; color: string; icon: typeof Shield }> = {
  pending: { label: 'Pending', color: 'bg-gray-500', icon: Clock },
  funds_locked: { label: 'Funds Secured', color: 'bg-blue-500', icon: Lock },
  shipped: { label: 'In Transit', color: 'bg-yellow-500', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-500', icon: Package },
  released: { label: 'Complete', color: 'bg-green-500', icon: CheckCircle },
  disputed: { label: 'Disputed', color: 'bg-red-500', icon: AlertTriangle },
  refunded: { label: 'Refunded', color: 'bg-orange-500', icon: AlertTriangle },
};

export const EscrowStatusTracker = ({
  status,
  lockedAt,
  shippedAt,
  deliveredAt,
  releasedAt,
  shipByDeadline,
  deliveryDeadline,
  orderTotal,
  compact = false,
}: EscrowStatusTrackerProps) => {
  const formatPrice = (price: number) => `$${price.toLocaleString()}`;
  
  const getStepStatus = (stepKey: string): 'complete' | 'current' | 'pending' => {
    const stepOrder = ['funds_locked', 'shipped', 'delivered', 'released'];
    const currentIndex = stepOrder.indexOf(status);
    const stepIndex = stepOrder.indexOf(stepKey);
    
    if (stepIndex < currentIndex) return 'complete';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  const getProgress = () => {
    const progressMap: Record<EscrowStatus, number> = {
      pending: 0,
      funds_locked: 25,
      shipped: 50,
      delivered: 75,
      released: 100,
      disputed: 50,
      refunded: 100,
    };
    return progressMap[status];
  };

  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
        <div className={`p-1.5 rounded-full ${config.color}`}>
          <StatusIcon className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground">
            {formatPrice(orderTotal)} in escrow
          </p>
        </div>
        <Shield className="w-4 h-4 text-green-500" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-green-500" />
            CardBoom Escrow+
          </CardTitle>
          <Badge variant="outline" className={`${config.color} text-white border-0`}>
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount in Escrow */}
        <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-green-500" />
            <span className="text-sm">Protected Amount</span>
          </div>
          <span className="font-bold text-green-500">{formatPrice(orderTotal)}</span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={getProgress()} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Started</span>
            <span>Complete</span>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {ESCROW_STEPS.map((step, index) => {
            const stepStatus = getStepStatus(step.key);
            const StepIcon = step.icon;
            const timestamp = 
              step.key === 'funds_locked' ? lockedAt :
              step.key === 'shipped' ? shippedAt :
              step.key === 'delivered' ? deliveredAt :
              step.key === 'released' ? releasedAt : null;

            return (
              <div
                key={step.key}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  stepStatus === 'current' ? 'bg-primary/10' :
                  stepStatus === 'complete' ? 'bg-green-500/5' : 'opacity-50'
                }`}
              >
                <div
                  className={`p-1.5 rounded-full ${
                    stepStatus === 'complete' ? 'bg-green-500' :
                    stepStatus === 'current' ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  {stepStatus === 'complete' ? (
                    <CheckCircle className="w-4 h-4 text-white" />
                  ) : (
                    <StepIcon className={`w-4 h-4 ${stepStatus === 'current' ? 'text-white' : 'text-muted-foreground'}`} />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${stepStatus === 'pending' ? 'text-muted-foreground' : ''}`}>
                    {step.label}
                  </p>
                  {timestamp && (
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
                    </p>
                  )}
                </div>
                {stepStatus === 'complete' && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
              </div>
            );
          })}
        </div>

        {/* Deadlines */}
        {(shipByDeadline || deliveryDeadline) && status !== 'released' && status !== 'refunded' && (
          <div className="space-y-2 pt-2 border-t">
            {shipByDeadline && status === 'funds_locked' && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Ship by:</span>
                <span className="font-medium">
                  {new Date(shipByDeadline).toLocaleDateString()}
                </span>
              </div>
            )}
            {deliveryDeadline && (status === 'shipped' || status === 'delivered') && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Expected delivery:</span>
                <span className="font-medium">
                  {new Date(deliveryDeadline).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Protection Notice */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded flex items-start gap-2">
          <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5 text-green-500" />
          <p>
            Your payment is protected by CardBoom Escrow+. Funds are only released to the seller once you confirm receipt.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
