import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Target, Plus, Trash2, Eye, RefreshCw, Users, TrendingUp,
  Calendar, Gift, Sparkles, Clock
} from 'lucide-react';
import { format, addDays, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

interface Bounty {
  id: string;
  title: string;
  description: string;
  bounty_type: string;
  target_count: number;
  reward_gems: number;
  period_type: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  is_featured: boolean;
  icon: string;
  auto_generated: boolean;
  created_at: string;
}

interface ReferralStats {
  referrer_id: string;
  referrer_name: string;
  grading_count: number;
  sales_count: number;
  total_referrals: number;
}

const BOUNTY_TYPES = [
  { value: 'grading_count', label: 'Grade Cards', icon: '' },
  { value: 'referral_grading', label: 'Referral Gradings', icon: '' },
  { value: 'referral_sales', label: 'Referral Sales', icon: '' },
  { value: 'sale_count', label: 'Sell Cards', icon: '' },
  { value: 'sale_commission', label: 'Commission Cashback (15%)', icon: '' },
  { value: 'listing_count', label: 'List Cards', icon: '' },
];

const ICONS = ['', '', '', '', '', '', '', '', '', ''];

export const BountyManager = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newBounty, setNewBounty] = useState({
    title: '',
    description: '',
    bounty_type: 'grading_count',
    target_count: 5,
    reward_gems: 2000, // $20 in cents
    period_type: 'monthly',
    is_featured: false,
    icon: '🎯',
  });

  // Fetch bounties
  const { data: bounties, isLoading } = useQuery({
    queryKey: ['admin-bounties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bounties')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Bounty[];
    }
  });

  // Fetch referral stats
  const { data: referralStats } = useQuery({
    queryKey: ['admin-referral-stats'],
    queryFn: async () => {
      // Get referral gradings
      const { data: gradings } = await supabase
        .from('referral_gradings')
        .select('referrer_id, profiles!referral_gradings_referrer_id_fkey(display_name)')
        .gte('created_at', startOfMonth(new Date()).toISOString());

      // Get referral sales
      const { data: sales } = await supabase
        .from('referral_sales')
        .select('referrer_id, profiles!referral_sales_referrer_id_fkey(display_name)')
        .gte('created_at', startOfMonth(new Date()).toISOString());

      // Aggregate stats
      const statsMap = new Map<string, ReferralStats>();

      gradings?.forEach((g: any) => {
        const existing = statsMap.get(g.referrer_id) || {
          referrer_id: g.referrer_id,
          referrer_name: g.profiles?.display_name || 'Unknown',
          grading_count: 0,
          sales_count: 0,
          total_referrals: 0,
        };
        existing.grading_count++;
        statsMap.set(g.referrer_id, existing);
      });

      sales?.forEach((s: any) => {
        const existing = statsMap.get(s.referrer_id) || {
          referrer_id: s.referrer_id,
          referrer_name: s.profiles?.display_name || 'Unknown',
          grading_count: 0,
          sales_count: 0,
          total_referrals: 0,
        };
        existing.sales_count++;
        statsMap.set(s.referrer_id, existing);
      });

      return Array.from(statsMap.values()).sort((a, b) => 
        (b.grading_count + b.sales_count) - (a.grading_count + a.sales_count)
      );
    }
  });

  // Create bounty mutation
  const createMutation = useMutation({
    mutationFn: async (bounty: typeof newBounty) => {
      const now = new Date();
      let starts_at: Date;
      let ends_at: Date;

      if (bounty.period_type === 'weekly') {
        starts_at = startOfWeek(now, { weekStartsOn: 1 });
        ends_at = endOfWeek(now, { weekStartsOn: 1 });
      } else {
        starts_at = startOfMonth(now);
        ends_at = endOfMonth(now);
      }

      const { error } = await supabase.from('bounties').insert({
        ...bounty,
        starts_at: starts_at.toISOString(),
        ends_at: ends_at.toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Bounty created!');
      queryClient.invalidateQueries({ queryKey: ['admin-bounties'] });
      setIsCreateOpen(false);
      setNewBounty({
        title: '',
        description: '',
        bounty_type: 'grading_count',
        target_count: 5,
        reward_gems: 2500,
        period_type: 'monthly',
        is_featured: false,
        icon: '🎯',
      });
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  // Toggle bounty status
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('bounties')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bounties'] });
    }
  });

  // Auto-generate bounties
  const autoGenerateMutation = useMutation({
    mutationFn: async (period: 'weekly' | 'monthly') => {
      const now = new Date();
      let starts_at: Date;
      let ends_at: Date;

      if (period === 'weekly') {
        starts_at = startOfWeek(now, { weekStartsOn: 1 });
        ends_at = endOfWeek(now, { weekStartsOn: 1 });
      } else {
        starts_at = startOfMonth(now);
        ends_at = endOfMonth(now);
      }

      const templates = period === 'weekly' ? [
        { title: 'Grade 5 Cards', description: 'Grade 5 cards this week to earn gems', bounty_type: 'grading_count', target_count: 5, reward_gems: 2000, icon: '🧠' },
        { title: 'Sell 10 Cards', description: 'Sell 10 cards - earn 15% of commission back', bounty_type: 'sale_count', target_count: 10, reward_gems: 1500, icon: '🏷️' },
      ] : [
        { title: 'Grading Champion', description: 'Grade 15 cards this month', bounty_type: 'grading_count', target_count: 15, reward_gems: 4000, icon: '🏆', is_featured: true },
        { title: 'Refer & Grade', description: 'Refer 5 friends - if 2 grade cards, earn reward', bounty_type: 'referral_grading', target_count: 2, reward_gems: 500, icon: '👥' },
        { title: 'Sales Commission Bonus', description: 'Sell 20 cards - earn 15% commission back', bounty_type: 'sale_count', target_count: 20, reward_gems: 2500, icon: '💰' },
        { title: 'Listing Sprint', description: 'List 25 cards this month', bounty_type: 'listing_count', target_count: 25, reward_gems: 1000, icon: '📋' },
      ];

      for (const template of templates) {
        await supabase.from('bounties').insert({
          ...template,
          period_type: period,
          starts_at: starts_at.toISOString(),
          ends_at: ends_at.toISOString(),
          auto_generated: true,
        });
      }
    },
    onSuccess: (_, period) => {
      toast.success(`${period === 'weekly' ? 'Weekly' : 'Monthly'} bounties generated!`);
      queryClient.invalidateQueries({ queryKey: ['admin-bounties'] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const activeBounties = bounties?.filter(b => b.is_active && new Date(b.ends_at) > new Date()) || [];
  const expiredBounties = bounties?.filter(b => new Date(b.ends_at) <= new Date()) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-500" />
            Boom Challenges
          </h2>
          <p className="text-sm text-muted-foreground">Create and manage user challenges - first come, first served</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => autoGenerateMutation.mutate('weekly')}
            disabled={autoGenerateMutation.isPending}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Gen Weekly
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => autoGenerateMutation.mutate('monthly')}
            disabled={autoGenerateMutation.isPending}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Gen Monthly
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Create Bounty
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Bounty</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  {ICONS.map(icon => (
                    <Button
                      key={icon}
                      variant={newBounty.icon === icon ? 'default' : 'outline'}
                      className="text-xl h-10"
                      onClick={() => setNewBounty(prev => ({ ...prev, icon }))}
                    >
                      {icon}
                    </Button>
                  ))}
                </div>

                <div>
                  <Label>Title</Label>
                  <Input
                    value={newBounty.title}
                    onChange={(e) => setNewBounty(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Grade 5 cards this month"
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Input
                    value={newBounty.description}
                    onChange={(e) => setNewBounty(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <Select
                      value={newBounty.bounty_type}
                      onValueChange={(v) => setNewBounty(prev => ({ ...prev, bounty_type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BOUNTY_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.icon} {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Period</Label>
                    <Select
                      value={newBounty.period_type}
                      onValueChange={(v) => setNewBounty(prev => ({ ...prev, period_type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Target Count</Label>
                    <Input
                      type="number"
                      value={newBounty.target_count}
                      onChange={(e) => setNewBounty(prev => ({ ...prev, target_count: parseInt(e.target.value) || 1 }))}
                    />
                  </div>

                  <div>
                    <Label>Reward ($ in gems)</Label>
                    <Input
                      type="number"
                      value={newBounty.reward_gems / 100}
                      onChange={(e) => setNewBounty(prev => ({ ...prev, reward_gems: (parseFloat(e.target.value) || 0) * 100 }))}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={newBounty.is_featured}
                    onCheckedChange={(v) => setNewBounty(prev => ({ ...prev, is_featured: v }))}
                  />
                  <Label>Featured (highlighted)</Label>
                </div>

                <Button
                  className="w-full"
                  onClick={() => createMutation.mutate(newBounty)}
                  disabled={!newBounty.title || createMutation.isPending}
                >
                  Create Bounty
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{activeBounties.length}</p>
                <p className="text-sm text-muted-foreground">Active Bounties</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Gift className="w-8 h-8 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold">
                  ${((activeBounties.reduce((s, b) => s + b.reward_gems, 0)) / 100).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Rewards</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{referralStats?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Active Referrers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">
                  {referralStats?.reduce((s, r) => s + r.grading_count, 0) || 0}
                </p>
                <p className="text-sm text-muted-foreground">Referral Gradings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bounties">
        <TabsList>
          <TabsTrigger value="bounties">Active Bounties</TabsTrigger>
          <TabsTrigger value="referrals">Referral Leaderboard</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
        </TabsList>

        <TabsContent value="bounties">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bounty</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Ends</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeBounties.map(bounty => (
                    <TableRow key={bounty.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{bounty.icon}</span>
                          <div>
                            <p className="font-medium">{bounty.title}</p>
                            <p className="text-xs text-muted-foreground">{bounty.description}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {BOUNTY_TYPES.find(t => t.value === bounty.bounty_type)?.label || bounty.bounty_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{bounty.target_count}</TableCell>
                      <TableCell className="text-amber-500 font-bold">
                        ${(bounty.reward_gems / 100).toFixed(0)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={bounty.period_type === 'weekly' ? 'secondary' : 'default'}>
                          {bounty.period_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(bounty.ends_at), 'MMM dd')}
                      </TableCell>
                      <TableCell>
                        {bounty.is_featured && (
                          <Badge className="bg-amber-500">Featured</Badge>
                        )}
                        {bounty.auto_generated && (
                          <Badge variant="outline" className="ml-1">Auto</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={bounty.is_active}
                          onCheckedChange={(v) => toggleMutation.mutate({ id: bounty.id, is_active: v })}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {activeBounties.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No active bounties. Create one or generate weekly/monthly bounties.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals">
          <Card>
            <CardHeader>
              <CardTitle>Referral Activity (This Month)</CardTitle>
              <CardDescription>Track gradings and sales from referred users</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Referral Gradings</TableHead>
                    <TableHead>Referral Sales</TableHead>
                    <TableHead>Total Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referralStats?.map(stat => (
                    <TableRow key={stat.referrer_id}>
                      <TableCell className="font-medium">{stat.referrer_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{stat.grading_count} gradings</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{stat.sales_count} sales</Badge>
                      </TableCell>
                      <TableCell className="font-bold text-primary">
                        {stat.grading_count + stat.sales_count}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!referralStats || referralStats.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No referral activity this month
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expired">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bounty</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead>Ended</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiredBounties.slice(0, 20).map(bounty => (
                    <TableRow key={bounty.id} className="opacity-60">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{bounty.icon}</span>
                          <span>{bounty.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>{bounty.bounty_type}</TableCell>
                      <TableCell>{bounty.target_count}</TableCell>
                      <TableCell>${(bounty.reward_gems / 100).toFixed(0)}</TableCell>
                      <TableCell>{format(new Date(bounty.ends_at), 'MMM dd, yyyy')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};