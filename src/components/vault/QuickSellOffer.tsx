import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  Zap, 
  BadgeDollarSign, 
  Shield, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Sparkles,
  ArrowRight,
  TrendingDown
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/contexts/CurrencyContext';

interface QuickSellOfferProps {
  vaultItemId: string;
  itemTitle: string;
  marketPrice: number; // in USD
  imageUrl?: string;
  category: string;
  onAccept?: () => void;
  onDecline?: () => void;
  compact?: boolean;
}

const QUICK_SELL_PERCENTAGE = 0.60; // 60% of market value

export const QuickSellOffer = ({
  vaultItemId,
  itemTitle,
  marketPrice,
  imageUrl,
  category,
  onAccept,
  onDecline,
  compact = false,
}: QuickSellOfferProps) => {
  const { formatPrice } = useCurrency();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const offerPrice = marketPrice * QUICK_SELL_PERCENTAGE;
  const savings = marketPrice - offerPrice;

  const handleAcceptOffer = async () => {
    setAccepting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to accept this offer');
        return;
      }

      // Create a quick sell order record
      const { error: orderError } = await supabase
        .from('quick_sell_offers')
        .insert({
          vault_item_id: vaultItemId,
          user_id: session.user.id,
          market_price: marketPrice,
          offer_price: offerPrice,
          status: 'pending_review',
        });

      if (orderError) throw orderError;

      // Update vault item status to indicate quick sell pending
      const { error: updateError } = await supabase
        .from('vault_items')
        .update({ 
          quick_sell_requested: true,
          quick_sell_offer_price: offerPrice,
        })
        .eq('id', vaultItemId);

      if (updateError) throw updateError;

      // Notify admins
      await supabase.from('notifications').insert({
        user_id: session.user.id, // Will be replaced with admin notification system
        type: 'quick_sell_request',
        title: '💰 Quick Sell Request',
        body: `User requested Quick Sell for "${itemTitle}" at ${formatPrice(offerPrice)}`,
        data: { vault_item_id: vaultItemId, offer_price: offerPrice },
      });

      toast.success('Quick Sell request submitted! We\'ll process your payment within 24 hours.');
      setShowConfirmDialog(false);
      onAccept?.();
    } catch (error) {
      console.error('Error accepting quick sell:', error);
      toast.error('Failed to submit quick sell request');
    } finally {
      setAccepting(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium">Quick Sell Available</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-amber-600">{formatPrice(offerPrice)}</span>
          <Button size="sm" variant="outline" onClick={() => setShowConfirmDialog(true)}>
            View Offer
          </Button>
        </div>

        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Quick Sell Offer
              </DialogTitle>
              <DialogDescription>
                Sell instantly to CardBoom at 60% market value
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {imageUrl && (
                <div className="aspect-[3/4] max-h-40 mx-auto rounded-lg overflow-hidden bg-muted">
                  <img src={imageUrl} alt={itemTitle} className="w-full h-full object-contain" />
                </div>
              )}

              <div className="text-center">
                <h4 className="font-semibold">{itemTitle}</h4>
                <Badge variant="outline" className="mt-1">{category}</Badge>
              </div>

              <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Market Price</span>
                  <span className="line-through text-muted-foreground">{formatPrice(marketPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    Our Offer (60%)
                  </span>
                  <span className="text-lg font-bold text-amber-600">{formatPrice(offerPrice)}</span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4 text-primary" />
                  Payment within 24 hours
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="w-4 h-4 text-primary" />
                  No fees, no hassle
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BadgeDollarSign className="w-4 h-4 text-primary" />
                  Direct to your wallet
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Quick Sell offers 60% of market value for instant liquidity. 
                    You can get more by listing on the marketplace, but Quick Sell is faster and guaranteed.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)} className="flex-1">
                Maybe Later
              </Button>
              <Button 
                onClick={handleAcceptOffer} 
                disabled={accepting}
                className="flex-1 gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                {accepting ? (
                  'Processing...'
                ) : (
                  <>
                    Accept {formatPrice(offerPrice)}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Zap className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Quick Sell
                <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Instant Cash
                </Badge>
              </CardTitle>
              <CardDescription>Sell to CardBoom at 60% market value</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border/50">
          <div>
            <p className="text-sm text-muted-foreground">Our Offer</p>
            <p className="text-2xl font-bold text-amber-600">{formatPrice(offerPrice)}</p>
            <p className="text-xs text-muted-foreground line-through">{formatPrice(marketPrice)} market</p>
          </div>
          <Button 
            onClick={() => setShowConfirmDialog(true)}
            className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            <Zap className="w-4 h-4" />
            Sell Now
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 rounded-lg bg-muted/50">
            <Clock className="w-4 h-4 mx-auto mb-1 text-primary" />
            <span className="text-muted-foreground">24h Payment</span>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <Shield className="w-4 h-4 mx-auto mb-1 text-primary" />
            <span className="text-muted-foreground">No Fees</span>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <CheckCircle className="w-4 h-4 mx-auto mb-1 text-primary" />
            <span className="text-muted-foreground">Guaranteed</span>
          </div>
        </div>
      </CardContent>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Confirm Quick Sell
            </DialogTitle>
            <DialogDescription>
              You're about to sell this item to CardBoom
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {imageUrl && (
              <div className="aspect-[3/4] max-h-40 mx-auto rounded-lg overflow-hidden bg-muted">
                <img src={imageUrl} alt={itemTitle} className="w-full h-full object-contain" />
              </div>
            )}

            <div className="text-center">
              <h4 className="font-semibold">{itemTitle}</h4>
              <Badge variant="outline" className="mt-1">{category}</Badge>
            </div>

            <div className="space-y-2 p-4 rounded-lg bg-muted/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Market Price</span>
                <span className="line-through text-muted-foreground">{formatPrice(marketPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">You Receive</span>
                <span className="text-xl font-bold text-amber-600">{formatPrice(offerPrice)}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-gain/10 border border-gain/20">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-gain" />
                <p className="text-sm text-gain font-medium">
                  Funds will be added to your wallet within 24 hours
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleAcceptOffer} 
              disabled={accepting}
              className="flex-1 gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              {accepting ? (
                'Processing...'
              ) : (
                <>
                  Confirm Sale
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

// Teaser component for listing/vault pages
export const QuickSellTeaser = ({ className }: { className?: string }) => {
  return (
    <Card className={`border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-orange-500/5 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 shrink-0">
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              Quick Sell Available
              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                60% Value
              </Badge>
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              Send your card to the Vault. Once verified, get an instant cash offer at 60% of market value — 
              paid within 24 hours, no listing required.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
