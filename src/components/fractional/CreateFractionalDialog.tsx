import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { PieChart, Shield, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useCurrency } from "@/contexts/CurrencyContext";

interface CreateFractionalDialogProps {
  listingId?: string;
  marketItemId?: string;
  itemName: string;
  totalValue: number;
  imageUrl?: string;
}

export function CreateFractionalDialog({ 
  listingId, 
  marketItemId, 
  itemName, 
  totalValue,
  imageUrl 
}: CreateFractionalDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [totalShares, setTotalShares] = useState(100);
  const [minShares, setMinShares] = useState(10);
  const [dailyVerification, setDailyVerification] = useState(true);
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();

  const sharePrice = totalValue / totalShares;
  const minInvestment = sharePrice * minShares;

  const handleCreate = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to create a fractional listing");
        navigate("/auth");
        return;
      }

      const { error } = await supabase
        .from("fractional_listings")
        .insert({
          listing_id: listingId || null,
          market_item_id: marketItemId || null,
          total_shares: totalShares,
          available_shares: totalShares,
          share_price: sharePrice,
          min_shares: minShares,
          daily_verification_required: dailyVerification,
          owner_id: user.id,
          next_verification_due: dailyVerification ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
        });

      if (error) throw error;

      toast.success("Fractional listing created! Buyers can now purchase shares.");
      setOpen(false);
    } catch (error: any) {
      console.error("Error creating fractional listing:", error);
      toast.error(error.message || "Failed to create fractional listing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <PieChart className="h-4 w-4" />
          Enable Fractional Buying
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            Create Fractional Listing
          </DialogTitle>
          <DialogDescription>
            Allow buyers to purchase shares of {itemName}
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
              <p className="text-lg font-bold text-primary">{formatPrice(totalValue)}</p>
            </div>
          </div>

          {/* Total Shares */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Total Shares</Label>
              <span className="text-sm text-muted-foreground">{totalShares} shares</span>
            </div>
            <Slider
              value={[totalShares]}
              onValueChange={([value]) => setTotalShares(value)}
              min={10}
              max={1000}
              step={10}
            />
            <p className="text-sm text-muted-foreground">
              Each share = {formatPrice(sharePrice)} ({(100/totalShares).toFixed(2)}% ownership)
            </p>
          </div>

          {/* Minimum Purchase */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Minimum Purchase</Label>
              <span className="text-sm text-muted-foreground">{minShares} shares ({(minShares/totalShares*100).toFixed(1)}%)</span>
            </div>
            <Slider
              value={[minShares]}
              onValueChange={([value]) => setMinShares(value)}
              min={1}
              max={Math.min(100, totalShares)}
              step={1}
            />
            <p className="text-sm text-muted-foreground">
              Minimum investment: {formatPrice(minInvestment)}
            </p>
          </div>

          {/* Daily Verification */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <Label className="text-base">Daily Verification</Label>
                <p className="text-sm text-muted-foreground">
                  Upload daily photos to verify you still own the item
                </p>
              </div>
            </div>
            <Switch
              checked={dailyVerification}
              onCheckedChange={setDailyVerification}
            />
          </div>

          {/* Info Box */}
          <div className="flex gap-3 p-4 rounded-lg bg-blue-500/10">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">How it works:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Buyers purchase shares of your item</li>
                <li>You retain physical possession</li>
                <li>Daily verification builds trust</li>
                <li>Sell when fully funded or keep partial ownership</li>
              </ul>
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Value</span>
              <span>{formatPrice(totalValue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Number of Shares</span>
              <span>{totalShares}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Price per Share</span>
              <span>{formatPrice(sharePrice)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Min Investment</span>
              <span>{formatPrice(minInvestment)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading} className="flex-1">
            {loading ? "Creating..." : "Create Fractional Listing"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
