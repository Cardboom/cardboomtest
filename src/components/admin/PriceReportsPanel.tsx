import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ExternalLink,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface PriceReport {
  id: string;
  catalog_card_id: string | null;
  market_item_id: string | null;
  listing_id: string | null;
  user_id: string | null;
  reported_price: number | null;
  expected_price: number | null;
  report_reason: string;
  notes: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  catalog_cards?: { name: string; game: string; canonical_key: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: 'Pending', icon: Clock, className: 'bg-amber-500/20 text-amber-500' },
  reviewing: { label: 'Reviewing', icon: RefreshCw, className: 'bg-blue-500/20 text-blue-500' },
  resolved: { label: 'Resolved', icon: CheckCircle, className: 'bg-green-500/20 text-green-500' },
  rejected: { label: 'Rejected', icon: XCircle, className: 'bg-red-500/20 text-red-500' },
};

const REASON_LABELS: Record<string, string> = {
  too_high: 'Price too high',
  too_low: 'Price too low',
  outdated: 'Outdated price',
  wrong_card: 'Wrong card/variant',
  other: 'Other issue',
};

export function PriceReportsPanel() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('pending');

  const { data: reports, isLoading, refetch } = useQuery({
    queryKey: ['price-reports', filter],
    queryFn: async () => {
      let query = supabase
        .from('price_reports')
        .select(`
          *,
          catalog_cards (name, game, canonical_key)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter === 'pending') {
        query = query.in('status', ['pending', 'reviewing']);
      } else if (filter === 'resolved') {
        query = query.in('status', ['resolved', 'rejected']);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PriceReport[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('price_reports')
        .update({ 
          status, 
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString() 
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-reports'] });
      toast.success('Status updated');
    },
    onError: () => {
      toast.error('Failed to update status');
    },
  });

  const pendingCount = reports?.filter(r => r.status === 'pending').length || 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Price Reports
          </CardTitle>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {pendingCount} pending
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
          >
            Pending
          </Button>
          <Button
            variant={filter === 'resolved' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('resolved')}
          >
            Resolved
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !reports || reports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500/50" />
            <p>No {filter === 'pending' ? 'pending' : ''} price reports</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => {
              const statusConfig = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusConfig.icon;
              
              return (
                <div 
                  key={report.id} 
                  className="p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={statusConfig.className}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        <Badge variant="outline">
                          {REASON_LABELS[report.report_reason] || report.report_reason}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                        </span>
                      </div>

                      {report.catalog_cards ? (
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{report.catalog_cards.name}</p>
                          <a 
                            href={`/catalog/${report.catalog_cards.game}/${report.catalog_cards.canonical_key}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                          >
                            View card <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          {report.market_item_id ? `Market item: ${report.market_item_id.slice(0, 8)}...` : 'Unknown item'}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-sm">
                        {report.reported_price && (
                          <span>
                            Reported: <span className="font-medium text-red-500">${report.reported_price.toFixed(2)}</span>
                          </span>
                        )}
                        {report.expected_price && (
                          <span>
                            Expected: <span className="font-medium text-green-500">${report.expected_price.toFixed(2)}</span>
                          </span>
                        )}
                      </div>

                      {report.notes && (
                        <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                          "{report.notes}"
                        </p>
                      )}
                    </div>

                    {report.status === 'pending' && (
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-500 border-green-500/30 hover:bg-green-500/10"
                          onClick={() => updateStatus.mutate({ id: report.id, status: 'resolved' })}
                          disabled={updateStatus.isPending}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Resolve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 border-red-500/30 hover:bg-red-500/10"
                          onClick={() => updateStatus.mutate({ id: report.id, status: 'rejected' })}
                          disabled={updateStatus.isPending}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
