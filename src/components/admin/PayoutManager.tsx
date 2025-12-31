import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  Banknote, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download, 
  CreditCard,
  AlertTriangle,
  User,
  Building
} from "lucide-react";

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  iban_id: string | null;
  status: string;
  processed_by: string | null;
  processed_at: string | null;
  rejection_reason: string | null;
  admin_notes: string | null;
  batch_id: string | null;
  created_at: string;
  user?: {
    display_name: string;
    email: string;
  };
  iban?: {
    iban: string;
    bank_name: string;
    account_holder: string;
  };
}

export function PayoutManager() {
  const queryClient = useQueryClient();
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select(`*`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as WithdrawalRequest[];
    },
  });

  const processRequestMutation = useMutation({
    mutationFn: async ({
      requestId,
      action,
      reason,
      notes,
    }: {
      requestId: string;
      action: "approve" | "reject";
      reason?: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const updateData = action === "approve" 
        ? {
            status: "approved",
            processed_by: user.id,
            processed_at: new Date().toISOString(),
            admin_notes: notes || null,
          }
        : {
            status: "rejected",
            processed_by: user.id,
            processed_at: new Date().toISOString(),
            rejection_reason: reason,
            admin_notes: notes || null,
          };

      const { error } = await supabase
        .from("withdrawal_requests")
        .update(updateData)
        .eq("id", requestId);

      if (error) throw error;

      // Log admin action
      await supabase.from("admin_audit_log").insert({
        admin_id: user.id,
        action: action === "approve" ? "approve_withdrawal" : "reject_withdrawal",
        target_type: "withdrawal_request",
        target_id: requestId,
        details: { reason, notes },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      toast.success(`Request ${actionType === "approve" ? "approved" : "rejected"} successfully`);
      setSelectedRequest(null);
      setActionType(null);
      setRejectionReason("");
      setAdminNotes("");
    },
    onError: (error) => {
      toast.error("Failed to process request: " + error.message);
    },
  });

  const batchApproveMutation = useMutation({
    mutationFn: async (requestIds: string[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const batchId = `BATCH-${Date.now()}`;

      const { error } = await supabase
        .from("withdrawal_requests")
        .update({
          status: "processing",
          processed_by: user.id,
          processed_at: new Date().toISOString(),
          batch_id: batchId,
        })
        .in("id", requestIds);

      if (error) throw error;

      // Log admin action
      await supabase.from("admin_audit_log").insert({
        admin_id: user.id,
        action: "batch_approve_withdrawals",
        target_type: "withdrawal_request",
        target_id: batchId,
        details: { request_ids: requestIds, count: requestIds.length },
      });

      return batchId;
    },
    onSuccess: (batchId) => {
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      toast.success(`Batch ${batchId} created with ${selectedRequests.length} requests`);
      setSelectedRequests([]);
    },
    onError: (error) => {
      toast.error("Failed to create batch: " + error.message);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "processing":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30"><CreditCard className="w-3 h-3 mr-1" />Processing</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredRequests = requests.filter((r) =>
    statusFilter === "all" ? true : r.status === statusFilter
  );

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    pendingAmount: requests.filter((r) => r.status === "pending").reduce((sum, r) => sum + r.amount, 0),
    processing: requests.filter((r) => r.status === "processing").length,
    completed: requests.filter((r) => r.status === "completed").length,
  };

  const toggleSelectAll = () => {
    if (selectedRequests.length === filteredRequests.filter((r) => r.status === "pending").length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(filteredRequests.filter((r) => r.status === "pending").map((r) => r.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedRequests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const maskIban = (iban: string) => {
    if (!iban || iban.length < 8) return iban;
    return iban.slice(0, 4) + "****" + iban.slice(-4);
  };

  const handleAction = (request: WithdrawalRequest, action: "approve" | "reject") => {
    setSelectedRequest(request);
    setActionType(action);
  };

  const confirmAction = () => {
    if (!selectedRequest || !actionType) return;

    if (actionType === "reject" && !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    processRequestMutation.mutate({
      requestId: selectedRequest.id,
      action: actionType,
      reason: rejectionReason,
      notes: adminNotes,
    });
  };

  const exportBatch = () => {
    const pendingForExport = requests.filter((r) => r.status === "processing");
    if (pendingForExport.length === 0) {
      toast.error("No processing requests to export");
      return;
    }

    const csvContent = [
      ["ID", "Account Holder", "IBAN", "Bank", "Amount", "Created"].join(","),
      ...pendingForExport.map((r) => [
        r.id,
        r.iban?.account_holder || "",
        r.iban?.iban || "",
        r.iban?.bank_name || "",
        r.amount.toFixed(2),
        format(new Date(r.created_at), "yyyy-MM-dd"),
      ].join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payouts-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Export downloaded");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payout Queue</h2>
          <p className="text-muted-foreground">Process withdrawal requests</p>
        </div>
        <div className="flex gap-2">
          {selectedRequests.length > 0 && (
            <Button
              onClick={() => batchApproveMutation.mutate(selectedRequests)}
              disabled={batchApproveMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Selected ({selectedRequests.length})
            </Button>
          )}
          <Button variant="outline" onClick={exportBatch}>
            <Download className="h-4 w-4 mr-2" />
            Export for Bank
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Banknote className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Banknote className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">${stats.pendingAmount.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Pending Amount</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Requests</CardTitle>
          <CardDescription>Review and process payout requests</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No withdrawal requests found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        selectedRequests.length ===
                        filteredRequests.filter((r) => r.status === "pending").length &&
                        selectedRequests.length > 0
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Bank Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      {request.status === "pending" && (
                        <Checkbox
                          checked={selectedRequests.includes(request.id)}
                          onCheckedChange={() => toggleSelect(request.id)}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{request.user?.display_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{request.user?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-bold text-lg">${request.amount.toFixed(2)}</p>
                    </TableCell>
                    <TableCell>
                      {request.iban ? (
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-mono text-sm">{maskIban(request.iban.iban)}</p>
                            <p className="text-xs text-muted-foreground">{request.iban.bank_name}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No IBAN</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      {format(new Date(request.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {request.status === "pending" && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:bg-green-50"
                            onClick={() => handleAction(request, "approve")}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleAction(request, "reject")}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {request.rejection_reason && (
                        <p className="text-xs text-red-500 mt-1">{request.rejection_reason}</p>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={!!selectedRequest && !!actionType} onOpenChange={() => {
        setSelectedRequest(null);
        setActionType(null);
        setRejectionReason("");
        setAdminNotes("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve Withdrawal" : "Reject Withdrawal"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve" 
                ? "Confirm approval of this withdrawal request"
                : "Provide a reason for rejecting this request"
              }
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">User</p>
                    <p className="font-medium">{selectedRequest.user?.display_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-bold text-lg">${selectedRequest.amount.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {actionType === "reject" && (
                <div>
                  <p className="text-sm font-medium mb-2">Rejection Reason *</p>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why this request is being rejected..."
                    rows={3}
                  />
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-2">Admin Notes (Optional)</p>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes..."
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedRequest(null);
              setActionType(null);
            }}>
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={processRequestMutation.isPending}
              variant={actionType === "reject" ? "destructive" : "default"}
            >
              {processRequestMutation.isPending 
                ? "Processing..." 
                : actionType === "approve" ? "Approve" : "Reject"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
