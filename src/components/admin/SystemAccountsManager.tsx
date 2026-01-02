import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Users, 
  Plus, 
  RefreshCw, 
  Bot,
  ShoppingCart,
  Store,
  Sparkles,
  DollarSign,
  Activity,
  Settings,
  Wallet
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useCurrency } from '@/contexts/CurrencyContext';

interface SystemAccount {
  id: string;
  display_name: string;
  avatar_url: string | null;
  email: string;
  system_account_role: string | null;
  system_account_wallet_balance: number;
  last_auto_action_at: string | null;
  auto_actions_count: number;
  is_fan_account: boolean;
  created_at: string;
}

const ACCOUNT_ROLES = [
  { value: 'buyer', label: 'Auto-Buyer', icon: ShoppingCart, color: 'bg-blue-500', description: 'Purchases undervalued listings' },
  { value: 'seller', label: 'Re-lister', icon: Store, color: 'bg-green-500', description: 'Creates organic-looking listings' },
  { value: 'engagement', label: 'Engagement', icon: Sparkles, color: 'bg-purple-500', description: 'Likes, comments, follows' },
  { value: 'mixed', label: 'Mixed Activity', icon: Activity, color: 'bg-orange-500', description: 'All activities for realism' },
];

export function SystemAccountsManager() {
  const [accounts, setAccounts] = useState<SystemAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFundDialog, setShowFundDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<SystemAccount | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { formatPrice } = useCurrency();

  // Form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newBio, setNewBio] = useState('');
  const [newRole, setNewRole] = useState<string>('buyer');
  const [fundAmount, setFundAmount] = useState('1000');

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, email, system_account_role, system_account_wallet_balance, last_auto_action_at, auto_actions_count, is_fan_account, created_at')
        .or('is_fan_account.eq.true,system_account_role.not.is.null')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts((data || []) as SystemAccount[]);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to fetch accounts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleCreateAccount = async () => {
    if (!newName || !newEmail) {
      toast.error('Please fill in name and email');
      return;
    }

    setIsCreating(true);
    try {
      const accountId = crypto.randomUUID();
      
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: accountId,
          display_name: newName,
          email: newEmail,
          bio: newBio,
          account_type: 'buyer',
          is_fan_account: true,
          system_account_role: newRole,
          system_account_wallet_balance: 0,
          auto_actions_count: 0,
          account_status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success(`System account "${newName}" created!`);
      setShowCreateDialog(false);
      setNewName('');
      setNewEmail('');
      setNewBio('');
      setNewRole('buyer');
      fetchAccounts();
    } catch (error) {
      console.error('Error creating account:', error);
      toast.error('Failed to create account');
    } finally {
      setIsCreating(false);
    }
  };

  const handleFundAccount = async () => {
    if (!selectedAccount) return;
    
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          system_account_wallet_balance: (selectedAccount.system_account_wallet_balance || 0) + amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedAccount.id);

      if (error) throw error;

      toast.success(`Added ${formatPrice(amount)} to ${selectedAccount.display_name}`);
      setShowFundDialog(false);
      setFundAmount('1000');
      fetchAccounts();
    } catch (error) {
      console.error('Error funding account:', error);
      toast.error('Failed to fund account');
    }
  };

  const handleUpdateRole = async (accountId: string, role: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          system_account_role: role,
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId);

      if (error) throw error;
      toast.success('Role updated');
      fetchAccounts();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const getRoleBadge = (role: string | null) => {
    if (!role) return <Badge variant="outline">Unassigned</Badge>;
    const roleData = ACCOUNT_ROLES.find(r => r.value === role);
    if (!roleData) return <Badge variant="outline">{role}</Badge>;
    return (
      <Badge className={`${roleData.color} text-white`}>
        {roleData.label}
      </Badge>
    );
  };

  // Stats
  const buyerAccounts = accounts.filter(a => a.system_account_role === 'buyer' || a.system_account_role === 'mixed');
  const sellerAccounts = accounts.filter(a => a.system_account_role === 'seller' || a.system_account_role === 'mixed');
  const engagementAccounts = accounts.filter(a => a.system_account_role === 'engagement' || a.system_account_role === 'mixed');
  const totalBalance = accounts.reduce((sum, a) => sum + (a.system_account_wallet_balance || 0), 0);
  const totalActions = accounts.reduce((sum, a) => sum + (a.auto_actions_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            System Accounts
          </h2>
          <p className="text-muted-foreground">Manage CardBoom system accounts for organic marketplace activity</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create System Account</DialogTitle>
                <DialogDescription>
                  Create a new account for automated marketplace activity
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Display Name *</Label>
                  <Input
                    placeholder="CardCollector_Pro"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    placeholder="account@cardboom.internal"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Textarea
                    placeholder="Passionate collector since 2010..."
                    value={newBio}
                    onChange={(e) => setNewBio(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Role</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_ROLES.map(role => (
                        <SelectItem key={role.value} value={role.value}>
                          <div className="flex items-center gap-2">
                            <role.icon className="w-4 h-4" />
                            <span>{role.label}</span>
                            <span className="text-xs text-muted-foreground">- {role.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                <Button onClick={handleCreateAccount} disabled={isCreating}>
                  {isCreating ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="ghost" size="icon" onClick={fetchAccounts}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{accounts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <ShoppingCart className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Buyers</p>
                <p className="text-2xl font-bold">{buyerAccounts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Store className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sellers</p>
                <p className="text-2xl font-bold">{sellerAccounts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gold/10">
                <DollarSign className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Balance</p>
                <p className="text-xl font-bold">{formatPrice(totalBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Activity className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Actions</p>
                <p className="text-2xl font-bold">{totalActions.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>All System Accounts</CardTitle>
          <CardDescription>Accounts used for automated marketplace activity</CardDescription>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No system accounts yet. Create one to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Manage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{account.display_name || 'Unnamed'}</p>
                        <p className="text-xs text-muted-foreground">{account.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={account.system_account_role || 'unassigned'}
                        onValueChange={(value) => handleUpdateRole(account.id, value)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue>{getRoleBadge(account.system_account_role)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {ACCOUNT_ROLES.map(role => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(account.system_account_wallet_balance || 0)}
                    </TableCell>
                    <TableCell>{account.auto_actions_count || 0}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {account.last_auto_action_at
                        ? formatDistanceToNow(new Date(account.last_auto_action_at), { addSuffix: true })
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAccount(account);
                          setShowFundDialog(true);
                        }}
                        className="gap-1"
                      >
                        <Wallet className="w-3 h-3" />
                        Fund
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Fund Dialog */}
      <Dialog open={showFundDialog} onOpenChange={setShowFundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fund Account</DialogTitle>
            <DialogDescription>
              Add balance to {selectedAccount?.display_name}'s wallet for auto-buy operations
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-2xl font-bold">{formatPrice(selectedAccount?.system_account_wallet_balance || 0)}</p>
            </div>
            <div className="space-y-2">
              <Label>Amount to Add ($)</Label>
              <Input
                type="number"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                min="1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFundDialog(false)}>Cancel</Button>
            <Button onClick={handleFundAccount}>
              <DollarSign className="w-4 h-4 mr-2" />
              Add {formatPrice(parseFloat(fundAmount) || 0)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
