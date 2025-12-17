import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Crown, Zap, Clock, Eye, DollarSign, Gift,
  Users, CheckCircle, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function WhaleInviteManager() {
  const queryClient = useQueryClient();
  const [newInvite, setNewInvite] = useState({
    user_email: '',
    invite_tier: 'silver_whale',
    payout_speed_hours: '24',
    fee_discount_percent: '10',
    notes: ''
  });

  const { data: whaleInvites, isLoading } = useQuery({
    queryKey: ['whale-invites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whale_invites')
        .select(`
          *,
          profile:profiles!whale_invites_user_id_fkey (
            display_name,
            email
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const createInviteMutation = useMutation({
    mutationFn: async (invite: typeof newInvite) => {
      // First find the user by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', invite.user_email)
        .single();

      if (profileError || !profile) {
        throw new Error('User not found with that email');
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('whale_invites')
        .insert({
          user_id: profile.id,
          invite_tier: invite.invite_tier,
          payout_speed_hours: parseInt(invite.payout_speed_hours),
          fee_discount_percent: parseFloat(invite.fee_discount_percent),
          notes: invite.notes,
          invited_by: user?.id,
          faster_payouts: true,
          private_liquidity_access: true,
          early_exit_warnings: true
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Whale invite sent');
      queryClient.invalidateQueries({ queryKey: ['whale-invites'] });
      setNewInvite({
        user_email: '',
        invite_tier: 'silver_whale',
        payout_speed_hours: '24',
        fee_discount_percent: '10',
        notes: ''
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send invite');
    }
  });

  const revokeInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('whale_invites')
        .update({ is_active: false })
        .eq('id', inviteId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Invite revoked');
      queryClient.invalidateQueries({ queryKey: ['whale-invites'] });
    }
  });

  const getTierConfig = (tier: string) => {
    switch (tier) {
      case 'platinum_whale':
        return { 
          color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
          icon: Crown,
          label: 'Platinum Whale'
        };
      case 'gold_whale':
        return { 
          color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30',
          icon: Star,
          label: 'Gold Whale'
        };
      default:
        return { 
          color: 'text-gray-400 bg-gray-400/10 border-gray-400/30',
          icon: Users,
          label: 'Silver Whale'
        };
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Whale Seller Program
          </CardTitle>
          <CardDescription>
            Quietly invite high-volume sellers with exclusive perks. Not advertised — offered via invite only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Benefits Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <Clock className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <div className="text-sm font-medium">Faster Payouts</div>
              <div className="text-xs text-muted-foreground">24h → 4h</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <Eye className="h-6 w-6 mx-auto mb-2 text-purple-500" />
              <div className="text-sm font-medium">Private Liquidity</div>
              <div className="text-xs text-muted-foreground">Exclusive data</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <Zap className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
              <div className="text-sm font-medium">Early Warnings</div>
              <div className="text-xs text-muted-foreground">Exit alerts</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <DollarSign className="h-6 w-6 mx-auto mb-2 text-green-500" />
              <div className="text-sm font-medium">Fee Discount</div>
              <div className="text-xs text-muted-foreground">Up to 20%</div>
            </div>
          </div>

          {/* New Invite Form */}
          <div className="border border-border rounded-lg p-4">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Send Invite
            </h4>
            <div className="grid gap-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>User Email</Label>
                  <Input
                    value={newInvite.user_email}
                    onChange={(e) => setNewInvite(prev => ({ ...prev, user_email: e.target.value }))}
                    placeholder="seller@example.com"
                  />
                </div>
                <div>
                  <Label>Tier</Label>
                  <Select
                    value={newInvite.invite_tier}
                    onValueChange={(v) => setNewInvite(prev => ({ ...prev, invite_tier: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="silver_whale">Silver Whale</SelectItem>
                      <SelectItem value="gold_whale">Gold Whale</SelectItem>
                      <SelectItem value="platinum_whale">Platinum Whale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Payout Speed (hours)</Label>
                  <Input
                    type="number"
                    value={newInvite.payout_speed_hours}
                    onChange={(e) => setNewInvite(prev => ({ ...prev, payout_speed_hours: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Fee Discount (%)</Label>
                  <Input
                    type="number"
                    value={newInvite.fee_discount_percent}
                    onChange={(e) => setNewInvite(prev => ({ ...prev, fee_discount_percent: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label>Notes (Internal)</Label>
                <Input
                  value={newInvite.notes}
                  onChange={(e) => setNewInvite(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Why is this seller being invited?"
                />
              </div>
              <Button
                onClick={() => createInviteMutation.mutate(newInvite)}
                disabled={!newInvite.user_email || createInviteMutation.isPending}
                className="gap-2"
              >
                <Gift className="h-4 w-4" />
                Send Whale Invite
              </Button>
            </div>
          </div>

          {/* Active Invites */}
          <div>
            <h4 className="font-medium mb-4">Active Whale Sellers</h4>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : whaleInvites?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No whale sellers yet
              </div>
            ) : (
              <div className="space-y-3">
                {whaleInvites?.map((invite: any) => {
                  const tierConfig = getTierConfig(invite.invite_tier);
                  const TierIcon = tierConfig.icon;
                  
                  return (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <Badge className={tierConfig.color}>
                          <TierIcon className="h-3 w-3 mr-1" />
                          {tierConfig.label}
                        </Badge>
                        <div>
                          <div className="font-medium">
                            {invite.profile?.display_name || invite.profile?.email || 'Unknown'}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-3">
                            <span>{invite.payout_speed_hours}h payouts</span>
                            <span>{invite.fee_discount_percent}% discount</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeInviteMutation.mutate(invite.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        Revoke
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
