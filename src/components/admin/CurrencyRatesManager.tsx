import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Save, AlertTriangle, TrendingUp, DollarSign, Euro } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CurrencyRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  api_rate: number | null;
  is_manual_override: boolean;
  last_api_update: string | null;
  updated_at: string;
}

export const CurrencyRatesManager = () => {
  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editedRates, setEditedRates] = useState<Record<string, number>>({});

  const fetchRates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('currency_rates')
        .select('*')
        .order('from_currency');

      if (error) throw error;
      setRates(data || []);
      
      // Initialize edited rates
      const edits: Record<string, number> = {};
      data?.forEach((rate: CurrencyRate) => {
        edits[rate.id] = rate.rate;
      });
      setEditedRates(edits);
    } catch (error) {
      console.error('Error fetching rates:', error);
      toast.error('Failed to fetch currency rates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const syncFromAPI = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch(
        'https://api.exchangerate-api.com/v4/latest/USD',
        { signal: AbortSignal.timeout(10000) }
      );

      if (!response.ok) throw new Error('API request failed');

      const data = await response.json();
      const now = new Date().toISOString();

      // Update each rate from API
      for (const rate of rates) {
        let apiRate = null;
        
        if (rate.from_currency === 'USD' && rate.to_currency === 'TRY') {
          apiRate = data.rates?.TRY;
        } else if (rate.from_currency === 'USD' && rate.to_currency === 'EUR') {
          apiRate = data.rates?.EUR;
        } else if (rate.from_currency === 'EUR' && rate.to_currency === 'TRY') {
          apiRate = data.rates?.TRY / data.rates?.EUR;
        }

        if (apiRate) {
          const updateData: { api_rate: number; last_api_update: string; rate?: number } = {
            api_rate: apiRate,
            last_api_update: now,
          };

          // Only update the actual rate if not manually overridden
          if (!rate.is_manual_override) {
            updateData.rate = apiRate;
          }

          await supabase
            .from('currency_rates')
            .update(updateData)
            .eq('id', rate.id);
        }
      }

      toast.success('Exchange rates synced from API');
      fetchRates();
    } catch (error) {
      console.error('Error syncing rates:', error);
      toast.error('Failed to sync rates from API');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRateChange = (id: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setEditedRates(prev => ({ ...prev, [id]: numValue }));
    }
  };

  const saveRate = async (rate: CurrencyRate) => {
    const newRate = editedRates[rate.id];
    if (newRate === rate.rate) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('currency_rates')
        .update({
          rate: newRate,
          is_manual_override: true,
          updated_by: user?.id,
        })
        .eq('id', rate.id);

      if (error) throw error;

      toast.success(`${rate.from_currency}/${rate.to_currency} rate updated`);
      fetchRates();
    } catch (error) {
      console.error('Error saving rate:', error);
      toast.error('Failed to save rate');
    }
  };

  const toggleOverride = async (rate: CurrencyRate) => {
    try {
      const { error } = await supabase
        .from('currency_rates')
        .update({
          is_manual_override: !rate.is_manual_override,
          rate: rate.is_manual_override && rate.api_rate ? rate.api_rate : rate.rate,
        })
        .eq('id', rate.id);

      if (error) throw error;

      toast.success(rate.is_manual_override ? 'Using API rate' : 'Manual override enabled');
      fetchRates();
    } catch (error) {
      console.error('Error toggling override:', error);
      toast.error('Failed to toggle override');
    }
  };

  const getCurrencyIcon = (currency: string) => {
    switch (currency) {
      case 'USD': return <DollarSign className="w-4 h-4" />;
      case 'EUR': return <Euro className="w-4 h-4" />;
      case 'TRY': return <span className="text-sm font-bold">₺</span>;
      default: return null;
    }
  };

  const formatPair = (from: string, to: string) => `${from}/${to}`;

  const getDifference = (rate: CurrencyRate) => {
    if (!rate.api_rate) return null;
    const diff = ((rate.rate - rate.api_rate) / rate.api_rate) * 100;
    return diff;
  };

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-8 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Currency Exchange Rates
              </CardTitle>
              <CardDescription>
                Manage exchange rates with manual override support
              </CardDescription>
            </div>
            <Button 
              onClick={syncFromAPI} 
              disabled={isSyncing}
              variant="outline"
              className="gap-2"
            >
              {isSyncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Sync from API
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pair</TableHead>
                <TableHead>Current Rate</TableHead>
                <TableHead>API Rate</TableHead>
                <TableHead>Difference</TableHead>
                <TableHead>Manual Override</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map(rate => {
                const diff = getDifference(rate);
                const hasChanged = editedRates[rate.id] !== rate.rate;
                
                return (
                  <TableRow key={rate.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        {getCurrencyIcon(rate.from_currency)}
                        <span>{formatPair(rate.from_currency, rate.to_currency)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.0001"
                          value={editedRates[rate.id] || rate.rate}
                          onChange={(e) => handleRateChange(rate.id, e.target.value)}
                          className="w-32 h-8"
                        />
                        {hasChanged && (
                          <Badge variant="outline" className="text-amber-500 border-amber-500/50">
                            unsaved
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {rate.api_rate ? (
                        <span className="text-muted-foreground">
                          {rate.api_rate.toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {diff !== null ? (
                        <Badge 
                          variant="outline" 
                          className={
                            Math.abs(diff) > 5 
                              ? 'text-red-500 border-red-500/50' 
                              : Math.abs(diff) > 1 
                                ? 'text-amber-500 border-amber-500/50'
                                : 'text-muted-foreground'
                          }
                        >
                          {diff > 0 ? '+' : ''}{diff.toFixed(2)}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rate.is_manual_override}
                          onCheckedChange={() => toggleOverride(rate)}
                        />
                        {rate.is_manual_override && (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(rate.updated_at), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => saveRate(rate)}
                        disabled={!hasChanged}
                        className="gap-1"
                      >
                        <Save className="w-3 h-3" />
                        Save
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-amber-500/5 border-amber-500/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-500">Manual Override Mode</p>
              <p className="text-muted-foreground mt-1">
                When manual override is enabled, the rate will not be updated from the API during sync. 
                Use this when you need to set a specific rate different from the market rate.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};