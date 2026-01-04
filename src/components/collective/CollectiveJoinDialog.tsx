import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Vote, Shield, Clock, Sparkles, Star, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useCurrency } from "@/contexts/CurrencyContext";

interface CollectiveJoinDialogProps {
  collectiveListing: {
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

export function CollectiveJoinDialog({ collectiveListing }: CollectiveJoinDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unitsToJoin, setUnitsToJoin] = useState(collectiveListing.min_shares);
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();

  const itemName = collectiveListing.listing?.title || collectiveListing.market_item?.name || "Unknown Item";
  const imageUrl = collectiveListing.listing?.image_url || collectiveListing.market_item?.image_url;
  const participationPercent = (unitsToJoin / collectiveListing.total_shares) * 100;
  const totalCost = unitsToJoin * collectiveListing.share_price;
  const claimedPercent = ((collectiveListing.total_shares - collectiveListing.available_shares) / collectiveListing.total_shares) * 100;

  const handleJoin = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to join this Collective");
        navigate("/auth");
        return;
      }

      if (unitsToJoin > collectiveListing.available_shares) {
        toast.error("Not enough units available");
        return;
      }

      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("id, balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (walletError) throw walletError;

      if (!wallet) {
        toast.error("Wallet not found. Please contact support.");
        return;
      }

      if (Number(wallet.balance) < totalCost) {
        toast.error(`Insufficient balance. You need ${formatPrice(totalCost)} but have ${formatPrice(Number(wallet.balance))}`);
        navigate("/wallet");
        return;
      }

      const newBalance = Number(wallet.balance) - totalCost;
      const { error: walletUpdateError } = await supabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("id", wallet.id);

      if (walletUpdateError) throw walletUpdateError;

      await supabase.from("transactions").insert({
        wallet_id: wallet.id,
        type: "purchase",
        amount: -totalCost,
        description: `Collective participation: ${unitsToJoin} units of ${itemName}`,
      });

      const { error: ownershipError } = await supabase
        .from("fractional_ownership")
        .insert({
          fractional_listing_id: collectiveListing.id,
          user_id: user.id,
          shares_owned: unitsToJoin,
          purchase_price_per_share: collectiveListing.share_price,
          total_invested: totalCost,
        });

      if (ownershipError) throw ownershipError;

      const { error: updateError } = await supabase
        .from("fractional_listings")
        .update({
          available_shares: collectiveListing.available_shares - unitsToJoin,
        })
        .eq("id", collectiveListing.id);

      if (updateError) throw updateError;

      toast.success(`Welcome to the Collective! You now have ${unitsToJoin} participation units.`);
      setOpen(false);
    } catch (error: any) {
      console.error("Error joining collective:", error);
      toast.error(error.message || "Failed to join Collective");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="gap-2 w-full">
          <Sparkles className="h-4 w-4" />
          Join Collective
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            CardBoom COLLECTIVE™
          </DialogTitle>
          <DialogDescription>
            Join this Collective and gain participation rights for {itemName}
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
                {formatPrice(collectiveListing.share_price)} per unit
              </p>
            </div>
          </div>

          {/* Participation Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Community Progress</span>
              <span className="font-medium">{claimedPercent.toFixed(0)}%</span>
            </div>
            <Progress value={claimedPercent} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{collectiveListing.total_shares - collectiveListing.available_shares} units claimed</span>
              <span>{collectiveListing.available_shares} available</span>
            </div>
          </div>

          {/* Unit Selector */}
          <div className="space-y-4">
            <Label>Collective Units</Label>
            <Slider
              value={[unitsToJoin]}
              onValueChange={([value]) => setUnitsToJoin(value)}
              min={collectiveListing.min_shares}
              max={Math.min(collectiveListing.available_shares, 100)}
              step={1}
              className="py-4"
            />
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={unitsToJoin}
                onChange={(e) => setUnitsToJoin(Math.min(Math.max(parseInt(e.target.value) || collectiveListing.min_shares, collectiveListing.min_shares), collectiveListing.available_shares))}
                min={collectiveListing.min_shares}
                max={collectiveListing.available_shares}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">{participationPercent.toFixed(1)}% participation</span>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unit Price</span>
              <span>{formatPrice(collectiveListing.share_price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantity</span>
              <span>{unitsToJoin} units</span>
            </div>
            <div className="border-t pt-3 flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-primary">{formatPrice(totalCost)}</span>
            </div>
          </div>

          {/* Participation Rights */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="font-medium text-sm mb-3">Your Participation Rights:</p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Vote className="h-4 w-4 text-primary" />
                <span>Community voting</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Star className="h-4 w-4 text-primary" />
                <span>XP & badge eligibility</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4 text-primary" />
                <span>Community access</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Trophy className="h-4 w-4 text-primary" />
                <span>Gamified rewards</span>
              </div>
            </div>
          </div>

          {/* Verification Status */}
          {collectiveListing.daily_verification_required && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm">Daily Verified</span>
              </div>
              <Badge variant="secondary">
                {collectiveListing.last_verified_at 
                  ? `Last verified ${new Date(collectiveListing.last_verified_at).toLocaleDateString()}`
                  : "Pending first verification"
                }
              </Badge>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-[10px] text-muted-foreground text-center">
            Collective Units are non-financial digital participation rights. They do not represent ownership, equity, or entitlement to financial returns.
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleJoin} disabled={loading} className="flex-1">
            {loading ? "Joining..." : `Join with ${unitsToJoin} Units`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
