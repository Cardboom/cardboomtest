import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PieChart, Users, Shield, TrendingUp, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { FractionalBuyDialog } from "./FractionalBuyDialog";
import { FractionalVerificationDialog } from "./FractionalVerificationDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface FractionalOwnershipCardProps {
  listingId?: string;
  marketItemId?: string;
  isOwner?: boolean;
}

export function FractionalOwnershipCard({ listingId, marketItemId, isOwner }: FractionalOwnershipCardProps) {
  const { formatPrice } = useCurrency();

  const { data: fractionalListing, isLoading, refetch } = useQuery({
    queryKey: ["fractional-listing", listingId, marketItemId],
    queryFn: async () => {
      let query = supabase
        .from("fractional_listings")
        .select(`
          *,
          listing:listings(title, image_url, price),
          market_item:market_items(name, image_url, current_price)
        `)
        .eq("status", "active");

      if (listingId) {
        query = query.eq("listing_id", listingId);
      } else if (marketItemId) {
        query = query.eq("market_item_id", marketItemId);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!(listingId || marketItemId),
  });

  const { data: owners } = useQuery({
    queryKey: ["fractional-owners", fractionalListing?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fractional_ownership")
        .select("user_id, shares_owned")
        .eq("fractional_listing_id", fractionalListing!.id);

      if (error) throw error;
      return data;
    },
    enabled: !!fractionalListing?.id,
  });

  const { data: verifications } = useQuery({
    queryKey: ["fractional-verifications", fractionalListing?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fractional_verifications")
        .select("*")
        .eq("fractional_listing_id", fractionalListing!.id)
        .order("verified_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!fractionalListing?.id,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!fractionalListing) {
    return null;
  }

  const soldShares = fractionalListing.total_shares - fractionalListing.available_shares;
  const soldPercent = (soldShares / fractionalListing.total_shares) * 100;
  const totalValue = fractionalListing.share_price * fractionalListing.total_shares;
  const ownerCount = owners?.length || 0;

  const isVerificationOverdue = fractionalListing.daily_verification_required && 
    fractionalListing.last_verified_at &&
    new Date().getTime() - new Date(fractionalListing.last_verified_at).getTime() > 24 * 60 * 60 * 1000;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            Fractional Ownership
          </div>
          {fractionalListing.daily_verification_required && (
            <Badge variant={isVerificationOverdue ? "destructive" : "secondary"} className="gap-1">
              <Shield className="h-3 w-3" />
              {isVerificationOverdue ? "Verification Overdue" : "Verified"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{formatPrice(fractionalListing.share_price)}</p>
            <p className="text-xs text-muted-foreground">Per Share</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{fractionalListing.available_shares}</p>
            <p className="text-xs text-muted-foreground">Available</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{ownerCount}</p>
            <p className="text-xs text-muted-foreground">Owners</p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Funding Progress</span>
            <span className="font-medium">{soldPercent.toFixed(0)}% Sold</span>
          </div>
          <Progress value={soldPercent} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatPrice(soldShares * fractionalListing.share_price)} raised</span>
            <span>{formatPrice(totalValue)} goal</span>
          </div>
        </div>

        {/* Min Investment */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <p className="text-sm font-medium">Minimum Investment</p>
            <p className="text-xs text-muted-foreground">
              {fractionalListing.min_shares} shares ({((fractionalListing.min_shares / fractionalListing.total_shares) * 100).toFixed(1)}%)
            </p>
          </div>
          <p className="text-lg font-bold text-primary">
            {formatPrice(fractionalListing.min_shares * fractionalListing.share_price)}
          </p>
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1">
            <Users className="h-3 w-3" />
            {ownerCount} Co-owners
          </Badge>
          <Badge variant="outline" className="gap-1">
            <TrendingUp className="h-3 w-3" />
            Tradeable Shares
          </Badge>
          {fractionalListing.daily_verification_required && (
            <Badge variant="outline" className="gap-1">
              <Shield className="h-3 w-3" />
              Daily Verified
            </Badge>
          )}
        </div>

        {/* Verification History */}
        {verifications && verifications.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Recent Verifications</p>
            <div className="space-y-1">
              {verifications.slice(0, 3).map((v) => (
                <div key={v.id} className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(v.verified_at), { addSuffix: true })}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {v.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {isOwner ? (
            <FractionalVerificationDialog
              fractionalListingId={fractionalListing.id}
              itemName={fractionalListing.listing?.title || fractionalListing.market_item?.name || "Item"}
              lastVerifiedAt={fractionalListing.last_verified_at || undefined}
              onVerified={() => refetch()}
            />
          ) : (
            <FractionalBuyDialog fractionalListing={fractionalListing} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
