import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeftRight, Camera, Check, X, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TradeDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tradeId: string;
}

// Mock trade detail
const MOCK_TRADE_DETAIL = {
  id: '1',
  status: 'proposed',
  partner: 'CardKing99',
  myItems: [
    { id: '1', name: 'Charizard Base Set PSA 10', value: 420000, photoVerified: false }
  ],
  theirItems: [
    { id: '2', name: 'Pikachu Illustrator PSA 9', value: 2500000, photoVerified: false }
  ],
  cashAdjustment: 2080000,
  cashFromMe: true,
  myConfirmed: false,
  theirConfirmed: false,
};

export const TradeDetailDialog = ({ open, onOpenChange, tradeId }: TradeDetailDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const trade = MOCK_TRADE_DETAIL;

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`;
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`;
    return `$${price.toLocaleString()}`;
  };

  const handleAccept = async () => {
    if (isLoading) return; // Prevent double-click
    setIsLoading(true);
    try {
      // TODO: Implement actual trade acceptance logic
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      toast.success('Trade accepted! Upload photos to proceed.');
    } catch (error) {
      console.error('Trade accept error:', error);
      toast.error('Failed to accept trade');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    if (isLoading) return; // Prevent double-click
    setIsLoading(true);
    try {
      // TODO: Implement actual trade decline logic
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      toast.success('Trade declined');
      onOpenChange(false);
    } catch (error) {
      console.error('Trade decline error:', error);
      toast.error('Failed to decline trade');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (isLoading) return; // Prevent double-click
    setIsLoading(true);
    try {
      // TODO: Implement actual trade confirm logic
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      toast.success('Trade confirmed! Waiting for partner.');
    } catch (error) {
      console.error('Trade confirm error:', error);
      toast.error('Failed to confirm trade');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" />
            Trade with {trade.partner}
          </DialogTitle>
          <DialogDescription>
            Review trade details and take action
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <span className="text-muted-foreground text-sm">Status</span>
            <Badge className="capitalize">{trade.status.replace('_', ' ')}</Badge>
          </div>

          {/* Trade Items */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* My Items */}
            <div className="border border-border rounded-lg p-4">
              <p className="text-muted-foreground text-sm mb-3">You Send</p>
              {trade.myItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between mb-2">
                  <span className="text-foreground text-sm">{item.name}</span>
                  {item.photoVerified ? (
                    <Check className="w-4 h-4 text-gain" />
                  ) : (
                    <Camera className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              ))}
              {trade.cashFromMe && trade.cashAdjustment > 0 && (
                <div className="mt-2 pt-2 border-t border-border">
                  <span className="text-loss font-medium">+ {formatPrice(trade.cashAdjustment)} cash</span>
                </div>
              )}
            </div>

            {/* Their Items */}
            <div className="border border-border rounded-lg p-4">
              <p className="text-muted-foreground text-sm mb-3">You Receive</p>
              {trade.theirItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between mb-2">
                  <span className="text-foreground text-sm">{item.name}</span>
                  {item.photoVerified ? (
                    <Check className="w-4 h-4 text-gain" />
                  ) : (
                    <Camera className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              ))}
              {!trade.cashFromMe && trade.cashAdjustment > 0 && (
                <div className="mt-2 pt-2 border-t border-border">
                  <span className="text-gain font-medium">+ {formatPrice(trade.cashAdjustment)} cash</span>
                </div>
              )}
            </div>
          </div>

          {/* Confirmation Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-2">
              <span className={cn(
                "w-3 h-3 rounded-full",
                trade.myConfirmed ? "bg-gain" : "bg-muted-foreground"
              )} />
              <span className="text-sm text-muted-foreground">You</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{trade.partner}</span>
              <span className={cn(
                "w-3 h-3 rounded-full",
                trade.theirConfirmed ? "bg-gain" : "bg-muted-foreground"
              )} />
            </div>
          </div>

          {/* Vault Info */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Package className="w-5 h-5 text-primary shrink-0" />
            <p className="text-sm text-muted-foreground">
              Items must be sent to our vault for photo verification before the trade can be completed.
            </p>
          </div>

          {/* Actions */}
          {trade.status === 'proposed' && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleDecline} disabled={isLoading}>
                <X className="w-4 h-4 mr-2" />
                Decline
              </Button>
              <Button onClick={handleAccept} disabled={isLoading}>
                <Check className="w-4 h-4 mr-2" />
                Accept Trade
              </Button>
            </div>
          )}

          {trade.status === 'pending_confirmation' && !trade.myConfirmed && (
            <div className="flex justify-end">
              <Button onClick={handleConfirm} disabled={isLoading}>
                <Check className="w-4 h-4 mr-2" />
                Confirm & Complete Trade
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
