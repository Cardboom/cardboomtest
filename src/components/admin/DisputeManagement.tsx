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
import { format } from "date-fns";
import { AlertTriangle, CheckCircle, XCircle, Clock, Eye, DollarSign, Sparkles, Loader2 } from "lucide-react";

interface AIAnalysis {
  summary: string;
  buyerPosition: string;
  sellerPosition: string;
  keyFactors: string[];
  recommendation: string;
  recommendedRefundPercent: number;
  confidenceScore: number;
  reasoning: string;
  suggestedNextSteps: string[];
}

interface Dispute {
  id: string;
  order_id: string;
  initiator_id: string;
  reason: string;
  description: string;
  status: string;
  resolution: string | null;
  resolution_notes: string | null;
  refund_amount: number | null;
  created_at: string;
  resolved_at: string | null;
  ai_analysis?: AIAnalysis | null;
  ai_summary?: string | null;
  ai_recommendation?: string | null;
  ai_confidence_score?: number | null;
  order?: {
    id: string;
    price: number;
    status: string;
    listing?: {
      title: string;
    };
    buyer?: {
      display_name: string;
      email: string;
    };
    seller?: {
      display_name: string;
      email: string;
    };
  };
  initiator?: {
    display_name: string;
    email: string;
  };
}

export function DisputeManagement() {
  const queryClient = useQueryClient();
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ["admin-disputes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_escalations")
        .select(`*, order:orders(id, price, status, buyer_id, seller_id, listing:listings(title))`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map((d: any) => ({
        id: d.id,
        order_id: d.order_id,
        initiator_id: d.escalated_by,
        reason: d.escalation_type,
        description: d.reason,
        status: d.resolved_at ? 'resolved' : 'pending',
        resolution: null,
        resolution_notes: d.resolution_notes,
        refund_amount: null,
        created_at: d.created_at,
        resolved_at: d.resolved_at,
        order: d.order,
      })) as Dispute[];
    },
  });

  const resolveDisputeMutation = useMutation({
    mutationFn: async ({
      disputeId,
      resolution,
      notes,
      refundAmount,
    }: {
      disputeId: string;
      resolution: string;
      notes: string;
      refundAmount: number | null;
    }) => {
      const { error } = await supabase
        .from("order_escalations")
        .update({
          resolution_notes: notes,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", disputeId);

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("admin_audit_log").insert({
          admin_id: user.id,
          action: "resolve_dispute",
          target_type: "dispute",
          target_id: disputeId,
          details: { resolution, refund_amount: refundAmount },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
      toast.success("Dispute resolved successfully");
      setSelectedDispute(null);
      setResolution("");
      setResolutionNotes("");
      setRefundAmount("");
    },
    onError: (error) => {
      toast.error("Failed to resolve dispute: " + error.message);
    },
  });

  // AI Analysis function
  const handleAIAnalysis = async (dispute: Dispute) => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-dispute-analyzer', {
        body: {
          disputeId: dispute.id,
          disputeType: dispute.reason,
          description: dispute.description,
          orderAmount: dispute.order?.price || 0,
          buyerEvidence: null,
          sellerResponse: null,
          sellerEvidence: null
        }
      });

      if (error) throw error;

      if (data?.analysis) {
        setSelectedDispute(prev => prev ? {
          ...prev,
          ai_analysis: data.analysis,
          ai_summary: data.analysis.summary,
          ai_recommendation: data.analysis.recommendation,
          ai_confidence_score: data.analysis.confidenceScore
        } : null);

        // Pre-fill resolution based on AI recommendation
        if (data.analysis.recommendation) {
          setResolution(data.analysis.recommendation);
        }
        if (data.analysis.recommendedRefundPercent && dispute.order?.price) {
          const suggestedRefund = (dispute.order.price * data.analysis.recommendedRefundPercent / 100).toFixed(2);
          setRefundAmount(suggestedRefund);
        }
        if (data.analysis.reasoning) {
          setResolutionNotes(data.analysis.reasoning);
        }

        toast.success('AI analysis complete');
        queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error('Failed to get AI analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "under_review":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30"><Eye className="w-3 h-3 mr-1" />Under Review</Badge>;
      case "resolved":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Resolved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-500">High ({score}%)</Badge>;
    if (score >= 50) return <Badge className="bg-yellow-500">Medium ({score}%)</Badge>;
    return <Badge className="bg-red-500">Low ({score}%)</Badge>;
  };

  const filteredDisputes = disputes.filter((d) =>
    statusFilter === "all" ? true : d.status === statusFilter
  );

  const stats = {
    total: disputes.length,
    pending: disputes.filter((d) => d.status === "pending").length,
    underReview: disputes.filter((d) => d.status === "under_review").length,
    resolved: disputes.filter((d) => d.status === "resolved").length,
  };

  const handleResolve = () => {
    if (!selectedDispute || !resolution) {
      toast.error("Please select a resolution");
      return;
    }

    const refund = refundAmount ? parseFloat(refundAmount) : null;
    resolveDisputeMutation.mutate({
      disputeId: selectedDispute.id,
      resolution,
      notes: resolutionNotes,
      refundAmount: refund,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dispute Resolution Center</h2>
          <p className="text-muted-foreground">Review and resolve order disputes with AI assistance</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <AlertTriangle className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Disputes</p>
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
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Eye className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.underReview}</p>
                <p className="text-sm text-muted-foreground">Under Review</p>
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
                <p className="text-2xl font-bold">{stats.resolved}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
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
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Disputes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Disputes</CardTitle>
          <CardDescription>Click on a dispute to review with AI assistance</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredDisputes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No disputes found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Initiator</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDisputes.map((dispute) => (
                  <TableRow key={dispute.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium">{dispute.order?.listing?.title || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">
                            {dispute.order_id.slice(0, 8)}...
                          </p>
                        </div>
                        {dispute.ai_analysis && (
                          <Badge variant="outline" className="border-purple-500 text-purple-500 text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p>{dispute.initiator?.display_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{dispute.initiator?.email}</p>
                    </TableCell>
                    <TableCell>
                      <p className="capitalize">{dispute.reason?.replace(/_/g, " ")}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">${dispute.order?.price?.toFixed(2) || "0.00"}</p>
                    </TableCell>
                    <TableCell>{getStatusBadge(dispute.status)}</TableCell>
                    <TableCell>
                      {format(new Date(dispute.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedDispute(dispute);
                          setResolution("");
                          setResolutionNotes("");
                          setRefundAmount("");
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dispute Detail Dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dispute Details</DialogTitle>
            <DialogDescription>
              Review the dispute and make a resolution decision
            </DialogDescription>
          </DialogHeader>

          {selectedDispute && (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Order</p>
                  <p className="font-medium">{selectedDispute.order?.listing?.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order Amount</p>
                  <p className="font-medium text-lg">${selectedDispute.order?.price?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Buyer</p>
                  <p className="font-medium">{selectedDispute.order?.buyer?.display_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedDispute.order?.buyer?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Seller</p>
                  <p className="font-medium">{selectedDispute.order?.seller?.display_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedDispute.order?.seller?.email}</p>
                </div>
              </div>

              {/* Dispute Reason */}
              <div>
                <p className="text-sm font-medium mb-2">Dispute Reason</p>
                <p className="text-sm capitalize">{selectedDispute.reason?.replace(/_/g, " ")}</p>
              </div>

              {/* Description */}
              <div>
                <p className="text-sm font-medium mb-2">Description</p>
                <p className="text-sm text-muted-foreground">{selectedDispute.description}</p>
              </div>

              {/* AI Analysis Section */}
              <div className="border border-purple-500/30 bg-purple-500/5 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    <span className="font-medium text-purple-500">AI Dispute Analyzer</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-purple-500 text-purple-500 hover:bg-purple-500/10"
                    onClick={() => handleAIAnalysis(selectedDispute)}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        {selectedDispute.ai_analysis ? 'Re-analyze' : 'Analyze with AI'}
                      </>
                    )}
                  </Button>
                </div>

                {selectedDispute.ai_analysis && (
                  <div className="space-y-3 pt-3 border-t border-purple-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">AI Recommendation</p>
                        <Badge className="mt-1 capitalize">
                          {selectedDispute.ai_analysis.recommendation?.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Confidence</p>
                        {getConfidenceBadge(selectedDispute.ai_analysis.confidenceScore)}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Summary</p>
                      <p className="text-sm">{selectedDispute.ai_analysis.summary}</p>
                    </div>

                    {selectedDispute.ai_analysis.keyFactors?.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Key Factors</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedDispute.ai_analysis.keyFactors.map((factor, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {factor}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">AI Reasoning</p>
                      <p className="text-sm text-muted-foreground">{selectedDispute.ai_analysis.reasoning}</p>
                    </div>

                    {selectedDispute.ai_analysis.suggestedNextSteps?.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Suggested Next Steps</p>
                        <ul className="text-sm list-disc list-inside space-y-1">
                          {selectedDispute.ai_analysis.suggestedNextSteps.map((step, i) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedDispute.status === "pending" || selectedDispute.status === "under_review" ? (
                <>
                  {/* Resolution Form */}
                  <div className="space-y-4 pt-4 border-t">
                    <div>
                      <p className="text-sm font-medium mb-2">Resolution Decision</p>
                      <Select value={resolution} onValueChange={setResolution}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select resolution" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full_refund">Full Refund to Buyer</SelectItem>
                          <SelectItem value="partial_refund">Partial Refund</SelectItem>
                          <SelectItem value="favor_seller">Favor Seller (No Refund)</SelectItem>
                          <SelectItem value="require_return">Require Return First</SelectItem>
                          <SelectItem value="need_more_info">Need More Information</SelectItem>
                          <SelectItem value="mutual_agreement">Mutual Agreement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(resolution === "partial_refund" || resolution === "full_refund") && (
                      <div>
                        <p className="text-sm font-medium mb-2">Refund Amount</p>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            value={refundAmount}
                            onChange={(e) => setRefundAmount(e.target.value)}
                            placeholder="0.00"
                            max={selectedDispute.order?.price || 0}
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-medium mb-2">Resolution Notes</p>
                      <Textarea
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Explain the resolution decision..."
                        rows={3}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSelectedDispute(null)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleResolve}
                      disabled={!resolution || resolveDisputeMutation.isPending}
                    >
                      {resolveDisputeMutation.isPending ? "Resolving..." : "Resolve Dispute"}
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">Resolution</p>
                  <p className="text-sm capitalize">{selectedDispute.resolution?.replace(/_/g, " ")}</p>
                  {selectedDispute.refund_amount && (
                    <p className="text-sm mt-2">Refund Amount: ${selectedDispute.refund_amount.toFixed(2)}</p>
                  )}
                  {selectedDispute.resolution_notes && (
                    <p className="text-sm text-muted-foreground mt-2">{selectedDispute.resolution_notes}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
