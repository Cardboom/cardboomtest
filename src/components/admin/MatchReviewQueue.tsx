import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, Eye, AlertTriangle, RefreshCw, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const MatchReviewQueue = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['match-review-queue', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('match_review_queue')
        .select('*, market_item:market_items(id, name, current_price)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('match_review_queue')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match-review-queue'] });
      toast.success('Approved');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('match_review_queue')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match-review-queue'] });
      toast.success('Rejected');
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Match Review Queue</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : !data || data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No items in queue</div>
        ) : (
          <div className="space-y-3">
            {data.map((item) => {
              const extData = item.external_data as Record<string, unknown> | null;
              return (
                <div key={item.id} className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30">
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{String(extData?.name || 'Unknown')}</span>
                      <Badge variant="secondary" className="text-xs">{item.source}</Badge>
                      <Badge variant={item.status === 'pending' ? 'default' : 'outline'} className="text-xs">
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{item.reason}</p>
                  </div>
                  {item.status === 'pending' && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="text-green-400" onClick={() => approveMutation.mutate(item.id)}>
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-400" onClick={() => rejectMutation.mutate(item.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
