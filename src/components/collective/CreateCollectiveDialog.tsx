import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Sparkles, Shield, Info, Vote, Users, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useCurrency } from "@/contexts/CurrencyContext";

interface CreateCollectiveDialogProps {
  listingId?: string;
  marketItemId?: string;
  itemName: string;
  totalValue: number;
  imageUrl?: string;
}

export function CreateCollectiveDialog({ 
  listingId, 
  marketItemId, 
  itemName, 
  totalValue,
  imageUrl 
}: CreateCollectiveDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [totalUnits, setTotalUnits] = useState(100);
  const [minUnits, setMinUnits] = useState(10);
  const [dailyVerification, setDailyVerification] = useState(true);
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();

  const unitPrice = totalValue / totalUnits;
  const minParticipation = unitPrice * minUnits;

  const handleCreate = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to create a Collective");
        navigate("/auth");
        return;
      }

      const { error } = await supabase
        .from("fractional_listings")
        .insert({
          listing_id: listingId || null,
          market_item_id: marketItemId || null,
          total_shares: totalUnits,
          available_shares: totalUnits,
          share_price: unitPrice,
          min_shares: minUnits,
          daily_verification_required: dailyVerification,
          owner_id: user.id,
          next_verification_due: dailyVerification ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
        });

      if (error) throw error;

      toast.success("Collective created! Community members can now join.");
      setOpen(false);
    } catch (error: any) {
      console.error("Error creating collective:", error);
      toast.error(error.message || "Failed to create Collective");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Enable Collective
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create CardBoom COLLECTIVE™
          </DialogTitle>
          <DialogDescription>
            Allow community members to participate in {itemName}
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

          {/* Total Units */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Total Collective Units</Label>
              <span className="text-sm text-muted-foreground">{totalUnits} units</span>
            </div>
            <Slider
              value={[totalUnits]}
              onValueChange={([value]) => setTotalUnits(value)}
              min={10}
              max={1000}
              step={10}
            />
            <p className="text-sm text-muted-foreground">
              Each unit = {formatPrice(unitPrice)} ({(100/totalUnits).toFixed(2)}% participation)
            </p>
          </div>

          {/* Minimum Participation */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Minimum Participation</Label>
              <span className="text-sm text-muted-foreground">{minUnits} units ({(minUnits/totalUnits*100).toFixed(1)}%)</span>
            </div>
            <Slider
              value={[minUnits]}
              onValueChange={([value]) => setMinUnits(value)}
              min={1}
              max={Math.min(100, totalUnits)}
              step={1}
            />
            <p className="text-sm text-muted-foreground">
              Minimum to join: {formatPrice(minParticipation)}
            </p>
          </div>

          {/* Daily Verification */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <Label className="text-base">Daily Verification</Label>
                <p className="text-sm text-muted-foreground">
                  Upload daily photos to verify item condition
                </p>
              </div>
            </div>
            <Switch
              checked={dailyVerification}
              onCheckedChange={setDailyVerification}
            />
          </div>

          {/* Participation Rights Info */}
          <div className="flex gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">Collective participants receive:</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Vote className="h-4 w-4 text-primary" />
                  Community voting rights
                </li>
                <li className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" />
                  XP rewards & badge eligibility
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Exclusive community access
                </li>
              </ul>
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Item Value</span>
              <span>{formatPrice(totalValue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Units</span>
              <span>{totalUnits}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Price per Unit</span>
              <span>{formatPrice(unitPrice)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Min Participation</span>
              <span>{formatPrice(minParticipation)}</span>
            </div>
          </div>

          {/* Legal Disclaimer */}
          <p className="text-[10px] text-muted-foreground text-center">
            Collective Units are non-financial digital participation rights. They do not represent ownership, equity, investment products, or entitlement to financial returns or profit distribution.
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading} className="flex-1">
            {loading ? "Creating..." : "Create Collective"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
