import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Shield, Vote, Clock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { CollectiveJoinDialog } from "./CollectiveJoinDialog";
import { CollectiveVerificationDialog } from "./CollectiveVerificationDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface CollectiveCardProps {
  listingId?: string;
  marketItemId?: string;
  isOwner?: boolean;
}

export function CollectiveCard({ listingId, marketItemId, isOwner }: CollectiveCardProps) {
  const { formatPrice } = useCurrency();

  const { data: collectiveListing, isLoading, refetch } = useQuery({
    queryKey: ["collective-listing", listingId, marketItemId],
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

  const { data: participants } = useQuery({
    queryKey: ["collective-participants", collectiveListing?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fractional_ownership")
        .select("user_id, shares_owned")
        .eq("fractional_listing_id", collectiveListing?.id ?? '');

      if (error) throw error;
      return data;
    },
    enabled: !!collectiveListing?.id,
  });

  const { data: verifications } = useQuery({
    queryKey: ["collective-verifications", collectiveListing?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fractional_verifications")
        .select("*")
        .eq("fractional_listing_id", collectiveListing?.id ?? '')
        .order("verified_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!collectiveListing?.id,
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

  if (!collectiveListing) {
    return null;
  }

  const claimedUnits = collectiveListing.total_shares - collectiveListing.available_shares;
  const claimedPercent = (claimedUnits / collectiveListing.total_shares) * 100;
  const participantCount = participants?.length || 0;

  const isVerificationOverdue = collectiveListing.daily_verification_required && 
    collectiveListing.last_verified_at &&
    new Date().getTime() - new Date(collectiveListing.last_verified_at).getTime() > 24 * 60 * 60 * 1000;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            CardBoom COLLECTIVE™
          </div>
          {collectiveListing.daily_verification_required && (
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
            <p className="text-2xl font-bold">{formatPrice(collectiveListing.share_price)}</p>
            <p className="text-xs text-muted-foreground">Per Unit</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{collectiveListing.available_shares}</p>
            <p className="text-xs text-muted-foreground">Available</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{participantCount}</p>
            <p className="text-xs text-muted-foreground">Participants</p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Participation Progress</span>
            <span className="font-medium">{claimedPercent.toFixed(0)}% Claimed</span>
          </div>
          <Progress value={claimedPercent} className="h-3" />
        </div>

        {/* Rights Info */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <p className="text-sm font-medium">Minimum Participation</p>
            <p className="text-xs text-muted-foreground">
              {collectiveListing.min_shares} units ({((collectiveListing.min_shares / collectiveListing.total_shares) * 100).toFixed(1)}%)
            </p>
          </div>
          <p className="text-lg font-bold text-primary">
            {formatPrice(collectiveListing.min_shares * collectiveListing.share_price)}
          </p>
        </div>

        {/* Features - Participation Rights */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1">
            <Users className="h-3 w-3" />
            {participantCount} Members
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Vote className="h-3 w-3" />
            Voting Rights
          </Badge>
          {collectiveListing.daily_verification_required && (
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
            <CollectiveVerificationDialog
              collectiveListingId={collectiveListing.id}
              itemName={collectiveListing.listing?.title || collectiveListing.market_item?.name || "Item"}
              lastVerifiedAt={collectiveListing.last_verified_at || undefined}
              onVerified={() => refetch()}
            />
          ) : (
            <CollectiveJoinDialog collectiveListing={collectiveListing} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
