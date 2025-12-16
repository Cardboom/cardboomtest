import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Bot, DollarSign, Percent, RefreshCw, TrendingDown, ShoppingCart } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { format } from 'date-fns';

interface AutoBuyConfig {
  id: string;
  is_enabled: boolean;
  discount_threshold: number;
  max_buy_amount: number;
  system_buyer_id: string | null;
  created_at: string;
  updated_at: string;
}

interface AutoBuyLog {
  id: string;
  listing_id: string | null;
  market_item_id: string | null;
  listing_price: number;
  market_price: number;
  discount_percent: number;
  order_id: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

export const AutoBuyManager = () => {
  const [config, setConfig] = useState<AutoBuyConfig | null>(null);
  const [logs, setLogs] = useState<AutoBuyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { formatPrice } = useCurrency();

  // Form state
  const [isEnabled, setIsEnabled] = useState(false);
  const [discountThreshold, setDiscountThreshold] = useState(60);
  const [maxBuyAmount, setMaxBuyAmount] = useState(10000);

  useEffect(() => {
    fetchData();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch config
      const { data: configData, error: configError } = await supabase
        .from('auto_buy_config')
        .select('*')
        .limit(1)
        .single();

      if (configError && configError.code !== 'PGRST116') {
        console.error('Config error:', configError);
      }

      if (configData) {
        setConfig(configData);
        setIsEnabled(configData.is_enabled);
        setDiscountThreshold(configData.discount_threshold * 100);
        setMaxBuyAmount(configData.max_buy_amount);
      }

      // Fetch logs
      const { data: logsData, error: logsError } = await supabase
        .from('auto_buy_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsError) {
        console.error('Logs error:', logsError);
      } else {
        setLogs(logsData || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const updateData = {
        is_enabled: isEnabled,
        discount_threshold: discountThreshold / 100,
        max_buy_amount: maxBuyAmount,
        system_buyer_id: currentUserId,
        updated_at: new Date().toISOString()
      };

      if (config) {
        const { error } = await supabase
          .from('auto_buy_config')
          .update(updateData)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('auto_buy_config')
          .insert(updateData);

        if (error) throw error;
      }

      toast.success('Auto-buy configuration saved');
      fetchData();
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const setMeAsBuyer = async () => {
    if (!currentUserId) {
      toast.error('Not logged in');
      return;
    }

    setSaving(true);
    try {
      if (config) {
        const { error } = await supabase
          .from('auto_buy_config')
          .update({ system_buyer_id: currentUserId, updated_at: new Date().toISOString() })
          .eq('id', config.id);

        if (error) throw error;
      }
      toast.success('You are now set as the system buyer');
      fetchData();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to set buyer');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-gain/20 text-gain">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'skipped':
        return <Badge variant="secondary">Skipped</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate stats
  const completedBuys = logs.filter(l => l.status === 'completed');
  const totalSaved = completedBuys.reduce((sum, l) => sum + (l.market_price - l.listing_price), 0);
  const totalSpent = completedBuys.reduce((sum, l) => sum + l.listing_price, 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading auto-buy configuration...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-semibold">{isEnabled ? 'Active' : 'Disabled'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gain/10">
                <ShoppingCart className="w-5 h-5 text-gain" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Auto-Buys</p>
                <p className="font-semibold">{completedBuys.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <DollarSign className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="font-semibold">{formatPrice(totalSpent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gold/10">
                <TrendingDown className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Saved</p>
                <p className="font-semibold text-gain">{formatPrice(totalSaved)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Deal Scooper Configuration
          </CardTitle>
          <CardDescription>
            Automatically purchase listings that are significantly below market price
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Auto-Buy</Label>
              <p className="text-sm text-muted-foreground">Automatically purchase underpriced listings</p>
            </div>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Discount Threshold (%)
              </Label>
              <Input
                type="number"
                value={discountThreshold}
                onChange={(e) => setDiscountThreshold(Number(e.target.value))}
                min={10}
                max={90}
              />
              <p className="text-xs text-muted-foreground">
                Buy items listed at least {discountThreshold}% below market price
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Max Buy Amount
              </Label>
              <Input
                type="number"
                value={maxBuyAmount}
                onChange={(e) => setMaxBuyAmount(Number(e.target.value))}
                min={100}
              />
              <p className="text-xs text-muted-foreground">
                Maximum amount to spend on a single auto-buy
              </p>
            </div>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <Label>System Buyer Account</Label>
            <p className="text-sm text-muted-foreground mb-2">
              {config?.system_buyer_id 
                ? `Buyer ID: ${config.system_buyer_id.slice(0, 8)}...`
                : 'No buyer account set'}
            </p>
            <Button variant="outline" size="sm" onClick={setMeAsBuyer} disabled={saving}>
              Set Me as Buyer
            </Button>
          </div>

          <div className="flex gap-2">
            <Button onClick={saveConfig} disabled={saving}>
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Auto-Buy History</CardTitle>
          <CardDescription>Recent automatic purchases and attempts</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No auto-buy activity yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Listing Price</TableHead>
                  <TableHead>Market Price</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {format(new Date(log.created_at), 'MMM d, HH:mm')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(log.listing_price)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatPrice(log.market_price)}
                    </TableCell>
                    <TableCell className="text-gain font-medium">
                      {log.discount_percent.toFixed(1)}% off
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {log.error_message || (log.order_id ? 'Order created' : '-')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
