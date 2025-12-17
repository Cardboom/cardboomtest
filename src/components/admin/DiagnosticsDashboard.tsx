/**
 * Admin Diagnostics Dashboard
 * 
 * Shows:
 * - Error log with filtering
 * - Cache statistics
 * - Price fetch status
 * - Image load failures
 * - System health metrics
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Trash2, 
  Download,
  Bug,
  Database,
  Image,
  Wifi,
  Clock,
  TrendingUp
} from 'lucide-react';
import { useDebug } from '@/contexts/DebugContext';
import { errorReporter, ErrorLogEntry, ErrorCategory, ErrorSeverity } from '@/services/errorReporter';
import { pricingService } from '@/services/pricingService';
import { cn } from '@/lib/utils';

export const DiagnosticsDashboard: React.FC = () => {
  const { isDebugMode, setDebugMode, canAccessDebug, errorLog, cacheStats, refreshCacheStats } = useDebug();
  const [categoryFilter, setCategoryFilter] = useState<ErrorCategory | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<ErrorSeverity | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState(errorReporter.getStats());

  // Refresh stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(errorReporter.getStats());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Filter error log
  const filteredLog = errorLog.filter((entry) => {
    if (categoryFilter !== 'all' && entry.category !== categoryFilter) return false;
    if (severityFilter !== 'all' && entry.severity !== severityFilter) return false;
    if (searchQuery && !entry.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Export error log
  const handleExport = () => {
    const data = JSON.stringify(errorLog, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cardboom-error-log-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clear error log
  const handleClear = () => {
    if (confirm('Are you sure you want to clear the error log?')) {
      errorReporter.clearErrorLog();
    }
  };

  // Invalidate all cache
  const handleClearCache = () => {
    if (confirm('Are you sure you want to clear all cached data?')) {
      pricingService.invalidateCache();
      refreshCacheStats();
    }
  };

  const getSeverityIcon = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info': return <CheckCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  const getCategoryIcon = (category: ErrorCategory) => {
    switch (category) {
      case 'pricing': return <TrendingUp className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      case 'api': return <Wifi className="w-4 h-4" />;
      case 'database': return <Database className="w-4 h-4" />;
      default: return <Bug className="w-4 h-4" />;
    }
  };

  if (!canAccessDebug) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Admin access required for diagnostics.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Debug Mode Toggle */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bug className="w-5 h-5 text-primary" />
                Debug Mode
              </CardTitle>
              <CardDescription>
                Enable debug overlays and detailed logging across the site
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="debug-mode">Debug Mode</Label>
              <Switch
                id="debug-mode"
                checked={isDebugMode}
                onCheckedChange={setDebugMode}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Errors (24h)</p>
                <p className="text-2xl font-bold text-red-500">{stats.last24h}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Database className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cached Items</p>
                <p className="text-2xl font-bold">{cacheStats.marketItemsCached}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Image className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Image Errors</p>
                <p className="text-2xl font-bold text-yellow-500">
                  {stats.byCategory?.image || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <TrendingUp className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pricing Errors</p>
                <p className="text-2xl font-bold text-orange-500">
                  {stats.byCategory?.pricing || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cache Info */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Cache Status
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={refreshCacheStats}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
              <Button variant="destructive" size="sm" onClick={handleClearCache}>
                <Trash2 className="w-4 h-4 mr-1" />
                Clear Cache
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Market Items:</span>
              <span className="ml-2 font-medium">{cacheStats.marketItemsCached}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Prices:</span>
              <span className="ml-2 font-medium">{cacheStats.pricesCached}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Oldest Entry:</span>
              <span className="ml-2 font-medium">
                {cacheStats.oldestEntry 
                  ? new Date(cacheStats.oldestEntry).toLocaleTimeString()
                  : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Newest Entry:</span>
              <span className="ml-2 font-medium">
                {cacheStats.newestEntry 
                  ? new Date(cacheStats.newestEntry).toLocaleTimeString()
                  : 'N/A'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Log */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-primary" />
              Error Log ({filteredLog.length})
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-40"
              />
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="pricing">Pricing</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="validation">Validation</SelectItem>
                </SelectContent>
              </Select>
              <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as any)}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="error">Errors</SelectItem>
                  <SelectItem value="warning">Warnings</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={handleExport}>
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="destructive" size="icon" onClick={handleClear}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {filteredLog.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No errors logged</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLog.map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      'p-3 rounded-lg border text-sm',
                      entry.severity === 'error' && 'bg-red-500/5 border-red-500/20',
                      entry.severity === 'warning' && 'bg-yellow-500/5 border-yellow-500/20',
                      entry.severity === 'info' && 'bg-blue-500/5 border-blue-500/20'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {getSeverityIcon(entry.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            {getCategoryIcon(entry.category)}
                            {entry.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-1 font-medium break-words">{entry.message}</p>
                        {entry.context && (
                          <pre className="mt-1 text-xs text-muted-foreground bg-background/50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(entry.context, null, 2)}
                          </pre>
                        )}
                        {entry.error && (
                          <pre className="mt-1 text-xs text-red-400 bg-red-500/5 p-2 rounded overflow-x-auto">
                            {typeof entry.error === 'string' 
                              ? entry.error 
                              : JSON.stringify(entry.error, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default DiagnosticsDashboard;
