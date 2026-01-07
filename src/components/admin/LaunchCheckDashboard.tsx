import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock,
  RefreshCw,
  FileText,
  Shield,
  Wallet,
  Package,
  Video,
  CreditCard,
  MessageSquare,
  Database,
  Globe,
} from 'lucide-react';
import { useLaunchChecks, CheckResult, CheckStatus } from '@/hooks/useLaunchChecks';
import { format } from 'date-fns';

const categoryIcons: Record<string, React.ElementType> = {
  auth: Shield,
  wallet: Wallet,
  listings: Package,
  grading: Shield,
  vault: Package,
  payments: CreditCard,
  reels: Video,
  disputes: MessageSquare,
  database: Database,
  api: Globe,
};

const statusConfig: Record<CheckStatus, { icon: React.ElementType; color: string; bgColor: string }> = {
  pending: { icon: Clock, color: 'text-muted-foreground', bgColor: 'bg-muted' },
  running: { icon: RefreshCw, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  pass: { icon: CheckCircle2, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  warn: { icon: AlertTriangle, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  fail: { icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-500/10' },
};

function CheckResultRow({ result }: { result: CheckResult }) {
  const config = statusConfig[result.status];
  const StatusIcon = config.icon;
  const CategoryIcon = categoryIcons[result.category] || FileText;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-border/50">
      <div className={`p-2 rounded-lg ${config.bgColor}`}>
        <StatusIcon className={`w-4 h-4 ${config.color} ${result.status === 'running' ? 'animate-spin' : ''}`} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <CategoryIcon className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-foreground">{result.name}</span>
          <Badge variant="outline" className="text-xs">
            {result.category}
          </Badge>
          {result.duration && (
            <span className="text-xs text-muted-foreground">{result.duration}ms</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
        {result.fixHint && (
          <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {result.fixHint}
          </p>
        )}
      </div>
    </div>
  );
}

export function LaunchCheckDashboard() {
  const { results, isRunning, lastRun, runAllChecks, summary } = useLaunchChecks();
  const [autoRun, setAutoRun] = useState(false);

  useEffect(() => {
    if (autoRun && !isRunning) {
      runAllChecks();
    }
  }, [autoRun]);

  const overallStatus = 
    summary.fail > 0 ? 'fail' : 
    summary.warn > 0 ? 'warn' : 
    summary.pass > 0 ? 'pass' : 'pending';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Launch Check Dashboard
          </h2>
          <p className="text-muted-foreground">
            Pre-launch production readiness checks (read-only diagnostics)
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {lastRun && (
            <span className="text-sm text-muted-foreground">
              Last run: {format(lastRun, 'HH:mm:ss')}
            </span>
          )}
          <Button 
            onClick={runAllChecks} 
            disabled={isRunning}
            className="gap-2"
          >
            {isRunning ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isRunning ? 'Running...' : 'Run All Checks'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className={`${statusConfig[overallStatus].bgColor} border-0`}>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{summary.total}</p>
              <p className="text-sm text-muted-foreground">Total Checks</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-emerald-500/10 border-0">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-500">{summary.pass}</p>
              <p className="text-sm text-muted-foreground">Passed</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-amber-500/10 border-0">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-500">{summary.warn}</p>
              <p className="text-sm text-muted-foreground">Warnings</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-red-500/10 border-0">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-500">{summary.fail}</p>
              <p className="text-sm text-muted-foreground">Failed</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-muted border-0">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-muted-foreground">{summary.pending}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Check Results */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Check Results</CardTitle>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Click "Run All Checks" to start diagnostics</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {results.map((result, index) => (
                  <CheckResultRow key={`${result.id}-${index}`} result={result} />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Manual QA Checklist */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Manual QA Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Authentication</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>Sign up with email works</span>
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>Login/logout flow works</span>
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>Session persists on refresh</span>
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>Password reset works</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Wallet & Payments</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>Balance displays correctly</span>
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>Top-up flow completes</span>
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>No duplicate charges on retry</span>
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>Transaction history accurate</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Listings & Market</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>Create listing works</span>
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>New listings appear in feed</span>
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>Search and filters work</span>
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>Purchase flow completes</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Grading</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>Grading order creates correctly</span>
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>Payment deducted once only</span>
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>Status updates visible</span>
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>Results display properly</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* TODO: DB Changes Needed */}
      <Card className="bg-amber-500/5 border-amber-500/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-amber-500">
            <AlertTriangle className="w-5 h-5" />
            TODO: Requires DB Changes (Not Implemented)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Add idempotency_key column to grading_orders for duplicate prevention</li>
            <li>• Add correlation_id column to wallet_transactions for tracing</li>
            <li>• Add rate_limit_hits table for tracking rate limit violations</li>
            <li>• Add request_logs table for API audit trail</li>
            <li>• Add feature_flags table for runtime feature toggles</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
