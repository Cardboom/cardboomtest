import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Shield, DollarSign, Save, RefreshCw, Clock, Users, TrendingUp } from "lucide-react";

interface PlatformSetting {
  id: string;
  key: string;
  value: any;
  created_at: string;
  updated_at: string;
}

interface GradingTier {
  price: string;
  daysMin: string;
  daysMax: string;
}

export function GradingPricingManager() {
  const queryClient = useQueryClient();
  
  // Grading tier pricing
  const [standardTier, setStandardTier] = useState<GradingTier>({ price: "18", daysMin: "20", daysMax: "25" });
  const [expressTier, setExpressTier] = useState<GradingTier>({ price: "35", daysMin: "7", daysMax: "10" });
  const [priorityTier, setPriorityTier] = useState<GradingTier>({ price: "75", daysMin: "2", daysMax: "3" });
  
  // Referral/Creator settings
  const [referralCommissionRate, setReferralCommissionRate] = useState("10");
  const [creatorRevenueShare, setCreatorRevenueShare] = useState("15");

  // Fetch platform settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['grading-pricing-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .in('key', [
          'grading_price_standard',
          'grading_price_express',
          'grading_price_priority',
          'grading_days_standard_min',
          'grading_days_standard_max',
          'grading_days_express_min',
          'grading_days_express_max',
          'grading_days_priority_min',
          'grading_days_priority_max',
          'grading_referral_commission_rate',
          'grading_creator_revenue_share'
        ]);
      
      if (error) throw error;
      return data as PlatformSetting[];
    }
  });

  // Fetch referral stats
  const { data: referralStats } = useQuery({
    queryKey: ['grading-referral-stats'],
    queryFn: async () => {
      const { data: gradings, error: gradingsError } = await supabase
        .from('referral_gradings')
        .select('id, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      
      const { data: commissions } = await supabase
        .from('referral_commissions')
        .select('commission_amount, event_type')
        .eq('event_type', 'grading')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const { data: creatorEarnings } = await supabase
        .from('creator_earnings')
        .select('creator_earnings_cents, source_type')
        .eq('source_type', 'grading_order')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      return {
        referralGradings: gradings?.length || 0,
        referralCommissions: commissions?.reduce((sum, c) => sum + Number(c.commission_amount || 0), 0) || 0,
        creatorEarnings: (creatorEarnings?.reduce((sum, e) => sum + Number(e.creator_earnings_cents || 0), 0) || 0) / 100,
      };
    }
  });

  // Initialize form values from settings
  useEffect(() => {
    if (settings) {
      settings.forEach(s => {
        const val = typeof s.value === 'string' ? s.value.replace(/"/g, '') : String(s.value);
        switch (s.key) {
          case 'grading_price_standard':
            setStandardTier(prev => ({ ...prev, price: val }));
            break;
          case 'grading_price_express':
            setExpressTier(prev => ({ ...prev, price: val }));
            break;
          case 'grading_price_priority':
            setPriorityTier(prev => ({ ...prev, price: val }));
            break;
          case 'grading_days_standard_min':
            setStandardTier(prev => ({ ...prev, daysMin: val }));
            break;
          case 'grading_days_standard_max':
            setStandardTier(prev => ({ ...prev, daysMax: val }));
            break;
          case 'grading_days_express_min':
            setExpressTier(prev => ({ ...prev, daysMin: val }));
            break;
          case 'grading_days_express_max':
            setExpressTier(prev => ({ ...prev, daysMax: val }));
            break;
          case 'grading_days_priority_min':
            setPriorityTier(prev => ({ ...prev, daysMin: val }));
            break;
          case 'grading_days_priority_max':
            setPriorityTier(prev => ({ ...prev, daysMax: val }));
            break;
          case 'grading_referral_commission_rate':
            setReferralCommissionRate(String(parseFloat(val) * 100));
            break;
          case 'grading_creator_revenue_share':
            setCreatorRevenueShare(String(parseFloat(val) * 100));
            break;
        }
      });
    }
  }, [settings]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = [
        { key: 'grading_price_standard', value: standardTier.price },
        { key: 'grading_price_express', value: expressTier.price },
        { key: 'grading_price_priority', value: priorityTier.price },
        { key: 'grading_days_standard_min', value: standardTier.daysMin },
        { key: 'grading_days_standard_max', value: standardTier.daysMax },
        { key: 'grading_days_express_min', value: expressTier.daysMin },
        { key: 'grading_days_express_max', value: expressTier.daysMax },
        { key: 'grading_days_priority_min', value: priorityTier.daysMin },
        { key: 'grading_days_priority_max', value: priorityTier.daysMax },
        { key: 'grading_referral_commission_rate', value: String(parseFloat(referralCommissionRate) / 100) },
        { key: 'grading_creator_revenue_share', value: String(parseFloat(creatorRevenueShare) / 100) },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('platform_settings')
          .upsert({ key: update.key, value: update.value }, { onConflict: 'key' });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Grading pricing updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['grading-pricing-settings'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to save: ${error.message}`);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Grading Pricing Pipeline
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure grading tier pricing and referral/creator revenue shares
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

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Referral Gradings (30d)</p>
                <p className="text-2xl font-bold">{referralStats?.referralGradings || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-gain/30 bg-gain/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gain/10">
                <DollarSign className="w-5 h-5 text-gain" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Referral Commissions (30d)</p>
                <p className="text-2xl font-bold">${referralStats?.referralCommissions?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <TrendingUp className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Creator Earnings (30d)</p>
                <p className="text-2xl font-bold">${referralStats?.creatorEarnings?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tier Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Grading Tier Pricing
          </CardTitle>
          <CardDescription>
            Set pricing and turnaround times for each grading speed tier
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Standard Tier */}
          <div className="p-4 border rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Standard Tier</h4>
              <Badge variant="outline">Best Value</Badge>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Price (USD)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="1"
                    max="500"
                    value={standardTier.price}
                    onChange={(e) => setStandardTier(prev => ({ ...prev, price: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Min Days</Label>
                <Input
                  type="number"
                  min="1"
                  max="90"
                  value={standardTier.daysMin}
                  onChange={(e) => setStandardTier(prev => ({ ...prev, daysMin: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Days</Label>
                <Input
                  type="number"
                  min="1"
                  max="90"
                  value={standardTier.daysMax}
                  onChange={(e) => setStandardTier(prev => ({ ...prev, daysMax: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Express Tier */}
          <div className="p-4 border border-primary/30 rounded-lg space-y-4 bg-primary/5">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Express Tier</h4>
              <Badge className="bg-primary">Popular</Badge>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Price (USD)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="1"
                    max="500"
                    value={expressTier.price}
                    onChange={(e) => setExpressTier(prev => ({ ...prev, price: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Min Days</Label>
                <Input
                  type="number"
                  min="1"
                  max="90"
                  value={expressTier.daysMin}
                  onChange={(e) => setExpressTier(prev => ({ ...prev, daysMin: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Days</Label>
                <Input
                  type="number"
                  min="1"
                  max="90"
                  value={expressTier.daysMax}
                  onChange={(e) => setExpressTier(prev => ({ ...prev, daysMax: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Priority Tier */}
          <div className="p-4 border border-amber-500/30 rounded-lg space-y-4 bg-amber-500/5">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Priority Tier</h4>
              <Badge className="bg-amber-500">Rush</Badge>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Price (USD)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="1"
                    max="500"
                    value={priorityTier.price}
                    onChange={(e) => setPriorityTier(prev => ({ ...prev, price: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Min Days</Label>
                <Input
                  type="number"
                  min="1"
                  max="90"
                  value={priorityTier.daysMin}
                  onChange={(e) => setPriorityTier(prev => ({ ...prev, daysMin: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Days</Label>
                <Input
                  type="number"
                  min="1"
                  max="90"
                  value={priorityTier.daysMax}
                  onChange={(e) => setPriorityTier(prev => ({ ...prev, daysMax: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral & Creator Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Referral & Creator Revenue Share
          </CardTitle>
          <CardDescription>
            Configure commission rates for referral partners and creators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 border rounded-lg space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Referral Commission
              </h4>
              <p className="text-sm text-muted-foreground">
                Percentage of grading revenue paid to referrers when referred users complete grading
              </p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={referralCommissionRate}
                  onChange={(e) => setReferralCommissionRate(e.target.value)}
                  className="w-24"
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Example: At 10%, a $18 grading order pays $1.80 to the referrer
              </p>
            </div>

            <div className="p-4 border rounded-lg space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                Creator Revenue Share
              </h4>
              <p className="text-sm text-muted-foreground">
                Percentage of platform fee credited to creators when their audience uses grading
              </p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={creatorRevenueShare}
                  onChange={(e) => setCreatorRevenueShare(e.target.value)}
                  className="w-24"
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Example: At 15%, a $3 platform fee pays $0.45 to the creator
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle>Frontend Preview</CardTitle>
          <CardDescription>How pricing will appear to users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[
              { name: 'Standard', tier: standardTier, badge: 'Best Value' },
              { name: 'Express', tier: expressTier, badge: 'Popular', highlight: true },
              { name: 'Priority', tier: priorityTier, badge: 'Rush' },
            ].map(({ name, tier, badge, highlight }) => (
              <div 
                key={name} 
                className={`p-4 rounded-lg border text-center ${highlight ? 'border-primary bg-primary/5' : ''}`}
              >
                <Badge variant={highlight ? 'default' : 'outline'} className="mb-2">{badge}</Badge>
                <h4 className="font-medium">{name}</h4>
                <p className="text-3xl font-bold text-primary my-2">${tier.price}</p>
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <Clock className="w-4 h-4" />
                  {tier.daysMin}-{tier.daysMax} days
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
