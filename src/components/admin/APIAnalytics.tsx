import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Key, TrendingUp, Users, Activity, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface APISubscription {
  id: string;
  user_id: string;
  api_key: string;
  plan: string;
  price_monthly: number;
  requests_today: number;
  requests_limit: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  profiles?: { display_name: string | null; email: string | null };
}

export const APIAnalytics = () => {
  const [subscriptions, setSubscriptions] = useState<APISubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    totalRequestsToday: 0,
    monthlyRevenue: 0,
  });

  const fetchSubscriptions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('api_subscriptions')
        .select(`
          *,
          profiles:user_id (display_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const subs = data || [];
      setSubscriptions(subs as any);

      // Calculate stats
      const active = subs.filter(s => s.is_active);
      setStats({
        totalSubscriptions: subs.length,
        activeSubscriptions: active.length,
        totalRequestsToday: subs.reduce((acc, s) => acc + (s.requests_today || 0), 0),
        monthlyRevenue: active.reduce((acc, s) => acc + (s.price_monthly || 0), 0),
      });
    } catch (error) {
      console.error('Error fetching API subscriptions:', error);
      toast.error('Failed to load API analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const toggleSubscription = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('api_subscriptions')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Subscription ${isActive ? 'deactivated' : 'activated'}`);
      fetchSubscriptions();
    } catch (error) {
      toast.error('Failed to update subscription');
    }
  };

  const resetDailyRequests = async () => {
    try {
      const { error } = await supabase
        .from('api_subscriptions')
        .update({ requests_today: 0 })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;
      toast.success('Daily request counters reset');
      fetchSubscriptions();
    } catch (error) {
      toast.error('Failed to reset counters');
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Key className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total API Keys</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalSubscriptions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Users className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-500">{stats.activeSubscriptions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Activity className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Requests Today</p>
                <p className="text-2xl font-bold text-blue-500">{stats.totalRequestsToday.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <TrendingUp className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold text-yellow-500">${stats.monthlyRevenue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">API Subscriptions</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetDailyRequests} className="gap-2">
            <AlertCircle className="w-4 h-4" />
            Reset Daily Counters
          </Button>
          <Button variant="outline" onClick={fetchSubscriptions} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Subscriptions Table */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Requests Today</TableHead>
                  <TableHead className="text-right">Limit</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No API subscriptions found
                    </TableCell>
                  </TableRow>
                ) : (
                  subscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{(sub.profiles as any)?.display_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{(sub.profiles as any)?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {sub.api_key.slice(0, 8)}...
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{sub.plan}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {sub.requests_today.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {sub.requests_limit.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={sub.is_active ? 'bg-green-500' : 'bg-red-500'}>
                          {sub.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {sub.expires_at 
                          ? new Date(sub.expires_at).toLocaleDateString() 
                          : 'Never'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant={sub.is_active ? 'destructive' : 'default'}
                          onClick={() => toggleSubscription(sub.id, sub.is_active)}
                        >
                          {sub.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};