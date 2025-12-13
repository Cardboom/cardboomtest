import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PieChart, Users, TrendingUp, Shield, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useCurrency } from "@/contexts/CurrencyContext";

interface FractionalBuyDialogProps {
  fractionalListing: {
    id: string;
    share_price: number;
    available_shares: number;
    total_shares: number;
    min_shares: number;
    daily_verification_required: boolean;
    last_verified_at?: string;
    listing?: {
      title: string;
      image_url?: string;
    };
    market_item?: {
      name: string;
      image_url?: string;
    };
  };
}

export function FractionalBuyDialog({ fractionalListing }: FractionalBuyDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sharesToBuy, setSharesToBuy] = useState(fractionalListing.min_shares);
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();

  const itemName = fractionalListing.listing?.title || fractionalListing.market_item?.name || "Unknown Item";
  const imageUrl = fractionalListing.listing?.image_url || fractionalListing.market_item?.image_url;
  const ownershipPercent = (sharesToBuy / fractionalListing.total_shares) * 100;
  const totalCost = sharesToBuy * fractionalListing.share_price;
  const soldPercent = ((fractionalListing.total_shares - fractionalListing.available_shares) / fractionalListing.total_shares) * 100;

  const handleBuy = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to buy shares");
        navigate("/auth");
        return;
      }

      // Check if enough shares available
      if (sharesToBuy > fractionalListing.available_shares) {
        toast.error("Not enough shares available");
        return;
      }

      // Create ownership record
      const { error: ownershipError } = await supabase
        .from("fractional_ownership")
        .insert({
          fractional_listing_id: fractionalListing.id,
          user_id: user.id,
          shares_owned: sharesToBuy,
          purchase_price_per_share: fractionalListing.share_price,
          total_invested: totalCost,
        });

      if (ownershipError) throw ownershipError;

      // Update available shares
      const { error: updateError } = await supabase
        .from("fractional_listings")
        .update({
          available_shares: fractionalListing.available_shares - sharesToBuy,
        })
        .eq("id", fractionalListing.id);

      if (updateError) throw updateError;

      toast.success(`Successfully purchased ${sharesToBuy} shares (${ownershipPercent.toFixed(1)}% ownership)!`);
      setOpen(false);
    } catch (error: any) {
      console.error("Error buying shares:", error);
      toast.error(error.message || "Failed to buy shares");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="gap-2">
          <PieChart className="h-4 w-4" />
          Buy Shares
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            Fractional Ownership
          </DialogTitle>
          <DialogDescription>
            Buy a fraction of this collectible. Own {ownershipPercent.toFixed(1)}% of {itemName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Item Preview */}
          <div className="flex gap-4 items-center p-3 rounded-lg bg-muted/50">
            {imageUrl && (
              <img src={imageUrl} alt={itemName} className="h-16 w-16 rounded-lg object-cover" />
            )}
            <div className="flex-1">
              <p className="font-medium">{itemName}</p>
              <p className="text-sm text-muted-foreground">
                {formatPrice(fractionalListing.share_price)} per share
              </p>
            </div>
          </div>

          {/* Ownership Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sold</span>
              <span className="font-medium">{soldPercent.toFixed(0)}%</span>
            </div>
            <Progress value={soldPercent} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{fractionalListing.total_shares - fractionalListing.available_shares} shares sold</span>
              <span>{fractionalListing.available_shares} available</span>
            </div>
          </div>

          {/* Share Selector */}
          <div className="space-y-4">
            <Label>Number of Shares</Label>
            <Slider
              value={[sharesToBuy]}
              onValueChange={([value]) => setSharesToBuy(value)}
              min={fractionalListing.min_shares}
              max={Math.min(fractionalListing.available_shares, 100)}
              step={1}
              className="py-4"
            />
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={sharesToBuy}
                onChange={(e) => setSharesToBuy(Math.min(Math.max(parseInt(e.target.value) || fractionalListing.min_shares, fractionalListing.min_shares), fractionalListing.available_shares))}
                min={fractionalListing.min_shares}
                max={fractionalListing.available_shares}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">shares = {ownershipPercent.toFixed(1)}% ownership</span>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Share Price</span>
              <span>{formatPrice(fractionalListing.share_price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantity</span>
              <span>{sharesToBuy} shares</span>
            </div>
            <div className="border-t pt-3 flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-primary">{formatPrice(totalCost)}</span>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Co-owned with others</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>Trade your shares</span>
            </div>
            {fractionalListing.daily_verification_required && (
              <>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>Daily verification</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Verified ownership</span>
                </div>
              </>
            )}
          </div>

          {/* Verification Status */}
          {fractionalListing.daily_verification_required && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                <span className="text-sm">Daily Verified</span>
              </div>
              <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                {fractionalListing.last_verified_at 
                  ? `Last verified ${new Date(fractionalListing.last_verified_at).toLocaleDateString()}`
                  : "Pending first verification"
                }
              </Badge>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleBuy} disabled={loading} className="flex-1">
            {loading ? "Processing..." : `Buy ${sharesToBuy} Shares`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
