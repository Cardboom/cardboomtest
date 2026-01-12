import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCcw, TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface CalibrationRecord {
  id: string;
  grading_company: string;
  actual_grade: number;
  cbgi_avg_score: number;
  sample_count: number;
  bias_offset: number;
  confidence: number;
  example_cards: unknown;
  updated_at: string;
}

interface FeedbackRecord {
  id: string;
  grading_order_id: string;
  cbgi_score: number;
  actual_grade: string;
  grading_company: string;
  feedback_notes: string | null;
  created_at: string;
}

export function GradingCalibrationDashboard() {
  const queryClient = useQueryClient();
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  // Fetch calibration data
  const { data: calibrationData, isLoading: loadingCalibration } = useQuery({
    queryKey: ['grading-calibration'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grading_calibration')
        .select('*')
        .order('grading_company', { ascending: true })
        .order('actual_grade', { ascending: false });
      
      if (error) throw error;
      return data as CalibrationRecord[];
    }
  });

  // Fetch recent feedback
  const { data: feedbackData, isLoading: loadingFeedback } = useQuery({
    queryKey: ['grading-feedback'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grading_feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as FeedbackRecord[];
    }
  });

  // Recompute calibration mutation
  const recomputeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('recompute_grading_calibration');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grading-calibration'] });
      toast.success("Calibration recomputed successfully");
    },
    onError: (error) => {
      toast.error("Failed to recompute calibration: " + (error as Error).message);
    }
  });

  // Calculate overall stats
  const stats = {
    totalSamples: feedbackData?.length || 0,
    totalCalibrations: calibrationData?.length || 0,
    avgBias: calibrationData?.length 
      ? calibrationData.reduce((sum, c) => sum + c.bias_offset, 0) / calibrationData.length 
      : 0,
    companies: [...new Set(calibrationData?.map(c => c.grading_company) || [])],
    highConfidence: calibrationData?.filter(c => c.confidence >= 0.7).length || 0,
  };

  // Group calibrations by company
  const byCompany = calibrationData?.reduce((acc, c) => {
    if (!acc[c.grading_company]) {
      acc[c.grading_company] = [];
    }
    acc[c.grading_company].push(c);
    return acc;
  }, {} as Record<string, CalibrationRecord[]>) || {};

  const getBiasColor = (bias: number) => {
    if (Math.abs(bias) < 0.3) return "text-green-500";
    if (Math.abs(bias) < 0.5) return "text-yellow-500";
    return "text-red-500";
  };

  const getBiasIcon = (bias: number) => {
    if (Math.abs(bias) < 0.3) return <Target className="h-4 w-4 text-green-500" />;
    if (bias > 0) return <TrendingUp className="h-4 w-4 text-yellow-500" />;
    return <TrendingDown className="h-4 w-4 text-blue-500" />;
  };

  if (loadingCalibration || loadingFeedback) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCcw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">CBGI Calibration Dashboard</h2>
          <p className="text-muted-foreground">
            Dynamic prompt enhancement based on {stats.totalSamples} feedback samples
          </p>
        </div>
        <Button 
          onClick={() => recomputeMutation.mutate()}
          disabled={recomputeMutation.isPending}
        >
          <RefreshCcw className={`mr-2 h-4 w-4 ${recomputeMutation.isPending ? 'animate-spin' : ''}`} />
          Recompute Calibration
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Feedback</CardDescription>
            <CardTitle className="text-3xl">{stats.totalSamples}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              From {stats.companies.length} grading companies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Calibration Points</CardDescription>
            <CardTitle className="text-3xl">{stats.totalCalibrations}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.highConfidence} with high confidence
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Bias</CardDescription>
            <CardTitle className={`text-3xl ${getBiasColor(stats.avgBias)}`}>
              {stats.avgBias > 0 ? '+' : ''}{stats.avgBias.toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.avgBias > 0 ? 'CBGI scores higher than actual' : 
               stats.avgBias < 0 ? 'CBGI scores lower than actual' : 'Well calibrated'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Calibration Status</CardDescription>
            <CardTitle className="flex items-center gap-2">
              {stats.totalSamples >= 10 ? (
                <>
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                  <span className="text-green-500">Active</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-6 w-6 text-yellow-500" />
                  <span className="text-yellow-500">Collecting</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.totalSamples >= 10 
                ? 'Calibration data applied to prompts' 
                : `Need ${10 - stats.totalSamples} more samples`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calibration by Company */}
      <Card>
        <CardHeader>
          <CardTitle>Calibration by Company</CardTitle>
          <CardDescription>
            How CBGI scores compare to actual grades from each company
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button
              variant={selectedCompany === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCompany(null)}
            >
              All
            </Button>
            {stats.companies.map(company => (
              <Button
                key={company}
                variant={selectedCompany === company ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCompany(company)}
              >
                {company}
              </Button>
            ))}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Actual Grade</TableHead>
                <TableHead>Avg CBGI Score</TableHead>
                <TableHead>Bias</TableHead>
                <TableHead>Samples</TableHead>
                <TableHead>Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(selectedCompany 
                ? byCompany[selectedCompany] || [] 
                : calibrationData || []
              ).map((cal) => (
                <TableRow key={cal.id}>
                  <TableCell>
                    <Badge variant="outline">{cal.grading_company}</Badge>
                  </TableCell>
                  <TableCell className="font-mono">{cal.actual_grade.toFixed(1)}</TableCell>
                  <TableCell className="font-mono">{cal.cbgi_avg_score.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getBiasIcon(cal.bias_offset)}
                      <span className={`font-mono ${getBiasColor(cal.bias_offset)}`}>
                        {cal.bias_offset > 0 ? '+' : ''}{cal.bias_offset.toFixed(2)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{cal.sample_count}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={cal.confidence * 100} className="w-16 h-2" />
                      <span className="text-xs text-muted-foreground">
                        {(cal.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!calibrationData || calibrationData.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No calibration data yet. Submit feedback after receiving professional grades.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Feedback */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Feedback</CardTitle>
          <CardDescription>
            Latest submitted grade comparisons
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>CBGI Score</TableHead>
                <TableHead>Actual Grade</TableHead>
                <TableHead>Difference</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedbackData?.slice(0, 20).map((fb) => {
                const actualGrade = parseFloat(fb.actual_grade) || 0;
                const diff = fb.cbgi_score - actualGrade;
                return (
                  <TableRow key={fb.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(fb.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{fb.grading_company}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{fb.cbgi_score?.toFixed(1)}</TableCell>
                    <TableCell className="font-mono">{actualGrade.toFixed(1)}</TableCell>
                    <TableCell>
                      <span className={getBiasColor(diff)}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {fb.feedback_notes || '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!feedbackData || feedbackData.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No feedback submitted yet. Use the feedback dialog on completed grading orders.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Dynamic Calibration Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold text-foreground mb-2">1. Collect Feedback</h4>
              <p>After receiving professional grades (PSA, BGS, etc.), admins submit the actual grade via the feedback dialog on completed orders.</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold text-foreground mb-2">2. Compute Calibration</h4>
              <p>The system analyzes feedback to compute bias offsets and confidence scores for each company/grade combination.</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold text-foreground mb-2">3. Enhance Prompts</h4>
              <p>Calibration data is automatically injected into the AI prompt, teaching it to adjust scores based on real-world results.</p>
            </div>
          </div>
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <h4 className="font-semibold text-foreground mb-2">Current Prompt Version</h4>
            <p>Prompts are versioned and logged with each grading order. Check the <code className="bg-muted px-1 rounded">calibration_version</code> field on orders to see which calibration was applied.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
