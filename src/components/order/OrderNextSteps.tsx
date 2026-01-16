import { ArrowRight, Package, Truck, CheckCircle2, Clock, Shield, AlertTriangle, Wallet, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface OrderNextStepsProps {
  status: string;
  escrowStatus: string | null;
  isBuyer: boolean;
  isSeller: boolean;
  hasTracking: boolean;
  buyerConfirmed: boolean;
  sellerConfirmed: boolean;
  deliveryOption: string;
}

interface StepInfo {
  title: string;
  description: string;
  icon: React.ReactNode;
  actionRequired: boolean;
  timeEstimate?: string;
}

export const OrderNextSteps = ({
  status,
  escrowStatus,
  isBuyer,
  isSeller,
  hasTracking,
  buyerConfirmed,
  sellerConfirmed,
  deliveryOption,
}: OrderNextStepsProps) => {
  const getNextSteps = (): StepInfo | null => {
    // Completed states
    if (status === 'completed' || escrowStatus === 'released') {
      return {
        title: 'Transaction Complete',
        description: isSeller 
          ? 'Funds are now available in your wallet for withdrawal.'
          : 'Your card has been verified and secured. Enjoy your purchase!',
        icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
        actionRequired: false,
      };
    }

    // Refunded state
    if (status === 'refunded' || escrowStatus === 'refunded') {
      return {
        title: 'Order Refunded',
        description: isBuyer 
          ? 'Your payment has been refunded to your original payment method.'
          : 'This order has been refunded to the buyer.',
        icon: <Wallet className="w-5 h-5 text-muted-foreground" />,
        actionRequired: false,
      };
    }

    // Disputed state
    if (status === 'disputed' || escrowStatus === 'disputed') {
      return {
        title: 'Under Review',
        description: 'Our team is reviewing this dispute. You\'ll receive an update within 24-48 hours.',
        icon: <AlertTriangle className="w-5 h-5 text-destructive" />,
        actionRequired: false,
        timeEstimate: '24-48 hours',
      };
    }

    // Cancelled state
    if (status === 'cancelled') {
      return {
        title: 'Order Cancelled',
        description: isBuyer 
          ? 'This order was cancelled. If charged, you\'ll receive a refund within 3-5 business days.'
          : 'This order was cancelled.',
        icon: <AlertTriangle className="w-5 h-5 text-muted-foreground" />,
        actionRequired: false,
      };
    }

    // Both confirmed - awaiting fund release
    if (buyerConfirmed && sellerConfirmed) {
      return {
        title: 'Releasing Funds',
        description: isSeller 
          ? 'Both parties confirmed. Funds are being released to your available balance.'
          : 'Transaction verified. Funds are being released to the seller.',
        icon: <Wallet className="w-5 h-5 text-primary" />,
        actionRequired: false,
        timeEstimate: 'Momentarily',
      };
    }

    // Delivered - awaiting confirmations
    if (status === 'delivered') {
      if (isBuyer && !buyerConfirmed) {
        return {
          title: 'Confirm Receipt',
          description: 'Please confirm you received the item as described to release funds to the seller.',
          icon: <Package className="w-5 h-5 text-primary" />,
          actionRequired: true,
        };
      }
      if (isSeller && !sellerConfirmed) {
        return {
          title: 'Awaiting Buyer Confirmation',
          description: buyerConfirmed 
            ? 'Buyer has confirmed. Please confirm to complete the transaction.'
            : 'Waiting for the buyer to confirm receipt. You\'ll be notified when confirmed.',
          icon: <Clock className="w-5 h-5 text-amber-500" />,
          actionRequired: buyerConfirmed,
        };
      }
    }

    // Shipped - in transit
    if (status === 'shipped') {
      if (deliveryOption === 'vault') {
        return {
          title: 'In Transit to Verification',
          description: isSeller 
            ? 'Your card is on the way for verification. You\'ll be notified once received.'
            : 'Card is being shipped for verification. This usually takes 3-5 business days.',
          icon: <Truck className="w-5 h-5 text-primary" />,
          actionRequired: false,
          timeEstimate: '3-5 business days',
        };
      }
      return {
        title: 'In Transit',
        description: isBuyer 
          ? 'Your item is on the way. Track shipping using the provided tracking number.'
          : 'Item shipped. The buyer will confirm once received.',
        icon: <Truck className="w-5 h-5 text-primary" />,
        actionRequired: false,
      };
    }

    // Paid - awaiting shipment
    if (status === 'paid' || status === 'processing') {
      if (isSeller) {
        return {
          title: 'Ship Within 72 Hours',
          description: hasTracking 
            ? 'Tracking added. Mark as shipped to notify the buyer.'
            : 'Please ship the item and add tracking information to proceed.',
          icon: <Package className="w-5 h-5 text-amber-500" />,
          actionRequired: true,
          timeEstimate: '72 hours deadline',
        };
      }
      return {
        title: 'Awaiting Shipment',
        description: 'Your payment is secured. The seller will ship your item within 72 hours.',
        icon: <Clock className="w-5 h-5 text-primary" />,
        actionRequired: false,
        timeEstimate: 'Up to 72 hours',
      };
    }

    // Pending payment
    if (status === 'pending') {
      return {
        title: 'Payment Pending',
        description: isBuyer 
          ? 'Complete payment to proceed with your order.'
          : 'Waiting for buyer to complete payment.',
        icon: <Clock className="w-5 h-5 text-amber-500" />,
        actionRequired: isBuyer,
      };
    }

    return null;
  };

  const stepInfo = getNextSteps();

  if (!stepInfo) return null;

  return (
    <Card className={`border-l-4 ${stepInfo.actionRequired ? 'border-l-primary bg-primary/5' : 'border-l-muted-foreground/30'}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            {stepInfo.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-foreground">{stepInfo.title}</h4>
              {stepInfo.actionRequired && (
                <Badge variant="default" className="text-xs">
                  Action Required
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{stepInfo.description}</p>
            {stepInfo.timeEstimate && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {stepInfo.timeEstimate}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
