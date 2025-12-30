import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Ticket, 
  Plus, 
  Copy, 
  Trash2, 
  CheckCircle, 
  XCircle,
  Calendar,
  Users,
  DollarSign,
  RefreshCw,
  Percent
} from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { format } from 'date-fns';

export const PromoManager = () => {
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPromo, setNewPromo] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: 10,
    min_order_amount: 0,
    max_discount_amount: null as number | null,
    usage_limit: null as number | null,
    per_user_limit: 1,
    category_restriction: '',
    expires_at: ''
  });

  // Fetch promo codes
  const { data: promoCodes, isLoading, refetch } = useQuery({
    queryKey: ['admin-promo-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  // Create promo code
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('promo_codes')
        .insert({
          code: newPromo.code.toUpperCase().replace(/\s/g, ''),
          discount_type: newPromo.discount_type,
          discount_value: newPromo.discount_value,
          min_order_amount: newPromo.min_order_amount || 0,
          max_discount_amount: newPromo.max_discount_amount,
          usage_limit: newPromo.usage_limit,
          per_user_limit: newPromo.per_user_limit || 1,
          category_restriction: newPromo.category_restriction || null,
          expires_at: newPromo.expires_at || null,
          created_by: user?.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Promo code created');
      queryClient.invalidateQueries({ queryKey: ['admin-promo-codes'] });
      setIsCreateOpen(false);
      setNewPromo({
        code: '',
        discount_type: 'percentage',
        discount_value: 10,
        min_order_amount: 0,
        max_discount_amount: null,
        usage_limit: null,
        per_user_limit: 1,
        category_restriction: '',
        expires_at: ''
      });
    },
    onError: (error) => {
      toast.error('Failed to create promo code: ' + error.message);
    }
  });

  // Toggle promo active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Promo code updated');
      queryClient.invalidateQueries({ queryKey: ['admin-promo-codes'] });
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    }
  });

  // Delete promo code
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Promo code deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-promo-codes'] });
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    }
  });

  // Generate random code
  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'CB-';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPromo({ ...newPromo, code });
  };

  // Copy code to clipboard
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  const activePromos = promoCodes?.filter(p => p.is_active).length || 0;
  const totalUses = promoCodes?.reduce((sum, p) => sum + (p.used_count || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Ticket className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Promos</p>
                <p className="text-2xl font-bold">{promoCodes?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-emerald-500">{activePromos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Uses</p>
                <p className="text-2xl font-bold text-blue-500">{totalUses}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Percent className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Discount</p>
                <p className="text-2xl font-bold text-purple-500">
                  {promoCodes?.length 
                    ? Math.round(promoCodes.reduce((sum, p) => sum + (p.discount_value || 0), 0) / promoCodes.length)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Promo Codes Table */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-primary" />
              Promo Codes
            </CardTitle>
            <CardDescription>Manage discount codes and promotions</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Promo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Promo Code</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Code</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="SUMMER2024"
                        value={newPromo.code}
                        onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value })}
                        className="font-mono"
                      />
                      <Button variant="outline" onClick={generateCode}>Generate</Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Discount Type</Label>
                      <Select 
                        value={newPromo.discount_type} 
                        onValueChange={(v) => setNewPromo({ ...newPromo, discount_type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage Off</SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                          <SelectItem value="free_shipping">Free Shipping</SelectItem>
                          <SelectItem value="bonus_xp">Bonus XP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Discount Value</Label>
                      <Input
                        type="number"
                        placeholder="10"
                        value={newPromo.discount_value}
                        onChange={(e) => setNewPromo({ ...newPromo, discount_value: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min Order Amount</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={newPromo.min_order_amount}
                        onChange={(e) => setNewPromo({ ...newPromo, min_order_amount: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Discount</Label>
                      <Input
                        type="number"
                        placeholder="No limit"
                        value={newPromo.max_discount_amount || ''}
                        onChange={(e) => setNewPromo({ ...newPromo, max_discount_amount: e.target.value ? parseFloat(e.target.value) : null })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Usage Limit (Total)</Label>
                      <Input
                        type="number"
                        placeholder="Unlimited"
                        value={newPromo.usage_limit || ''}
                        onChange={(e) => setNewPromo({ ...newPromo, usage_limit: e.target.value ? parseInt(e.target.value) : null })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Per User Limit</Label>
                      <Input
                        type="number"
                        placeholder="1"
                        value={newPromo.per_user_limit}
                        onChange={(e) => setNewPromo({ ...newPromo, per_user_limit: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Expires At (Optional)</Label>
                    <Input
                      type="datetime-local"
                      value={newPromo.expires_at}
                      onChange={(e) => setNewPromo({ ...newPromo, expires_at: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Category Restriction (Optional)</Label>
                    <Input
                      placeholder="e.g., pokemon, sports"
                      value={newPromo.category_restriction}
                      onChange={(e) => setNewPromo({ ...newPromo, category_restriction: e.target.value })}
                    />
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending || !newPromo.code}
                  >
                    Create Promo Code
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Uses</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promoCodes?.map((promo) => (
                    <TableRow key={promo.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="font-mono bg-muted px-2 py-1 rounded">{promo.code}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyCode(promo.code)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{promo.discount_type.replace('_', ' ')}</TableCell>
                      <TableCell>
                        {promo.discount_type === 'percentage' 
                          ? `${promo.discount_value}%` 
                          : promo.discount_type === 'bonus_xp'
                          ? `${promo.discount_value} XP`
                          : formatPrice(promo.discount_value)}
                      </TableCell>
                      <TableCell>
                        {promo.used_count || 0}
                        {promo.usage_limit && ` / ${promo.usage_limit}`}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {promo.expires_at 
                          ? format(new Date(promo.expires_at), 'MMM dd, yyyy')
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={promo.is_active}
                          onCheckedChange={(checked) => 
                            toggleActiveMutation.mutate({ id: promo.id, isActive: checked })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => deleteMutation.mutate(promo.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
