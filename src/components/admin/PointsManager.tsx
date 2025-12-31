import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  Users,
  Gift,
  Search,
  Plus,
  Minus,
  Award
} from "lucide-react";

interface PointsBalance {
  id: string;
  user_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  updated_at: string;
  user?: {
    display_name: string;
    email: string;
  };
}

interface PointsHistory {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  source: string;
  description: string | null;
  created_at: string;
}

export function PointsManager() {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<PointsBalance | null>(null);
  const [userHistory, setUserHistory] = useState<PointsHistory[]>([]);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove">("add");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: pointsBalances = [], isLoading } = useQuery({
    queryKey: ["admin-points-balances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cardboom_points")
        .select(`*`)
        .order("balance", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as PointsBalance[];
    },
  });

  const { data: globalStats } = useQuery({
    queryKey: ["admin-points-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cardboom_points")
        .select("balance, total_earned, total_spent");

      if (error) throw error;

      return {
        totalActive: data.reduce((sum, p) => sum + (p.balance || 0), 0),
        totalEarned: data.reduce((sum, p) => sum + (p.total_earned || 0), 0),
        totalSpent: data.reduce((sum, p) => sum + (p.total_spent || 0), 0),
        userCount: data.length,
      };
    },
  });

  const fetchUserHistory = async (userId: string) => {
    const { data, error } = await supabase
      .from("cardboom_points_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      toast.error("Failed to fetch history");
      return;
    }

    setUserHistory(data);
  };

  const adjustPointsMutation = useMutation({
    mutationFn: async ({
      userId,
      amount,
      type,
      reason,
    }: {
      userId: string;
      amount: number;
      type: "add" | "remove";
      reason: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get current balance
      const { data: currentPoints } = await supabase
        .from("cardboom_points")
        .select("balance, total_earned, total_spent")
        .eq("user_id", userId)
        .single();

      if (type === "add") {
        // Add points
        const newBalance = (currentPoints?.balance || 0) + amount;
        const newEarned = (currentPoints?.total_earned || 0) + amount;
        
        const { error } = await supabase
          .from("cardboom_points")
          .upsert({
            user_id: userId,
            balance: newBalance,
            total_earned: newEarned,
            total_spent: currentPoints?.total_spent || 0,
          }, { onConflict: "user_id" });
        
        if (error) throw error;

        await supabase.from("cardboom_points_history").insert({
          user_id: userId,
          amount: amount,
          transaction_type: "admin_credit",
          source: "admin",
          description: reason,
        });
      } else {
        // Remove points
        if (!currentPoints) throw new Error("User has no points");
        if (currentPoints.balance < amount) throw new Error("Insufficient balance");

        const { error } = await supabase
          .from("cardboom_points")
          .update({
            balance: currentPoints.balance - amount,
            total_spent: (currentPoints.total_spent || 0) + amount,
          })
          .eq("user_id", userId);

        if (error) throw error;

        await supabase.from("cardboom_points_history").insert({
          user_id: userId,
          amount: -amount,
          transaction_type: "admin_deduction",
          source: "admin",
          description: reason,
        });
      }

      // Log admin action
      await supabase.from("admin_audit_log").insert({
        admin_id: user.id,
        action: type === "add" ? "add_points" : "remove_points",
        target_type: "user_points",
        target_id: userId,
        details: { amount, reason },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-points-balances"] });
      queryClient.invalidateQueries({ queryKey: ["admin-points-stats"] });
      toast.success(`Points ${adjustmentType === "add" ? "added" : "removed"} successfully`);
      setShowAdjustDialog(false);
      setAdjustmentAmount("");
      setAdjustmentReason("");
      if (selectedUser) {
        fetchUserHistory(selectedUser.user_id);
      }
    },
    onError: (error) => {
      toast.error("Failed to adjust points: " + error.message);
    },
  });

  const filteredBalances = pointsBalances.filter((p) =>
    !searchQuery ||
    p.user?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdjust = () => {
    if (!selectedUser || !adjustmentAmount || !adjustmentReason.trim()) {
      toast.error("Please fill all fields");
      return;
    }

    const amount = parseFloat(adjustmentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Invalid amount");
      return;
    }

    adjustPointsMutation.mutate({
      userId: selectedUser.user_id,
      amount,
      type: adjustmentType,
      reason: adjustmentReason,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cardboom Points</h2>
          <p className="text-muted-foreground">Manage user points and view statistics</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Coins className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{globalStats?.totalActive.toFixed(2) || "0"}</p>
                <p className="text-sm text-muted-foreground">Active Points</p>
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
                <p className="text-2xl font-bold">{globalStats?.totalEarned.toFixed(2) || "0"}</p>
                <p className="text-sm text-muted-foreground">Total Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{globalStats?.totalSpent.toFixed(2) || "0"}</p>
                <p className="text-sm text-muted-foreground">Total Spent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Users className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{globalStats?.userCount || 0}</p>
                <p className="text-sm text-muted-foreground">Users with Points</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Earning Rate Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gift className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Current Earning Rate</p>
                <p className="text-sm text-muted-foreground">Points earned per transaction</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              0.2%
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Top Point Holders
          </CardTitle>
          <CardDescription>Users with the highest point balances</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredBalances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users with points found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Earned</TableHead>
                  <TableHead>Spent</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBalances.map((points, index) => (
                  <TableRow key={points.id}>
                    <TableCell>
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-bold">
                        {index + 1}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{points.user?.display_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{points.user?.email}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Coins className="h-4 w-4 text-primary" />
                        <span className="font-bold">{points.balance.toFixed(2)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-green-600">
                      +{points.total_earned.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-red-600">
                      -{points.total_spent.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {format(new Date(points.updated_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(points);
                            setAdjustmentType("add");
                            setShowAdjustDialog(true);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(points);
                            setAdjustmentType("remove");
                            setShowAdjustDialog(true);
                          }}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Adjust Points Dialog */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjustmentType === "add" ? "Add Points" : "Remove Points"}
            </DialogTitle>
            <DialogDescription>
              {adjustmentType === "add" 
                ? "Grant bonus points to this user"
                : "Deduct points from this user's balance"
              }
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{selectedUser.user?.display_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.user?.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <p className="font-bold text-lg">{selectedUser.balance.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Amount</p>
                <Input
                  type="number"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Reason *</p>
                <Textarea
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder={adjustmentType === "add" 
                    ? "e.g., Compensation for issue, promotional bonus..."
                    : "e.g., Fraudulent activity, duplicate credit..."
                  }
                  rows={3}
                />
              </div>

              {adjustmentType === "remove" && parseFloat(adjustmentAmount) > selectedUser.balance && (
                <p className="text-sm text-red-500">
                  Amount exceeds user's balance
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdjust}
              disabled={adjustPointsMutation.isPending}
              variant={adjustmentType === "remove" ? "destructive" : "default"}
            >
              {adjustPointsMutation.isPending 
                ? "Processing..." 
                : adjustmentType === "add" ? "Add Points" : "Remove Points"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
