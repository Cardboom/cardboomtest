import { Check, Circle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GradingOrderStatus } from '@/hooks/useGrading';

interface OrderStatusTimelineProps {
  status: GradingOrderStatus;
  paidAt?: string | null;
  submittedAt?: string | null;
  completedAt?: string | null;
}

const STEPS = [
  { key: 'paid', label: 'Paid', description: 'Payment confirmed' },
  { key: 'queued', label: 'Queued', description: 'In grading queue' },
  { key: 'in_review', label: 'In Review', description: 'Being analyzed' },
  { key: 'completed', label: 'Completed', description: 'Grade assigned' },
];

export function OrderStatusTimeline({ status, paidAt, submittedAt, completedAt }: OrderStatusTimelineProps) {
  const getStepStatus = (stepKey: string) => {
    if (status === 'failed' || status === 'refunded') {
      if (stepKey === 'paid' && paidAt) return 'completed';
      return 'inactive';
    }

    switch (stepKey) {
      case 'paid':
        return paidAt ? 'completed' : status === 'pending_payment' ? 'current' : 'inactive';
      case 'queued':
        if (status === 'queued') return 'current';
        if (['in_review', 'completed'].includes(status)) return 'completed';
        return 'inactive';
      case 'in_review':
        if (status === 'in_review') return 'current';
        if (status === 'completed') return 'completed';
        return 'inactive';
      case 'completed':
        return status === 'completed' ? 'completed' : 'inactive';
      default:
        return 'inactive';
    }
  };

  const getStatusIcon = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed':
        return <Check className="w-4 h-4" />;
      case 'current':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      default:
        return <Circle className="w-4 h-4" />;
    }
  };

  const getStatusStyles = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed':
        return 'bg-primary text-primary-foreground border-primary';
      case 'current':
        return 'bg-primary/20 text-primary border-primary animate-pulse';
      default:
        return 'bg-muted text-muted-foreground border-muted-foreground/30';
    }
  };

  if (status === 'failed') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
        <AlertCircle className="w-6 h-6 text-destructive" />
        <div>
          <p className="font-medium text-destructive">Grading Failed</p>
          <p className="text-sm text-muted-foreground">Please contact support for assistance</p>
        </div>
      </div>
    );
  }

  if (status === 'refunded') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
        <RefreshCw className="w-6 h-6 text-amber-500" />
        <div>
          <p className="font-medium text-amber-600 dark:text-amber-400">Order Refunded</p>
          <p className="text-sm text-muted-foreground">$20 has been credited back to your wallet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span>Expected completion: 1-5 days</span>
      </div>

      <div className="relative">
        {STEPS.map((step, index) => {
          const stepStatus = getStepStatus(step.key);
          const isLast = index === STEPS.length - 1;

          return (
            <div key={step.key} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={cn(
                  'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all',
                  getStatusStyles(stepStatus)
                )}>
                  {getStatusIcon(stepStatus)}
                </div>
                {!isLast && (
                  <div className={cn(
                    'w-0.5 h-12 my-1 transition-colors',
                    stepStatus === 'completed' ? 'bg-primary' : 'bg-muted-foreground/30'
                  )} />
                )}
              </div>
              <div className="pb-8">
                <p className={cn(
                  'font-medium',
                  stepStatus === 'inactive' ? 'text-muted-foreground' : 'text-foreground'
                )}>
                  {step.label}
                </p>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
