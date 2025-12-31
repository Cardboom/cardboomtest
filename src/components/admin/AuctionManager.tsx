import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { 
  Gavel, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye,
  AlertTriangle,
  Timer,
  DollarSign,
  Users,
  TrendingUp
} from "lucide-react";

interface Auction {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  category: string;
  condition: string;
  starting_price: number;
  current_bid: number | null;
  reserve_price: number | null;
  buy_now_price: number | null;
  bid_increment: number;
  bid_count: number;
  seller_id: string;
  highest_bidder_id: string | null;
  winner_id: string | null;
  status: string;
  starts_at: string;
  ends_at: string;
  final_price: number | null;
  created_at: string;
  seller?: {
    display_name: string;
    email: string;
  };
  highest_bidder?: {
    display_name: string;
  };
}

interface AuctionBid {
  id: string;
  auction_id: string;
  bidder_id: string;
  amount: number;
  is_winning: boolean;
  created_at: string;
  bidder?: {
    display_name: string;
    email: string;
  };
}

export function AuctionManager() {
  const queryClient = useQueryClient();
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [bidsForAuction, setBidsForAuction] = useState<AuctionBid[]>([]);
  const [showBids, setShowBids] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: auctions = [], isLoading } = useQuery({
    queryKey: ["admin-auctions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auctions")
        .select(`*`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Auction[];
    },
  });

  const fetchBids = async (auctionId: string) => {
    const { data, error } = await supabase
      .from("auction_bids")
      .select(`*`)
      .eq("auction_id", auctionId)
      .order("amount", { ascending: false });

    if (error) {
      toast.error("Failed to fetch bids");
      return;
    }

    setBidsForAuction((data || []) as AuctionBid[]);
    setShowBids(true);
  };

  const cancelAuctionMutation = useMutation({
    mutationFn: async ({ auctionId, reason }: { auctionId: string; reason: string }) => {
      const { error } = await supabase
        .from("auctions")
        .update({ status: "cancelled" })
        .eq("id", auctionId);

      if (error) throw error;

      // Log admin action
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("admin_audit_log").insert({
          admin_id: user.id,
          action: "cancel_auction",
          target_type: "auction",
          target_id: auctionId,
          details: { reason },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-auctions"] });
      toast.success("Auction cancelled");
      setShowCancelDialog(false);
      setSelectedAuction(null);
      setCancelReason("");
    },
    onError: (error) => {
      toast.error("Failed to cancel auction: " + error.message);
    },
  });

  const endAuctionEarlyMutation = useMutation({
    mutationFn: async (auctionId: string) => {
      const auction = auctions.find((a) => a.id === auctionId);
      if (!auction) throw new Error("Auction not found");

      const { error } = await supabase
        .from("auctions")
        .update({
          status: "ended",
          ends_at: new Date().toISOString(),
          winner_id: auction.highest_bidder_id,
          final_price: auction.current_bid,
        })
        .eq("id", auctionId);

      if (error) throw error;

      // Log admin action
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("admin_audit_log").insert({
          admin_id: user.id,
          action: "end_auction_early",
          target_type: "auction",
          target_id: auctionId,
          details: { final_price: auction.current_bid },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-auctions"] });
      toast.success("Auction ended early");
    },
    onError: (error) => {
      toast.error("Failed to end auction: " + error.message);
    },
  });

  const getStatusBadge = (status: string, endsAt: string) => {
    const isEnded = new Date(endsAt) < new Date();
    
    if (status === "active" && !isEnded) {
      return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30"><Clock className="w-3 h-3 mr-1" />Live</Badge>;
    }
    
    switch (status) {
      case "active":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"><Timer className="w-3 h-3 mr-1" />Ending</Badge>;
      case "ended":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30"><CheckCircle className="w-3 h-3 mr-1" />Ended</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      case "pending":
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredAuctions = auctions.filter((a) => {
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    const matchesSearch = !searchQuery || 
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.seller?.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: auctions.length,
    active: auctions.filter((a) => a.status === "active" && new Date(a.ends_at) > new Date()).length,
    ending: auctions.filter((a) => {
      const endsAt = new Date(a.ends_at);
      const now = new Date();
      const hourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      return a.status === "active" && endsAt > now && endsAt < hourFromNow;
    }).length,
    totalBids: auctions.reduce((sum, a) => sum + a.bid_count, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Auction Management</h2>
          <p className="text-muted-foreground">Monitor and manage active auctions</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Gavel className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Auctions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Live Auctions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Timer className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.ending}</p>
                <p className="text-sm text-muted-foreground">Ending Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalBids}</p>
                <p className="text-sm text-muted-foreground">Total Bids</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Input
          placeholder="Search auctions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="ended">Ended</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Auctions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Auctions</CardTitle>
          <CardDescription>View and manage all auctions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredAuctions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No auctions found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Auction</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Current Bid</TableHead>
                  <TableHead>Bids</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ends</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAuctions.map((auction) => (
                  <TableRow key={auction.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {auction.image_url && (
                          <img 
                            src={auction.image_url} 
                            alt={auction.title}
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium">{auction.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">{auction.category}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p>{auction.seller?.display_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{auction.seller?.email}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-bold">
                          {(auction.current_bid || auction.starting_price).toFixed(2)}
                        </span>
                      </div>
                      {auction.reserve_price && auction.current_bid && 
                        auction.current_bid < auction.reserve_price && (
                        <p className="text-xs text-yellow-500">Reserve not met</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{auction.bid_count} bids</Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(auction.status, auction.ends_at)}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {new Date(auction.ends_at) > new Date() 
                          ? formatDistanceToNow(new Date(auction.ends_at), { addSuffix: true })
                          : format(new Date(auction.ends_at), "MMM d, yyyy")
                        }
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAuction(auction);
                            fetchBids(auction.id);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {auction.status === "active" && new Date(auction.ends_at) > new Date() && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => endAuctionEarlyMutation.mutate(auction.id)}
                              disabled={endAuctionEarlyMutation.isPending}
                            >
                              <Timer className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                              onClick={() => {
                                setSelectedAuction(auction);
                                setShowCancelDialog(true);
                              }}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Bids Dialog */}
      <Dialog open={showBids} onOpenChange={setShowBids}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bid History</DialogTitle>
            <DialogDescription>
              {selectedAuction?.title} - {bidsForAuction.length} bids
            </DialogDescription>
          </DialogHeader>

          {bidsForAuction.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No bids yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bidder</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bidsForAuction.map((bid) => (
                  <TableRow key={bid.id}>
                    <TableCell>
                      <p>{bid.bidder?.display_name}</p>
                      <p className="text-xs text-muted-foreground">{bid.bidder?.email}</p>
                    </TableCell>
                    <TableCell className="font-bold">${bid.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      {format(new Date(bid.created_at), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell>
                      {bid.is_winning ? (
                        <Badge className="bg-green-500">Winning</Badge>
                      ) : (
                        <Badge variant="outline">Outbid</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Auction</DialogTitle>
            <DialogDescription>
              This will cancel the auction and notify all bidders
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-500">Warning</p>
                <p className="text-sm text-muted-foreground">
                  Cancelling an auction with active bids may affect seller reputation
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Cancellation Reason</p>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Explain why this auction is being cancelled..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Auction
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedAuction) {
                  cancelAuctionMutation.mutate({
                    auctionId: selectedAuction.id,
                    reason: cancelReason,
                  });
                }
              }}
              disabled={cancelAuctionMutation.isPending}
            >
              {cancelAuctionMutation.isPending ? "Cancelling..." : "Cancel Auction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
