import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Activity, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Clock,
  TrendingUp,
  Bell,
  Settings,
  History,
  Shield,
  Zap,
  Database,
  Wallet,
  Package,
  FileCheck
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface HealthReport {
  id: string;
  created_at: string;
  overall_status: 'healthy' | 'degraded' | 'down';
  total_checks: number;
  passed: number;
  warnings: number;
  failures: number;
  check_results: CheckResult[];
  latency_avg_ms: number;
  triggered_by: string;
}

interface CheckResult {
  id: string;
  name: string;
  category: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  fixHint?: string;
  duration?: number;
  details?: Record<string, unknown>;
}

interface HealthAlert {
  id: string;
  created_at: string;
  check_id: string;
  check_name: string;
  category: string;
  severity: 'warning' | 'critical';
  message: string;
  fix_hint?: string;
  resolved_at?: string;
}

const statusColors = {
  healthy: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  degraded: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  down: 'bg-red-500/10 text-red-500 border-red-500/30',
};

const statusIcons = {
  pass: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  warn: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  fail: <XCircle className="w-4 h-4 text-red-500" />,
};

const categoryIcons: Record<string, React.ReactNode> = {
  database: <Database className="w-4 h-4" />,
  wallet: <Wallet className="w-4 h-4" />,
  grading: <FileCheck className="w-4 h-4" />,
  payments: <Zap className="w-4 h-4" />,
  listings: <Package className="w-4 h-4" />,
  disputes: <Shield className="w-4 h-4" />,
  vault: <Package className="w-4 h-4" />,
  reels: <Activity className="w-4 h-4" />,
};

export function HealthMonitorDashboard() {
  const queryClient = useQueryClient();
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch latest reports
  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['health-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_health_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return (data || []).map(r => ({
        ...r,
        check_results: (r.check_results || []) as unknown as CheckResult[],
        overall_status: r.overall_status as 'healthy' | 'degraded' | 'down',
      })) as HealthReport[];
    },
    refetchInterval: autoRefresh ? 60000 : false,
  });

  // Fetch unresolved alerts
  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['health-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_health_alerts')
        .select('*')
        .is('resolved_at', null)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as HealthAlert[];
    },
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Run health check mutation
  const runCheck = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('health-monitor', {
        body: { triggeredBy: 'manual' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Health check completed');
      queryClient.invalidateQueries({ queryKey: ['health-reports'] });
      queryClient.invalidateQueries({ queryKey: ['health-alerts'] });
    },
    onError: (error) => {
      toast.error(`Health check failed: ${error.message}`);
    },
  });

  // Resolve alert mutation
  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('system_health_alerts')
        .update({ 
          resolved_at: new Date().toISOString(),
        })
        .eq('id', alertId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-alerts'] });
      toast.success('Alert resolved');
    },
  });

  const latestReport = reports?.[0];
  const chartData = reports?.slice(0, 24).reverse().map(r => ({
    time: format(new Date(r.created_at), 'HH:mm'),
    passed: r.passed,
    warnings: r.warnings,
    failures: r.failures,
    latency: r.latency_avg_ms,
  })) || [];

  // Auto-run check on mount if no recent report
  useEffect(() => {
    if (!reportsLoading && (!latestReport || 
        Date.now() - new Date(latestReport.created_at).getTime() > 15 * 60 * 1000)) {
      runCheck.mutate();
    }
  }, [reportsLoading]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Health Monitor
          </h2>
          <p className="text-muted-foreground">
            Periodic bug checks and system health monitoring
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch 
              id="auto-refresh" 
              checked={autoRefresh} 
              onCheckedChange={setAutoRefresh}
            />
            <Label htmlFor="auto-refresh" className="text-sm text-muted-foreground">
              Auto-refresh
            </Label>
          </div>
          
          <Button 
            onClick={() => runCheck.mutate()} 
            disabled={runCheck.isPending}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${runCheck.isPending ? 'animate-spin' : ''}`} />
            Run Check Now
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      {latestReport && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className={`border-2 ${statusColors[latestReport.overall_status]}`}>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-4xl font-bold capitalize">
                  {latestReport.overall_status}
                </div>
                <p className="text-sm mt-1 opacity-80">
                  Last checked {formatDistanceToNow(new Date(latestReport.created_at), { addSuffix: true })}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{latestReport.passed}</div>
                  <p className="text-sm text-muted-foreground">Checks Passed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{latestReport.warnings}</div>
                  <p className="text-sm text-muted-foreground">Warnings</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{latestReport.failures}</div>
                  <p className="text-sm text-muted-foreground">Failures</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="current" className="space-y-4">
        <TabsList>
          <TabsTrigger value="current" className="gap-2">
            <Activity className="w-4 h-4" />
            Current Status
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <Bell className="w-4 h-4" />
            Alerts
            {alerts && alerts.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                {alerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          <Card>
            <CardHeader>
              <CardTitle>Latest Check Results</CardTitle>
              <CardDescription>
                {latestReport 
                  ? `Ran ${format(new Date(latestReport.created_at), 'PPp')} (${latestReport.triggered_by})`
                  : 'No recent health check'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {latestReport ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {latestReport.check_results.map((check) => (
                    <div
                      key={check.id}
                      className={`p-4 rounded-lg border ${
                        check.status === 'pass' 
                          ? 'border-border bg-card' 
                          : check.status === 'warn'
                          ? 'border-amber-500/30 bg-amber-500/5'
                          : 'border-red-500/30 bg-red-500/5'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {categoryIcons[check.category] || <Activity className="w-4 h-4" />}
                          <span className="font-medium">{check.name}</span>
                        </div>
                        {statusIcons[check.status]}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {check.message}
                      </p>
                      {check.fixHint && (
                        <p className="text-xs text-amber-600 mt-1">
                          💡 {check.fixHint}
                        </p>
                      )}
                      {check.duration && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {check.duration}ms
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No health check data available. Click "Run Check Now" to start.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
              <CardDescription>
                Issues that need attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading alerts...
                </div>
              ) : alerts && alerts.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-4 rounded-lg border ${
                          alert.severity === 'critical'
                            ? 'border-red-500/30 bg-red-500/5'
                            : 'border-amber-500/30 bg-amber-500/5'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              {alert.severity === 'critical' 
                                ? <XCircle className="w-4 h-4 text-red-500" />
                                : <AlertTriangle className="w-4 h-4 text-amber-500" />
                              }
                              <span className="font-medium">{alert.check_name}</span>
                              <Badge variant="outline" className="text-xs">
                                {alert.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {alert.message}
                            </p>
                            {alert.fix_hint && (
                              <p className="text-xs text-amber-600 mt-1">
                                💡 {alert.fix_hint}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveAlert.mutate(alert.id)}
                            disabled={resolveAlert.isPending}
                          >
                            Resolve
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                  <p>No active alerts</p>
                  <p className="text-sm">All systems operating normally</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Check History</CardTitle>
              <CardDescription>
                Recent health check reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {reports?.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant="outline" 
                          className={statusColors[report.overall_status]}
                        >
                          {report.overall_status}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium">
                            {format(new Date(report.created_at), 'PPp')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {report.triggered_by} • {report.latency_avg_ms}ms avg
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-emerald-500">{report.passed} ✓</span>
                        <span className="text-amber-500">{report.warnings} ⚠</span>
                        <span className="text-red-500">{report.failures} ✗</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Health Trends</CardTitle>
              <CardDescription>
                System health over time (last 24 checks)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="time" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="passed"
                      stackId="1"
                      stroke="hsl(var(--chart-2))"
                      fill="hsl(var(--chart-2))"
                      fillOpacity={0.3}
                      name="Passed"
                    />
                    <Area
                      type="monotone"
                      dataKey="warnings"
                      stackId="1"
                      stroke="hsl(var(--chart-4))"
                      fill="hsl(var(--chart-4))"
                      fillOpacity={0.3}
                      name="Warnings"
                    />
                    <Area
                      type="monotone"
                      dataKey="failures"
                      stackId="1"
                      stroke="hsl(var(--chart-1))"
                      fill="hsl(var(--chart-1))"
                      fillOpacity={0.3}
                      name="Failures"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Not enough data for trends. Run more health checks to see trends.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
