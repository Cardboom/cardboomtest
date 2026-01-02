import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Shield, 
  Lock, 
  Unlock,
  Package,
  DollarSign,
  Activity,
  Wrench,
  History
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function InventoryIntegrityDashboard() {
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('overview');

  // Fetch card instances stats
  const { data: instanceStats, isLoading: statsLoading } = useQuery({
    queryKey: ['inventory-stats'],
    queryFn: async () => {
      const { data: instances, error } = await supabase
        .from('card_instances')
        .select('status, is_active, locked_at');

      if (error) throw error;

      const total = instances?.length || 0;
      const active = instances?.filter(i => i.is_active).length || 0;
      const locked = instances?.filter(i => i.locked_at).length || 0;
      const byStatus: Record<string, number> = {};
      
      instances?.forEach(i => {
        byStatus[i.status] = (byStatus[i.status] || 0) + 1;
      });

      return { total, active, locked, byStatus };
    }
  });

  // Fetch escrow transactions
  const { data: escrowData, isLoading: escrowLoading } = useQuery({
    queryKey: ['escrow-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escrow_transactions')
        .select('*, orders(id, status)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    }
  });

  // Fetch integrity issues
  const { data: integrityIssues, isLoading: issuesLoading } = useQuery({
    queryKey: ['integrity-issues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_integrity_issues')
        .select('*')
        .is('resolved_at', null)
        .order('detected_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  // Fetch audit log
  const { data: auditLog, isLoading: auditLoading } = useQuery({
    queryKey: ['inventory-audit-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    }
  });

  // Run integrity check
  const integrityCheckMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('inventory-escrow', {
        body: { action: 'integrity_check' }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['integrity-issues'] });
      toast.success(`Integrity check complete: ${data.total_issues} issues found`);
    },
    onError: (error: Error) => {
      toast.error(`Check failed: ${error.message}`);
    }
  });

  // Repair inventory
  const repairMutation = useMutation({
    mutationFn: async (repairType: string) => {
      const { data, error } = await supabase.functions.invoke('inventory-escrow', {
        body: { action: 'repair_inventory', repair_type: repairType }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      queryClient.invalidateQueries({ queryKey: ['integrity-issues'] });
      toast.success('Repair completed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Repair failed: ${error.message}`);
    }
  });

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'in_vault': 'bg-green-500/10 text-green-500',
      'listed_for_sale': 'bg-blue-500/10 text-blue-500',
      'reserved_checkout': 'bg-yellow-500/10 text-yellow-500',
      'sold_pending': 'bg-orange-500/10 text-orange-500',
      'in_verification': 'bg-purple-500/10 text-purple-500',
      'completed': 'bg-green-600/10 text-green-600',
      'disputed': 'bg-red-500/10 text-red-500',
    };
    return (
      <Badge variant="outline" className={colors[status] || 'bg-muted'}>
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      'info': 'bg-blue-500/10 text-blue-500',
      'warning': 'bg-yellow-500/10 text-yellow-500',
      'critical': 'bg-red-500/10 text-red-500',
    };
    return (
      <Badge variant="outline" className={colors[severity] || 'bg-muted'}>
        {severity}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Instances</p>
                <p className="text-2xl font-bold">{instanceStats?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{instanceStats?.active || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Lock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Locked</p>
                <p className="text-2xl font-bold">{instanceStats?.locked || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Issues</p>
                <p className="text-2xl font-bold">{integrityIssues?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Inventory Integrity Controls
          </CardTitle>
          <CardDescription>
            Run checks and repairs on the inventory system
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button 
            onClick={() => integrityCheckMutation.mutate()}
            disabled={integrityCheckMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${integrityCheckMutation.isPending ? 'animate-spin' : ''}`} />
            Run Integrity Check
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => repairMutation.mutate('unlock_orphans')}
            disabled={repairMutation.isPending}
          >
            <Unlock className="h-4 w-4 mr-2" />
            Unlock Orphaned Locks
          </Button>

          <Button 
            variant="outline"
            onClick={() => repairMutation.mutate('recalculate_values')}
            disabled={repairMutation.isPending}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Recalculate Values
          </Button>

          <Button 
            variant="outline"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
              queryClient.invalidateQueries({ queryKey: ['escrow-transactions'] });
              queryClient.invalidateQueries({ queryKey: ['integrity-issues'] });
              queryClient.invalidateQueries({ queryKey: ['inventory-audit-log'] });
              toast.success('Data refreshed');
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" />
            Status Overview
          </TabsTrigger>
          <TabsTrigger value="escrow" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Escrow Transactions
          </TabsTrigger>
          <TabsTrigger value="issues" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Issues ({integrityIssues?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <History className="h-4 w-4" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {instanceStats?.byStatus && Object.entries(instanceStats.byStatus).map(([status, count]) => (
                  <div key={status} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      {getStatusBadge(status)}
                      <span className="text-2xl font-bold">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="escrow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Escrow Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {escrowLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : escrowData?.length === 0 ? (
                <p className="text-muted-foreground">No escrow transactions yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Lane</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {escrowData?.map((escrow) => (
                      <TableRow key={escrow.id}>
                        <TableCell className="font-mono text-xs">
                          {escrow.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>${escrow.sale_amount?.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={escrow.sale_lane === 'instant' ? 'default' : 'secondary'}>
                            {escrow.sale_lane}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(escrow.status)}</TableCell>
                        <TableCell>
                          {escrow.requires_verification ? (
                            <Badge variant="outline" className="bg-purple-500/10 text-purple-500">
                              Required
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-500/10 text-green-500">
                              Not Required
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(escrow.created_at), 'MMM d, HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Unresolved Integrity Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              {issuesLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : integrityIssues?.length === 0 ? (
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle className="h-5 w-5" />
                  No integrity issues detected
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Detected</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {integrityIssues?.map((issue) => (
                      <TableRow key={issue.id}>
                        <TableCell className="font-medium">
                          {issue.issue_type}
                        </TableCell>
                        <TableCell>{issue.issue_description}</TableCell>
                        <TableCell>{getSeverityBadge(issue.severity)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(issue.detected_at), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            <Wrench className="h-4 w-4 mr-1" />
                            Repair
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Inventory Audit Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : auditLog?.length === 0 ? (
                <p className="text-muted-foreground">No audit entries yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Card Instance</TableHead>
                      <TableHead>Transition</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLog?.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {entry.action}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {entry.card_instance_id?.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">
                            {entry.from_status || '—'} → {entry.to_status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{entry.actor_type}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {entry.reason}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(entry.created_at), 'MMM d, HH:mm:ss')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
