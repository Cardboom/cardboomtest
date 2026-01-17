import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Coins, DollarSign, Save, RefreshCw, AlertTriangle } from "lucide-react";
import { BoomCoinIcon } from "@/components/icons/BoomCoinIcon";

interface PlatformSetting {
  id: string;
  key: string;
  value: any;
  created_at: string;
  updated_at: string;
}

export function BoomCoinsPricingManager() {
  const queryClient = useQueryClient();
  const [coinRate, setCoinRate] = useState("0.001");
  const [markupFree, setMarkupFree] = useState("12");
  const [markupLite, setMarkupLite] = useState("10");
  const [markupPro, setMarkupPro] = useState("8");
  const [markupEnterprise, setMarkupEnterprise] = useState("5");

  // Fetch platform settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['platform-settings-coins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .in('key', [
          'boom_coin_usd_rate',
          'boom_coin_markup_free',
          'boom_coin_markup_lite', 
          'boom_coin_markup_pro',
          'boom_coin_markup_enterprise'
        ]);
      
      if (error) throw error;
      return data as PlatformSetting[];
    }
  });

  // Initialize form values from settings
  useEffect(() => {
    if (settings) {
      settings.forEach(s => {
        const val = typeof s.value === 'string' ? s.value.replace(/"/g, '') : String(s.value);
        switch (s.key) {
          case 'boom_coin_usd_rate':
            setCoinRate(val);
            break;
          case 'boom_coin_markup_free':
            setMarkupFree(val);
            break;
          case 'boom_coin_markup_lite':
            setMarkupLite(val);
            break;
          case 'boom_coin_markup_pro':
            setMarkupPro(val);
            break;
          case 'boom_coin_markup_enterprise':
            setMarkupEnterprise(val);
            break;
        }
      });
    }
  }, [settings]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = [
        { key: 'boom_coin_usd_rate', value: JSON.stringify(coinRate) },
        { key: 'boom_coin_markup_free', value: JSON.stringify(markupFree) },
        { key: 'boom_coin_markup_lite', value: JSON.stringify(markupLite) },
        { key: 'boom_coin_markup_pro', value: JSON.stringify(markupPro) },
        { key: 'boom_coin_markup_enterprise', value: JSON.stringify(markupEnterprise) },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('platform_settings')
          .upsert({ key: update.key, value: update.value }, { onConflict: 'key' });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Boom Coins pricing updated!');
      queryClient.invalidateQueries({ queryKey: ['platform-settings-coins'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to save: ${error.message}`);
    }
  });

  const rate = parseFloat(coinRate) || 0.001;
  const coinsPerDollar = Math.round(1 / rate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BoomCoinIcon size="md" className="text-amber-400" />
            Boom Coins Pricing
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure coin-to-USD exchange rates and tier markups
          </p>
        </div>
        <Button 
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Current Rate Display */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-400" />
            Current Exchange Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-bold">{coinsPerDollar.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Coins per $1 USD</p>
            </div>
            <div className="text-muted-foreground">=</div>
            <div className="text-center">
              <p className="text-3xl font-bold">${rate}</p>
              <p className="text-sm text-muted-foreground">USD per Coin</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-card rounded-lg">
            <p className="text-sm">
              <strong>Example:</strong> 10,000 Coins = ${(10000 * rate).toFixed(2)} USD | 
              $50 USD = {Math.round(50 / rate).toLocaleString()} Coins
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Rate Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Exchange Rate</CardTitle>
          <CardDescription>
            Set the USD value of 1 Boom Coin. Lower = more coins per dollar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="coinRate">USD per Coin</Label>
              <Input
                id="coinRate"
                type="number"
                step="0.0001"
                min="0.0001"
                max="1"
                value={coinRate}
                onChange={(e) => setCoinRate(e.target.value)}
                placeholder="0.001"
              />
              <p className="text-xs text-muted-foreground">
                Current: $0.001 (1000 coins = $1). Previous: $0.01 (100 coins = $1)
              </p>
            </div>
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-mono">
                  1 Coin = ${parseFloat(coinRate || "0").toFixed(4)} USD
                </p>
                <p className="font-mono text-sm text-muted-foreground">
                  $1 = {Math.round(1 / (parseFloat(coinRate) || 0.001)).toLocaleString()} Coins
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-sm">
              <strong>Note:</strong> Changing this rate affects all coin displays across the platform. 
              Existing coin balances remain the same numerically but change in USD value.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Markup Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Top-Up Markup by Tier</CardTitle>
          <CardDescription>
            Percentage markup added when users purchase coins. Lower tiers pay more.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Free Tier
                <Badge variant="outline">Standard</Badge>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={markupFree}
                  onChange={(e) => setMarkupFree(e.target.value)}
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Lite Tier
                <Badge className="bg-blue-500/20 text-blue-500">Lite</Badge>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={markupLite}
                  onChange={(e) => setMarkupLite(e.target.value)}
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Pro Tier
                <Badge className="bg-primary/20 text-primary">Pro</Badge>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={markupPro}
                  onChange={(e) => setMarkupPro(e.target.value)}
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Enterprise
                <Badge className="bg-amber-500/20 text-amber-500">Enterprise</Badge>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={markupEnterprise}
                  onChange={(e) => setMarkupEnterprise(e.target.value)}
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          {/* Markup Preview */}
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-3">Price Preview: Buying 10,000 Coins</h4>
            <div className="grid gap-2 md:grid-cols-4">
              {[
                { tier: 'Free', markup: parseFloat(markupFree) || 12 },
                { tier: 'Lite', markup: parseFloat(markupLite) || 10 },
                { tier: 'Pro', markup: parseFloat(markupPro) || 8 },
                { tier: 'Enterprise', markup: parseFloat(markupEnterprise) || 5 },
              ].map(({ tier, markup }) => {
                const basePrice = 10000 * rate;
                const finalPrice = basePrice * (1 + markup / 100);
                return (
                  <div key={tier} className="text-center p-2 bg-background rounded">
                    <p className="text-xs text-muted-foreground">{tier}</p>
                    <p className="font-bold">${finalPrice.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">+{markup}%</p>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Presets</CardTitle>
          <CardDescription>Apply common pricing configurations</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCoinRate("0.001");
              setMarkupFree("12");
              setMarkupLite("10");
              setMarkupPro("8");
              setMarkupEnterprise("5");
            }}
          >
            Default (1000 coins/$1)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCoinRate("0.01");
              setMarkupFree("12");
              setMarkupLite("10");
              setMarkupPro("8");
              setMarkupEnterprise("5");
            }}
          >
            Legacy (100 coins/$1)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCoinRate("0.0001");
              setMarkupFree("15");
              setMarkupLite("12");
              setMarkupPro("10");
              setMarkupEnterprise("7");
            }}
          >
            High Volume (10000 coins/$1)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}