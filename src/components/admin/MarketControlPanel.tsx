import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, Pause, Play, AlertTriangle, TrendingDown, 
  Eye, EyeOff, Zap, Settings, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function MarketControlPanel() {
  const queryClient = useQueryClient();
  const [newControl, setNewControl] = useState({
    control_type: 'freeze_category',
    target_category: '',
    target_pattern: '',
    threshold_value: '',
    reason: ''
  });

  const { data: activeControls, isLoading } = useQuery({
    queryKey: ['market-controls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_controls')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const createControlMutation = useMutation({
    mutationFn: async (control: typeof newControl) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('market_controls')
        .insert({
          control_type: control.control_type,
          target_category: control.target_category || null,
          target_pattern: control.target_pattern || null,
          threshold_value: control.threshold_value ? parseFloat(control.threshold_value) : null,
          reason: control.reason,
          activated_by: user?.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Market control activated');
      queryClient.invalidateQueries({ queryKey: ['market-controls'] });
      setNewControl({
        control_type: 'freeze_category',
        target_category: '',
        target_pattern: '',
        threshold_value: '',
        reason: ''
      });
    },
    onError: (error) => {
      toast.error('Failed to activate control');
      console.error(error);
    }
  });

  const deactivateControlMutation = useMutation({
    mutationFn: async (controlId: string) => {
      const { error } = await supabase
        .from('market_controls')
        .update({ is_active: false })
        .eq('id', controlId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Control deactivated');
      queryClient.invalidateQueries({ queryKey: ['market-controls'] });
    }
  });

  const getControlIcon = (type: string) => {
    switch (type) {
      case 'freeze_category': return <Pause className="h-4 w-4 text-blue-500" />;
      case 'throttle_low_confidence': return <TrendingDown className="h-4 w-4 text-yellow-500" />;
      case 'boost_category': return <Zap className="h-4 w-4 text-green-500" />;
      case 'shadow_ban_pattern': return <EyeOff className="h-4 w-4 text-red-500" />;
      case 'price_floor': return <Shield className="h-4 w-4 text-purple-500" />;
      case 'price_ceiling': return <Shield className="h-4 w-4 text-orange-500" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getControlLabel = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Founder Kill Switches
          </CardTitle>
          <CardDescription>
            Operate the market, don't just react to it. These controls let you stop bad dynamics fast.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active" className="space-y-4">
            <TabsList>
              <TabsTrigger value="active">Active Controls</TabsTrigger>
              <TabsTrigger value="new">Create Control</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : activeControls?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No active market controls
                </div>
              ) : (
                activeControls?.map((control: any) => (
                  <motion.div
                    key={control.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      {getControlIcon(control.control_type)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {getControlLabel(control.control_type)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            Active
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {control.reason}
                        </p>
                        {control.target_category && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Category: {control.target_category}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deactivateControlMutation.mutate(control.id)}
                      disabled={deactivateControlMutation.isPending}
                    >
                      Deactivate
                    </Button>
                  </motion.div>
                ))
              )}
            </TabsContent>

            <TabsContent value="new" className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label>Control Type</Label>
                  <Select
                    value={newControl.control_type}
                    onValueChange={(v) => setNewControl(prev => ({ ...prev, control_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="freeze_category">Freeze Reference Listings by Category</SelectItem>
                      <SelectItem value="throttle_low_confidence">Throttle Low-Confidence Prices</SelectItem>
                      <SelectItem value="boost_category">Boost Under-Liquid Categories</SelectItem>
                      <SelectItem value="shadow_ban_pattern">Shadow-Ban Pricing Pattern</SelectItem>
                      <SelectItem value="price_floor">Set Price Floor</SelectItem>
                      <SelectItem value="price_ceiling">Set Price Ceiling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(newControl.control_type === 'freeze_category' || 
                  newControl.control_type === 'boost_category') && (
                  <div>
                    <Label>Target Category</Label>
                    <Input
                      value={newControl.target_category}
                      onChange={(e) => setNewControl(prev => ({ ...prev, target_category: e.target.value }))}
                      placeholder="e.g., pokemon, sports"
                    />
                  </div>
                )}

                {newControl.control_type === 'shadow_ban_pattern' && (
                  <div>
                    <Label>Pattern to Ban</Label>
                    <Input
                      value={newControl.target_pattern}
                      onChange={(e) => setNewControl(prev => ({ ...prev, target_pattern: e.target.value }))}
                      placeholder="e.g., repeated-low-outliers"
                    />
                  </div>
                )}

                {(newControl.control_type === 'throttle_low_confidence' ||
                  newControl.control_type === 'price_floor' ||
                  newControl.control_type === 'price_ceiling') && (
                  <div>
                    <Label>Threshold Value</Label>
                    <Input
                      type="number"
                      value={newControl.threshold_value}
                      onChange={(e) => setNewControl(prev => ({ ...prev, threshold_value: e.target.value }))}
                      placeholder="e.g., 50 for confidence, or price amount"
                    />
                  </div>
                )}

                <div>
                  <Label>Reason (Required)</Label>
                  <Input
                    value={newControl.reason}
                    onChange={(e) => setNewControl(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Why is this control necessary?"
                  />
                </div>

                <Button
                  onClick={() => createControlMutation.mutate(newControl)}
                  disabled={!newControl.reason || createControlMutation.isPending}
                  className="gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Activate Control
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button variant="outline" className="gap-2" onClick={() => {
            setNewControl({
              control_type: 'freeze_category',
              target_category: 'all',
              target_pattern: '',
              threshold_value: '',
              reason: 'Emergency market freeze'
            });
          }}>
            <Pause className="h-4 w-4" />
            Emergency Freeze
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => {
            setNewControl({
              control_type: 'throttle_low_confidence',
              target_category: '',
              target_pattern: '',
              threshold_value: '30',
              reason: 'Hide low-confidence pricing'
            });
          }}>
            <Eye className="h-4 w-4" />
            Hide Low Confidence
          </Button>
          <Button variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Recalculate All
          </Button>
          <Button variant="outline" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            View Anomalies
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
