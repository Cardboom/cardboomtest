import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Image, 
  Play, 
  Pause, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Layers,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { useImageNormalization } from '@/hooks/useImageNormalization';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface TableStats {
  pending: number;
  done: number;
  failed: number;
  noImage: number;
}

const TABLE_LABELS: Record<string, string> = {
  market_items: 'Catalog Items',
  catalog_cards: 'Catalog Cards',
  listings: 'Marketplace Listings',
  card_instances: 'Card Instances',
  vault_items: 'Vault Items',
  swap_listings: 'Swap Listings',
  boom_pack_cards: 'Boom Pack Cards',
  grading_orders: 'Grading Orders',
};

export const ImageNormalizationManager: React.FC = () => {
  const { getBackfillStats, runBackfill, isBackfilling } = useImageNormalization();
  const [stats, setStats] = useState<Record<string, TableStats> | null>(null);
  const [loading, setLoading] = useState(true);
  const [batchSize, setBatchSize] = useState(50);
  const [dryRun, setDryRun] = useState(true);
  const [lastRunResult, setLastRunResult] = useState<any>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const result = await getBackfillStats();
      if (result) {
        setStats(result);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      toast.error('Failed to fetch normalization stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRunBackfill = async () => {
    try {
      const result = await runBackfill('all', batchSize, dryRun);
      
      if (result) {
        setLastRunResult(result);
        toast.success(dryRun ? 'Dry run completed!' : 'Backfill batch completed!');
        // Refresh stats after running
        await fetchStats();
      }
    } catch (error) {
      console.error('Backfill failed:', error);
      toast.error('Backfill failed');
    }
  };

  const getTotalStats = () => {
    if (!stats) return { pending: 0, done: 0, failed: 0, total: 0 };
    
    let pending = 0, done = 0, failed = 0;
    Object.values(stats).forEach(s => {
      pending += s.pending;
      done += s.done;
      failed += s.failed;
    });
    
    return { pending, done, failed, total: pending + done + failed };
  };

  const totalStats = getTotalStats();
  const progressPercent = totalStats.total > 0 
    ? Math.round((totalStats.done / totalStats.total) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5 text-primary" />
                AI Image Normalization
              </CardTitle>
              <CardDescription>
                Automatically crop and normalize card images using AI vision
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchStats}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress Overview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs">Pending</span>
                </div>
                <div className="text-2xl font-bold">{totalStats.pending.toLocaleString()}</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-gain/10">
                <div className="flex items-center justify-center gap-1 text-gain mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs">Done</span>
                </div>
                <div className="text-2xl font-bold text-gain">{totalStats.done.toLocaleString()}</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-loss/10">
                <div className="flex items-center justify-center gap-1 text-loss mb-1">
                  <XCircle className="w-4 h-4" />
                  <span className="text-xs">Failed</span>
                </div>
                <div className="text-2xl font-bold text-loss">{totalStats.failed.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Run Backfill Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Run Backfill Job
          </CardTitle>
          <CardDescription>
            Process pending images in batches. Use dry run first to preview.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="batchSize">Batch Size</Label>
              <Input
                id="batchSize"
                type="number"
                min={1}
                max={200}
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value) || 50)}
              />
              <p className="text-xs text-muted-foreground">
                Number of images to process per run (1-200)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Mode</Label>
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <Switch
                  id="dryRun"
                  checked={dryRun}
                  onCheckedChange={setDryRun}
                />
                <Label htmlFor="dryRun" className="cursor-pointer">
                  {dryRun ? (
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Dry Run (Preview Only)
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-gain" />
                      Live Run (Process Images)
                    </span>
                  )}
                </Label>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleRunBackfill}
            disabled={isBackfilling}
            className="w-full"
            size="lg"
          >
            {isBackfilling ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                {dryRun ? 'Run Dry Test' : 'Start Backfill'}
              </>
            )}
          </Button>

          {/* Last Run Result */}
          <AnimatePresence>
            {lastRunResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 rounded-lg border bg-muted/30"
              >
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-gain" />
                  Last Run Result
                  {lastRunResult.dryRun && (
                    <Badge variant="outline" className="text-xs">Dry Run</Badge>
                  )}
                </h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Batch Size: {lastRunResult.batchSize}</p>
                  {lastRunResult.results && Object.entries(lastRunResult.results).map(([table, result]: [string, any]) => (
                    <p key={table}>
                      {TABLE_LABELS[table] || table}: {result.processed} processed, {result.errors} errors
                    </p>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Per-Table Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Per-Table Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : stats ? (
            <div className="space-y-3">
              {Object.entries(stats).map(([table, tableStats]) => {
                const total = tableStats.pending + tableStats.done + tableStats.failed;
                const percent = total > 0 ? Math.round((tableStats.done / total) * 100) : 100;
                
                return (
                  <div key={table} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{TABLE_LABELS[table] || table}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {percent}%
                        </Badge>
                      </div>
                    </div>
                    <Progress value={percent} className="h-2 mb-2" />
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {tableStats.pending} pending
                      </span>
                      <span className="flex items-center gap-1 text-gain">
                        <CheckCircle2 className="w-3 h-3" /> {tableStats.done} done
                      </span>
                      {tableStats.failed > 0 && (
                        <span className="flex items-center gap-1 text-loss">
                          <XCircle className="w-3 h-3" /> {tableStats.failed} failed
                        </span>
                      )}
                      {tableStats.noImage > 0 && (
                        <span className="flex items-center gap-1">
                          <Image className="w-3 h-3" /> {tableStats.noImage} no image
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No stats available
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ImageNormalizationManager;
