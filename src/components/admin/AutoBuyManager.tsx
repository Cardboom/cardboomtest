import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Bot, DollarSign, Percent, RefreshCw, TrendingDown, ShoppingCart, Users, Clock, Shuffle, Eye } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { format, formatDistanceToNow } from 'date-fns';

interface AutoBuyConfig {
  id: string;
  is_enabled: boolean;
  discount_threshold: number;
  max_buy_amount: number;
  system_buyer_id: string | null;
  use_rotating_buyers: boolean;
  min_delay_between_buys_seconds: number;
  max_daily_buys: number;
  daily_buy_count: number;
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

interface SystemAccount {
  id: string;
  display_name: string;
  system_account_role: string | null;
  system_account_wallet_balance: number;
  last_auto_action_at: string | null;
  auto_actions_count: number;
}

export const AutoBuyManager = () => {
  const [config, setConfig] = useState<AutoBuyConfig | null>(null);
  const [logs, setLogs] = useState<AutoBuyLog[]>([]);
  const [buyerAccounts, setBuyerAccounts] = useState<SystemAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { formatPrice } = useCurrency();

  // Form state
  const [isEnabled, setIsEnabled] = useState(false);
  const [discountThreshold, setDiscountThreshold] = useState(60);
  const [maxBuyAmount, setMaxBuyAmount] = useState(10000);
  const [useRotatingBuyers, setUseRotatingBuyers] = useState(true);
  const [minDelaySeconds, setMinDelaySeconds] = useState(300);
  const [maxDailyBuys, setMaxDailyBuys] = useState(50);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch config
      const { data: configData } = await supabase
        .from('auto_buy_config')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (configData) {
        setConfig(configData as AutoBuyConfig);
        setIsEnabled(configData.is_enabled);
        setDiscountThreshold((configData.discount_threshold || 0.6) * 100);
        setMaxBuyAmount(configData.max_buy_amount || 10000);
        setUseRotatingBuyers(configData.use_rotating_buyers ?? true);
        setMinDelaySeconds(configData.min_delay_between_buys_seconds || 300);
        setMaxDailyBuys(configData.max_daily_buys || 50);
        setSelectedBuyerId(configData.system_buyer_id || '');
      }

      // Fetch logs
      const { data: logsData } = await supabase
        .from('auto_buy_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      setLogs((logsData || []) as AutoBuyLog[]);

      // Fetch buyer accounts (system accounts with buyer or mixed role)
      const { data: accounts } = await supabase
        .from('profiles')
        .select('id, display_name, system_account_role, system_account_wallet_balance, last_auto_action_at, auto_actions_count')
        .or('system_account_role.eq.buyer,system_account_role.eq.mixed')
        .order('auto_actions_count', { ascending: true });

      setBuyerAccounts((accounts || []) as SystemAccount[]);
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
        system_buyer_id: selectedBuyerId || null,
        use_rotating_buyers: useRotatingBuyers,
        min_delay_between_buys_seconds: minDelaySeconds,
        max_daily_buys: maxDailyBuys,
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

      toast.success('Configuration saved');
      fetchData();
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const getNextBuyer = (): SystemAccount | null => {
    if (!useRotatingBuyers && selectedBuyerId) {
      return buyerAccounts.find(a => a.id === selectedBuyerId) || null;
    }
    
    // Rotate through buyers based on least recent action
    const eligibleBuyers = buyerAccounts.filter(a => 
      (a.system_account_wallet_balance || 0) > 0
    );
    
    if (eligibleBuyers.length === 0) return null;
    
    // Sort by last action (oldest first for fairness)
    return eligibleBuyers.sort((a, b) => {
      if (!a.last_auto_action_at) return -1;
      if (!b.last_auto_action_at) return 1;
      return new Date(a.last_auto_action_at).getTime() - new Date(b.last_auto_action_at).getTime();
    })[0];
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
  const dailyRemaining = maxDailyBuys - (config?.daily_buy_count || 0);
  const totalBuyerBalance = buyerAccounts.reduce((sum, a) => sum + (a.system_account_wallet_balance || 0), 0);
  const nextBuyer = getNextBuyer();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Buyer Accounts</p>
                <p className="font-semibold">{buyerAccounts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <DollarSign className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Buyer Balance</p>
                <p className="font-semibold">{formatPrice(totalBuyerBalance)}</p>
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
            Organic Deal Scooper
          </CardTitle>
          <CardDescription>
            Automatically purchase undervalued listings using rotating buyer accounts for organic-looking activity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Auto-Buy</Label>
              <p className="text-sm text-muted-foreground">Purchase underpriced listings automatically</p>
            </div>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>

          {/* Organic Settings */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-4">
            <div className="flex items-center gap-2">
              <Shuffle className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">Organic Mode Settings</p>
                <p className="text-xs text-muted-foreground">Make purchases look like real user activity</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Rotate Buyer Accounts</Label>
                <p className="text-xs text-muted-foreground">Distribute buys across multiple accounts</p>
              </div>
              <Switch checked={useRotatingBuyers} onCheckedChange={setUseRotatingBuyers} />
            </div>

            {!useRotatingBuyers && (
              <div className="space-y-2">
                <Label>Primary Buyer Account</Label>
                <Select value={selectedBuyerId} onValueChange={setSelectedBuyerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select buyer account" />
                  </SelectTrigger>
                  <SelectContent>
                    {buyerAccounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.display_name} ({formatPrice(account.system_account_wallet_balance || 0)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Min Delay Between Buys (seconds)
                </Label>
                <Input
                  type="number"
                  value={minDelaySeconds}
                  onChange={(e) => setMinDelaySeconds(Number(e.target.value))}
                  min={60}
                  max={3600}
                />
                <p className="text-xs text-muted-foreground">
                  Wait at least {Math.floor(minDelaySeconds / 60)}m between purchases
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Max Daily Buys
                </Label>
                <Input
                  type="number"
                  value={maxDailyBuys}
                  onChange={(e) => setMaxDailyBuys(Number(e.target.value))}
                  min={1}
                  max={200}
                />
                <p className="text-xs text-muted-foreground">
                  {dailyRemaining} remaining today
                </p>
              </div>
            </div>
          </div>

          {/* Buy Settings */}
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
                Buy items at least {discountThreshold}% below market
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
            </div>
          </div>

          {/* Next Buyer Info */}
          {useRotatingBuyers && nextBuyer && (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Next Buyer in Rotation</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{nextBuyer.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Balance: {formatPrice(nextBuyer.system_account_wallet_balance || 0)} • 
                    {nextBuyer.auto_actions_count} actions
                  </p>
                </div>
                <Badge variant="outline">Ready</Badge>
              </div>
            </div>
          )}

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

      {/* Buyer Accounts Quick View */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Active Buyer Accounts
          </CardTitle>
          <CardDescription>System accounts available for auto-buying</CardDescription>
        </CardHeader>
        <CardContent>
          {buyerAccounts.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No buyer accounts configured. Go to System Accounts to create some.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {buyerAccounts.slice(0, 6).map(account => (
                <div 
                  key={account.id} 
                  className={`p-3 rounded-lg border ${
                    nextBuyer?.id === account.id 
                      ? 'bg-primary/5 border-primary/30' 
                      : 'bg-muted/30 border-border/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{account.display_name}</p>
                    {nextBuyer?.id === account.id && (
                      <Badge className="bg-primary/20 text-primary text-xs">Next</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gain font-medium">
                    {formatPrice(account.system_account_wallet_balance || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {account.last_auto_action_at 
                      ? `Active ${formatDistanceToNow(new Date(account.last_auto_action_at), { addSuffix: true })}`
                      : 'Never used'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Auto-Buy History</CardTitle>
          <CardDescription>Recent purchases and attempts</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No activity yet</p>
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
