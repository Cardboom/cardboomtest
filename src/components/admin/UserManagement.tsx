import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  RefreshCw, 
  Search, 
  User,
  Mail,
  Phone,
  Shield,
  ShieldX,
  Pause,
  Play,
  Eye,
  MessageSquare,
  Wallet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Crown,
  Gift,
  Calendar,
  MapPin,
  Globe,
  CreditCard,
  Plus,
  Minus,
  IdCard,
  Building
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UserProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  phone_verified: boolean | null;
  is_id_verified: boolean | null;
  account_status: string;
  account_type: string;
  created_at: string;
  xp: number | null;
  level: number | null;
  banned_at: string | null;
  banned_reason: string | null;
  paused_at: string | null;
  paused_until: string | null;
  full_name: string | null;
  national_id: string | null;
  location: string | null;
  last_ip_address: string | null;
  last_location: string | null;
  last_login_at: string | null;
  country_code: string | null;
}

interface LoginHistory {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  location: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
}

interface WalletData {
  id: string;
  balance: number;
  user_id: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  fee: number | null;
  description: string | null;
  created_at: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  listing_id: string;
}

interface WireTransfer {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  sender_name: string | null;
}

interface UserSubscription {
  id: string;
  user_id: string;
  tier: 'free' | 'pro' | 'enterprise';
  expires_at: string | null;
  started_at: string | null;
}

export const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [wallets, setWallets] = useState<Record<string, WalletData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // User detail dialog
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [userTransactions, setUserTransactions] = useState<Transaction[]>([]);
  const [userComments, setUserComments] = useState<Comment[]>([]);
  const [userTransfers, setUserTransfers] = useState<WireTransfer[]>([]);
  const [userLoginHistory, setUserLoginHistory] = useState<LoginHistory[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Ban/Pause dialogs
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [pauseDuration, setPauseDuration] = useState('7');
  const [isProcessing, setIsProcessing] = useState(false);

  // Subscription management (Pro/Enterprise)
  const [subscriptions, setSubscriptions] = useState<Record<string, UserSubscription>>({});
  const [proDialogOpen, setProDialogOpen] = useState(false);
  const [enterpriseDialogOpen, setEnterpriseDialogOpen] = useState(false);
  const [proDuration, setProDuration] = useState('30');
  const [enterpriseDuration, setEnterpriseDuration] = useState('30');
  const [selectedUserSubscription, setSelectedUserSubscription] = useState<UserSubscription | null>(null);

  // Balance adjustment
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceType, setBalanceType] = useState<'add' | 'remove'>('add');
  const [balanceReason, setBalanceReason] = useState('');

  // Boom Coins adjustment
  const [boomCoinsDialogOpen, setBoomCoinsDialogOpen] = useState(false);
  const [boomCoinsAmount, setBoomCoinsAmount] = useState('');
  const [boomCoinsType, setBoomCoinsType] = useState<'add' | 'remove'>('add');
  const [boomCoinsReason, setBoomCoinsReason] = useState('');
  const [userBoomCoins, setUserBoomCoins] = useState<Record<string, { balance: number }>>({});

  // Role management
  const [userRoles, setUserRoles] = useState<Record<string, string[]>>({});
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'moderator' | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data: profilesData, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(profilesData || []);

      // Fetch all wallets
      const { data: walletsData } = await supabase
        .from('wallets')
        .select('*');

      if (walletsData) {
        const walletMap: Record<string, WalletData> = {};
        walletsData.forEach(w => {
          walletMap[w.user_id] = w;
        });
        setWallets(walletMap);
      }

      // Fetch all subscriptions
      const { data: subsData } = await supabase
        .from('user_subscriptions')
        .select('*');

      if (subsData) {
        const subMap: Record<string, UserSubscription> = {};
        subsData.forEach(s => {
          subMap[s.user_id] = s as UserSubscription;
        });
        setSubscriptions(subMap);
      }

      // Fetch all boom coins balances
      const { data: boomData } = await supabase
        .from('cardboom_points')
        .select('user_id, balance');

      if (boomData) {
        const boomMap: Record<string, { balance: number }> = {};
        boomData.forEach(b => {
          boomMap[b.user_id] = { balance: b.balance };
        });
        setUserBoomCoins(boomMap);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (error) throw error;
      
      const roleMap: Record<string, string[]> = {};
      (data || []).forEach(r => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });
      setUserRoles(roleMap);
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchUserRoles();
  }, []);

  const fetchUserDetails = async (user: UserProfile) => {
    setLoadingDetails(true);
    try {
      // Fetch transactions
      const wallet = wallets[user.id];
      if (wallet) {
        const { data: txData } = await supabase
          .from('transactions')
          .select('*')
          .eq('wallet_id', wallet.id)
          .order('created_at', { ascending: false })
          .limit(20);
        setUserTransactions(txData || []);
      }

      // Fetch comments
      const { data: commentsData } = await supabase
        .from('listing_comments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setUserComments(commentsData || []);

      // Fetch wire transfers
      const { data: transfersData } = await supabase
        .from('wire_transfers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setUserTransfers(transfersData || []);

      // Fetch login history
      const { data: loginData } = await supabase
        .from('user_login_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setUserLoginHistory(loginData || []);
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewUser = async (user: UserProfile) => {
    setSelectedUser(user);
    setSelectedUserSubscription(subscriptions[user.id] || null);
    setUserDetailOpen(true);
    await fetchUserDetails(user);
  };

  const isUserPro = (userId: string) => {
    const sub = subscriptions[userId];
    if (!sub) return false;
    if (sub.tier !== 'pro' && sub.tier !== 'enterprise') return false;
    if (sub.expires_at && new Date(sub.expires_at) < new Date()) return false;
    return true;
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          account_status: 'banned',
          banned_at: new Date().toISOString(),
          banned_reason: actionReason || 'Violation of terms of service',
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Send ban notification email
      try {
        await supabase.functions.invoke('send-account-status-email', {
          body: {
            user_id: selectedUser.id,
            status: 'banned',
            reason: actionReason || 'Violation of terms of service',
          },
        });
      } catch (emailError) {
        console.error('Failed to send ban email:', emailError);
      }

      toast.success(`User ${selectedUser.display_name} has been banned`);
      setBanDialogOpen(false);
      setActionReason('');
      fetchUsers();
      
      // Update selected user
      setSelectedUser({
        ...selectedUser,
        account_status: 'banned',
        banned_at: new Date().toISOString(),
        banned_reason: actionReason,
      });
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePauseUser = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);
    try {
      const pausedUntil = new Date();
      pausedUntil.setDate(pausedUntil.getDate() + parseInt(pauseDuration));

      const { error } = await supabase
        .from('profiles')
        .update({
          account_status: 'paused',
          paused_at: new Date().toISOString(),
          paused_until: pausedUntil.toISOString(),
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Send pause notification email
      try {
        await supabase.functions.invoke('send-account-status-email', {
          body: {
            user_id: selectedUser.id,
            status: 'paused',
            paused_until: pausedUntil.toISOString(),
          },
        });
      } catch (emailError) {
        console.error('Failed to send pause email:', emailError);
      }

      toast.success(`User ${selectedUser.display_name} has been paused for ${pauseDuration} days`);
      setPauseDialogOpen(false);
      setPauseDuration('7');
      fetchUsers();
      
      setSelectedUser({
        ...selectedUser,
        account_status: 'paused',
        paused_at: new Date().toISOString(),
        paused_until: pausedUntil.toISOString(),
      });
    } catch (error) {
      console.error('Error pausing user:', error);
      toast.error('Failed to pause user');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnbanUser = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          account_status: 'active',
          banned_at: null,
          banned_reason: null,
          paused_at: null,
          paused_until: null,
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success(`User ${selectedUser.display_name} account has been restored`);
      fetchUsers();
      
      setSelectedUser({
        ...selectedUser,
        account_status: 'active',
        banned_at: null,
        banned_reason: null,
        paused_at: null,
        paused_until: null,
      });
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast.error('Failed to restore user');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGrantPro = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(proDuration));

      const existingSub = subscriptions[selectedUser.id];

      if (existingSub) {
        const { error } = await supabase
          .from('user_subscriptions')
          .update({
            tier: 'pro',
            started_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            auto_renew: false,
          })
          .eq('user_id', selectedUser.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: selectedUser.id,
            tier: 'pro',
            price_monthly: 0,
            started_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            auto_renew: false,
          });

        if (error) throw error;
      }

      toast.success(`Pro subscription granted to ${selectedUser.display_name} for ${proDuration} days`);
      setProDialogOpen(false);
      setProDuration('30');
      fetchUsers();
      
      // Update local subscription state
      setSubscriptions(prev => ({
        ...prev,
        [selectedUser.id]: {
          id: existingSub?.id || '',
          user_id: selectedUser.id,
          tier: 'pro',
          expires_at: expiresAt.toISOString(),
          started_at: new Date().toISOString(),
        }
      }));
      setSelectedUserSubscription({
        id: existingSub?.id || '',
        user_id: selectedUser.id,
        tier: 'pro',
        expires_at: expiresAt.toISOString(),
        started_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error granting Pro:', error);
      toast.error('Failed to grant Pro subscription');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevokePro = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          tier: 'free',
          expires_at: new Date().toISOString(),
        })
        .eq('user_id', selectedUser.id);

      if (error) throw error;

      toast.success(`Pro subscription revoked from ${selectedUser.display_name}`);
      fetchUsers();
      
      setSubscriptions(prev => ({
        ...prev,
        [selectedUser.id]: {
          ...prev[selectedUser.id],
          tier: 'free',
          expires_at: new Date().toISOString(),
        }
      }));
      setSelectedUserSubscription(null);
    } catch (error) {
      console.error('Error revoking Pro:', error);
      toast.error('Failed to revoke Pro subscription');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGrantEnterprise = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(enterpriseDuration));

      const existingSub = subscriptions[selectedUser.id];

      if (existingSub) {
        const { error } = await supabase
          .from('user_subscriptions')
          .update({
            tier: 'enterprise',
            started_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            auto_renew: false,
            price_monthly: 50,
          })
          .eq('user_id', selectedUser.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: selectedUser.id,
            tier: 'enterprise',
            price_monthly: 50,
            started_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            auto_renew: false,
          });

        if (error) throw error;
      }

      toast.success(`Enterprise subscription granted to ${selectedUser.display_name} for ${enterpriseDuration} days`);
      setEnterpriseDialogOpen(false);
      setEnterpriseDuration('30');
      fetchUsers();
      
      // Update local subscription state
      setSubscriptions(prev => ({
        ...prev,
        [selectedUser.id]: {
          id: existingSub?.id || '',
          user_id: selectedUser.id,
          tier: 'enterprise',
          expires_at: expiresAt.toISOString(),
          started_at: new Date().toISOString(),
        }
      }));
      setSelectedUserSubscription({
        id: existingSub?.id || '',
        user_id: selectedUser.id,
        tier: 'enterprise',
        expires_at: expiresAt.toISOString(),
        started_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error granting Enterprise:', error);
      toast.error('Failed to grant Enterprise subscription');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAssignRole = async (role: 'admin' | 'moderator') => {
    if (!selectedUser) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: selectedUser.id, role });

      if (error) {
        if (error.code === '23505') {
          toast.error(`User already has ${role} role`);
        } else {
          throw error;
        }
      } else {
        toast.success(`${role.charAt(0).toUpperCase() + role.slice(1)} role assigned to ${selectedUser.display_name}`);
        fetchUserRoles();
      }
      setRoleDialogOpen(false);
    } catch (error) {
      console.error('Error assigning role:', error);
      toast.error('Failed to assign role');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveRole = async (role: 'admin' | 'moderator' | 'user') => {
    if (!selectedUser) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedUser.id)
        .eq('role', role);

      if (error) throw error;

      toast.success(`${role.charAt(0).toUpperCase() + role.slice(1)} role removed from ${selectedUser.display_name}`);
      fetchUserRoles();
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error('Failed to remove role');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('listing_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      toast.success('Comment deleted');
      setUserComments(prev => prev.filter(c => c.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const handleAdjustBalance = async () => {
    if (!selectedUser || !balanceAmount || !balanceReason) {
      toast.error('Please enter amount and reason');
      return;
    }
    
    setIsProcessing(true);
    try {
      const wallet = wallets[selectedUser.id];
      if (!wallet) {
        toast.error('User has no wallet');
        return;
      }

      const amount = parseFloat(balanceAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Invalid amount');
        return;
      }

      const adjustmentAmount = balanceType === 'add' ? amount : -amount;
      const newBalance = wallet.balance + adjustmentAmount;

      if (newBalance < 0) {
        toast.error('Insufficient balance to remove');
        return;
      }

      // Update wallet balance
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', wallet.id);

      if (walletError) throw walletError;

      // Log the adjustment
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (adminUser) {
        await supabase
          .from('admin_balance_adjustments')
          .insert({
            admin_id: adminUser.id,
            user_id: selectedUser.id,
            amount: adjustmentAmount,
            previous_balance: wallet.balance,
            new_balance: newBalance,
            reason: balanceReason,
          });

        // Log in audit
        await supabase
          .from('admin_audit_log')
          .insert({
            admin_id: adminUser.id,
            action: 'balance_adjustment',
            target_type: 'user',
            target_id: selectedUser.id,
            details: {
              amount: adjustmentAmount,
              previous_balance: wallet.balance,
              new_balance: newBalance,
              reason: balanceReason,
            },
          });
      }

      // Create transaction record
      await supabase
        .from('transactions')
        .insert({
          wallet_id: wallet.id,
          type: (balanceType === 'add' ? 'topup' : 'withdrawal') as 'topup' | 'withdrawal',
          amount: adjustmentAmount,
          description: `Admin adjustment: ${balanceReason}`,
        });

      toast.success(`Balance ${balanceType === 'add' ? 'added' : 'removed'}: ₺${amount.toLocaleString()}`);
      setBalanceDialogOpen(false);
      setBalanceAmount('');
      setBalanceReason('');

      // Update local state
      setWallets(prev => ({
        ...prev,
        [selectedUser.id]: { ...prev[selectedUser.id], balance: newBalance }
      }));
      
      // Refresh transactions
      await fetchUserDetails(selectedUser);
    } catch (error) {
      console.error('Error adjusting balance:', error);
      toast.error('Failed to adjust balance');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdjustBoomCoins = async () => {
    if (!selectedUser || !boomCoinsAmount || !boomCoinsReason) {
      toast.error('Please enter amount and reason');
      return;
    }
    
    setIsProcessing(true);
    try {
      const amount = parseFloat(boomCoinsAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Invalid amount');
        return;
      }

      const currentBalance = userBoomCoins[selectedUser.id]?.balance || 0;
      const adjustmentAmount = boomCoinsType === 'add' ? amount : -amount;
      const newBalance = currentBalance + adjustmentAmount;

      if (newBalance < 0) {
        toast.error('Insufficient Boom Coins to remove');
        return;
      }

      // Upsert boom coins balance
      const { error: pointsError } = await supabase
        .from('cardboom_points')
        .upsert({
          user_id: selectedUser.id,
          balance: newBalance,
          total_earned: boomCoinsType === 'add' ? currentBalance + amount : currentBalance,
          total_spent: boomCoinsType === 'remove' ? amount : 0,
        }, { onConflict: 'user_id' });

      if (pointsError) throw pointsError;

      // Record in history
      await supabase
        .from('cardboom_points_history')
        .insert({
          user_id: selectedUser.id,
          amount: adjustmentAmount,
          transaction_type: boomCoinsType === 'add' ? 'earn' : 'spend',
          source: 'admin_adjustment',
          description: `Admin: ${boomCoinsReason}`,
        });

      // Log the adjustment
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (adminUser) {
        await supabase
          .from('admin_audit_log')
          .insert({
            admin_id: adminUser.id,
            action: 'boom_coins_adjustment',
            target_type: 'user',
            target_id: selectedUser.id,
            details: {
              amount: adjustmentAmount,
              previous_balance: currentBalance,
              new_balance: newBalance,
              reason: boomCoinsReason,
            },
          });
      }

      toast.success(`Boom Coins ${boomCoinsType === 'add' ? 'added' : 'removed'}: ${amount.toLocaleString()} 💣`);
      setBoomCoinsDialogOpen(false);
      setBoomCoinsAmount('');
      setBoomCoinsReason('');

      // Update local state
      setUserBoomCoins(prev => ({
        ...prev,
        [selectedUser.id]: { balance: newBalance }
      }));
    } catch (error) {
      console.error('Error adjusting Boom Coins:', error);
      toast.error('Failed to adjust Boom Coins');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (user.phone?.includes(searchQuery) ?? false);
    
    const matchesStatus = statusFilter === 'all' || user.account_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-primary/10 text-primary border-primary/30"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"><Pause className="w-3 h-3 mr-1" />Paused</Badge>;
      case 'banned':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/30"><ShieldX className="w-3 h-3 mr-1" />Banned</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stats = {
    total: users.length,
    active: users.filter(u => u.account_status === 'active').length,
    paused: users.filter(u => u.account_status === 'paused').length,
    banned: users.filter(u => u.account_status === 'banned').length,
    verified: users.filter(u => u.is_id_verified).length,
    pro: users.filter(u => isUserPro(u.id)).length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-foreground">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Pause className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paused</p>
                <p className="text-2xl font-bold text-foreground">{stats.paused}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <ShieldX className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Banned</p>
                <p className="text-2xl font-bold text-foreground">{stats.banned}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Shield className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ID Verified</p>
                <p className="text-2xl font-bold text-foreground">{stats.verified}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Crown className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pro Users</p>
                <p className="text-2xl font-bold text-foreground">{stats.pro}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background/50"
                />
              </div>
            </div>

            <div className="flex gap-2">
              {['all', 'active', 'paused', 'banned'].map(status => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className="capitalize"
                >
                  {status}
                </Button>
              ))}
            </div>

            <Button variant="outline" onClick={fetchUsers} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
          <CardDescription>Manage user accounts, verify status, and view activity</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-center">Pro</TableHead>
                    <TableHead className="text-center">ID Verified</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{user.display_name || 'No name'}</p>
                            <p className="text-xs text-muted-foreground">Level {user.level || 1}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm">{user.email || '-'}</p>
                          <p className="text-xs text-muted-foreground">{user.phone || 'No phone'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {isUserPro(user.id) ? (
                          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                            <Crown className="w-3 h-3 mr-1" />
                            Pro
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Free</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {user.is_id_verified ? (
                          <Shield className="w-4 h-4 text-blue-500 mx-auto" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ₺{(wallets[user.id]?.balance || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(user.account_status)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {format(new Date(user.created_at), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewUser(user)}
                          className="gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View
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

      {/* User Detail Dialog */}
      <Dialog open={userDetailOpen} onOpenChange={setUserDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span>{selectedUser?.display_name || 'User Details'}</span>
                <p className="text-sm font-normal text-muted-foreground">{selectedUser?.email}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="flex-1 overflow-hidden">
              {/* Extended User Info - Full Details Section */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3 bg-muted/30 rounded-lg border border-border/50">
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> Full Name</p>
                  <p className="font-medium">{selectedUser.full_name || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><IdCard className="w-3 h-3" /> National ID</p>
                  <p className="font-medium font-mono">{selectedUser.national_id || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</p>
                  <p className="font-medium">{selectedUser.location || selectedUser.last_location || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="w-3 h-3" /> Country</p>
                  <p className="font-medium">{selectedUser.country_code || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="w-3 h-3" /> Last IP</p>
                  <p className="font-medium font-mono text-sm">{selectedUser.last_ip_address || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> Email</p>
                  <p className="font-medium text-sm truncate">{selectedUser.email || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</p>
                  <p className="font-medium">{selectedUser.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Last Login</p>
                  <p className="font-medium text-sm">
                    {selectedUser.last_login_at 
                      ? format(new Date(selectedUser.last_login_at), 'dd MMM yyyy HH:mm') 
                      : 'Never'}
                  </p>
                </div>
              </div>

              {/* User Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className="text-lg font-bold">₺{(wallets[selectedUser.id]?.balance || 0).toLocaleString()}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBalanceDialogOpen(true)}
                    className="text-xs mt-1 h-6 px-2 text-primary"
                  >
                    <CreditCard className="w-3 h-3 mr-1" />
                    Adjust
                  </Button>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <p className="text-xs text-muted-foreground">Boom Coins 💣</p>
                  <p className="text-lg font-bold text-amber-500">{(userBoomCoins[selectedUser.id]?.balance || 0).toLocaleString()}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBoomCoinsDialogOpen(true)}
                    className="text-xs mt-1 h-6 px-2 text-amber-500"
                  >
                    <Gift className="w-3 h-3 mr-1" />
                    Gift Coins
                  </Button>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedUser.account_status)}</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Subscription</p>
                  <p className="text-lg font-bold flex items-center gap-1">
                    {isUserPro(selectedUser.id) ? (
                      <><Crown className="w-4 h-4 text-amber-500" /> Pro</>
                    ) : (
                      <><span className="text-muted-foreground">Free</span></>
                    )}
                  </p>
                  {selectedUserSubscription?.expires_at && isUserPro(selectedUser.id) && (
                    <p className="text-xs text-muted-foreground">
                      Until {format(new Date(selectedUserSubscription.expires_at), 'dd MMM yyyy')}
                    </p>
                  )}
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Phone Verified</p>
                  <p className="text-lg font-bold flex items-center gap-1">
                    {selectedUser.phone_verified ? (
                      <><CheckCircle className="w-4 h-4 text-emerald-500" /> Yes</>
                    ) : (
                      <><XCircle className="w-4 h-4 text-muted-foreground" /> No</>
                    )}
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">ID Verified</p>
                  <p className="text-lg font-bold flex items-center gap-1">
                    {selectedUser.is_id_verified ? (
                      <><Shield className="w-4 h-4 text-blue-500" /> Yes</>
                    ) : (
                      <><XCircle className="w-4 h-4 text-muted-foreground" /> No</>
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                {/* Pro Subscription Actions */}
                {isUserPro(selectedUser.id) ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRevokePro}
                    disabled={isProcessing}
                    className="gap-1 text-amber-500 hover:text-amber-600"
                  >
                    <Crown className="w-4 h-4" />
                    Revoke Pro
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProDialogOpen(true)}
                      className="gap-1 text-amber-500 hover:text-amber-600"
                    >
                      <Gift className="w-4 h-4" />
                      Grant Pro
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEnterpriseDialogOpen(true)}
                      className="gap-1 text-purple-500 hover:text-purple-600"
                    >
                      <Building className="w-4 h-4" />
                      Grant Enterprise
                    </Button>
                  </div>
                )}

                {selectedUser.account_status === 'active' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPauseDialogOpen(true)}
                      className="gap-1 text-yellow-500 hover:text-yellow-600"
                    >
                      <Pause className="w-4 h-4" />
                      Pause Account
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBanDialogOpen(true)}
                      className="gap-1 text-red-500 hover:text-red-600"
                    >
                      <ShieldX className="w-4 h-4" />
                      Ban User
                    </Button>
                  </>
                )}
                {(selectedUser.account_status === 'banned' || selectedUser.account_status === 'paused') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUnbanUser}
                    disabled={isProcessing}
                    className="gap-1 text-emerald-500 hover:text-emerald-600"
                  >
                    <Play className="w-4 h-4" />
                    Restore Account
                  </Button>
                )}
                
                {/* Role Management */}
                <div className="flex items-center gap-2 mb-4 p-3 bg-muted/30 rounded-lg border border-border/50">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Roles:</span>
                  {(userRoles[selectedUser.id] || []).length > 0 ? (
                    (userRoles[selectedUser.id] || []).map(role => (
                      <Badge key={role} variant="secondary" className="gap-1">
                        {role}
                        <button 
                          onClick={() => handleRemoveRole(role as 'admin' | 'moderator' | 'user')}
                          className="ml-1 hover:text-red-500"
                        >
                          ×
                        </button>
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No special roles</span>
                  )}
                  <div className="ml-auto flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAssignRole('moderator')}
                      disabled={isProcessing || (userRoles[selectedUser.id] || []).includes('moderator')}
                      className="text-xs h-7"
                    >
                      + Moderator
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAssignRole('admin')}
                      disabled={isProcessing || (userRoles[selectedUser.id] || []).includes('admin')}
                      className="text-xs h-7 text-amber-500"
                    >
                      + Admin
                    </Button>
                  </div>
                </div>
              </div>
              {selectedUser.account_status === 'banned' && selectedUser.banned_reason && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg mb-4">
                  <p className="text-sm text-red-500 font-medium">Ban Reason:</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.banned_reason}</p>
                  {selectedUser.banned_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Banned on {format(new Date(selectedUser.banned_at), 'dd MMM yyyy HH:mm')}
                    </p>
                  )}
                </div>
              )}

              {selectedUser.account_status === 'paused' && selectedUser.paused_until && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-4">
                  <p className="text-sm text-yellow-500 font-medium">Account Paused</p>
                  <p className="text-sm text-muted-foreground">
                    Until {format(new Date(selectedUser.paused_until), 'dd MMM yyyy HH:mm')}
                  </p>
                </div>
              )}

              {/* Activity Tabs */}
              <Tabs defaultValue="transactions" className="flex-1">
                <TabsList className="mb-2">
                  <TabsTrigger value="transactions" className="gap-1">
                    <Wallet className="w-4 h-4" />
                    Transactions
                  </TabsTrigger>
                  <TabsTrigger value="transfers" className="gap-1">
                    <Wallet className="w-4 h-4" />
                    Transfers
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="gap-1">
                    <MessageSquare className="w-4 h-4" />
                    Comments
                  </TabsTrigger>
                  <TabsTrigger value="logins" className="gap-1">
                    <Globe className="w-4 h-4" />
                    Login History
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="h-[200px]">
                  <TabsContent value="transactions" className="mt-0">
                    {loadingDetails ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : userTransactions.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No transactions</p>
                    ) : (
                      <div className="space-y-2">
                        {userTransactions.map(tx => (
                          <div key={tx.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                            <div>
                              <p className="text-sm font-medium capitalize">{tx.type}</p>
                              <p className="text-xs text-muted-foreground">{tx.description || 'No description'}</p>
                            </div>
                            <div className="text-right">
                              <p className={`font-mono ${tx.amount >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {tx.amount >= 0 ? '+' : ''}₺{tx.amount.toLocaleString()}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(tx.created_at), 'dd MMM HH:mm')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="transfers" className="mt-0">
                    {loadingDetails ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : userTransfers.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No wire transfers</p>
                    ) : (
                      <div className="space-y-2">
                        {userTransfers.map(transfer => (
                          <div key={transfer.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                            <div>
                              <p className="text-sm font-medium">{transfer.sender_name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground capitalize">{transfer.status}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-mono">₺{transfer.amount.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(transfer.created_at), 'dd MMM HH:mm')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="comments" className="mt-0">
                    {loadingDetails ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : userComments.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No comments</p>
                    ) : (
                      <div className="space-y-2">
                        {userComments.map(comment => (
                          <div key={comment.id} className="flex items-start justify-between p-2 bg-muted/30 rounded gap-2">
                            <div className="flex-1">
                              <p className="text-sm">{comment.content}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(comment.created_at), 'dd MMM HH:mm')}
                              </p>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteComment(comment.id)}
                              className="h-6 w-6 text-red-500 hover:text-red-600"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="logins" className="mt-0">
                    {loadingDetails ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : userLoginHistory.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No login history</p>
                    ) : (
                      <div className="space-y-2">
                        {userLoginHistory.map(login => (
                          <div key={login.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                            <div>
                              <p className="text-sm font-mono">{login.ip_address || 'Unknown IP'}</p>
                              <p className="text-xs text-muted-foreground">
                                {login.city && login.country 
                                  ? `${login.city}, ${login.country}` 
                                  : login.location || 'Unknown location'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground truncate max-w-[150px]" title={login.user_agent || ''}>
                                {login.user_agent?.substring(0, 30) || 'Unknown device'}...
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(login.created_at), 'dd MMM HH:mm')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ban Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <ShieldX className="w-5 h-5" />
              Ban User
            </DialogTitle>
            <DialogDescription>
              This will permanently ban {selectedUser?.display_name} from the platform.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Banned users will not be able to login, trade, or access their wallet. This action can be reversed.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ban-reason">Reason for ban</Label>
              <Textarea
                id="ban-reason"
                placeholder="Enter the reason for banning this user..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBanUser}
              disabled={isProcessing}
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pause Dialog */}
      <Dialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-500">
              <Pause className="w-5 h-5" />
              Pause Account
            </DialogTitle>
            <DialogDescription>
              Temporarily suspend {selectedUser?.display_name}'s account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pause-duration">Pause Duration (days)</Label>
              <Input
                id="pause-duration"
                type="number"
                min="1"
                max="365"
                value={pauseDuration}
                onChange={(e) => setPauseDuration(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPauseDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handlePauseUser}
              disabled={isProcessing}
              className="bg-yellow-500 hover:bg-yellow-600"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
              Pause Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grant Pro Dialog */}
      <Dialog open={proDialogOpen} onOpenChange={setProDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <Crown className="w-5 h-5" />
              Grant Pro Subscription
            </DialogTitle>
            <DialogDescription>
              Give {selectedUser?.display_name} free Pro access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <Gift className="w-5 h-5 text-amber-500 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  This will grant Pro features without charging the user. Great for influencers, partners, or special promotions.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pro-duration">Duration</Label>
              <Select value={proDuration} onValueChange={setProDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days (1 month)</SelectItem>
                  <SelectItem value="90">90 days (3 months)</SelectItem>
                  <SelectItem value="180">180 days (6 months)</SelectItem>
                  <SelectItem value="365">365 days (1 year)</SelectItem>
                  <SelectItem value="3650">10 years (lifetime)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleGrantPro}
              disabled={isProcessing}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Crown className="w-4 h-4 mr-2" />}
              Grant Pro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grant Enterprise Dialog */}
      <Dialog open={enterpriseDialogOpen} onOpenChange={setEnterpriseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-500">
              <Building className="w-5 h-5" />
              Grant Enterprise Subscription
            </DialogTitle>
            <DialogDescription>
              Give {selectedUser?.display_name} free Enterprise access ($50/mo value).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <Gift className="w-5 h-5 text-purple-500 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Enterprise includes lowest fees (4%), API access, bulk tools, and dedicated support. 
                  Great for power sellers and business partners.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="enterprise-duration">Duration</Label>
              <Select value={enterpriseDuration} onValueChange={setEnterpriseDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days (1 month)</SelectItem>
                  <SelectItem value="90">90 days (3 months)</SelectItem>
                  <SelectItem value="180">180 days (6 months)</SelectItem>
                  <SelectItem value="365">365 days (1 year)</SelectItem>
                  <SelectItem value="3650">10 years (lifetime)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEnterpriseDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleGrantEnterprise}
              disabled={isProcessing}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Building className="w-4 h-4 mr-2" />}
              Grant Enterprise
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Balance Adjustment Dialog */}
      <Dialog open={balanceDialogOpen} onOpenChange={setBalanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <CreditCard className="w-5 h-5" />
              Adjust Balance
            </DialogTitle>
            <DialogDescription>
              Add or remove balance from {selectedUser?.display_name}'s wallet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-2xl font-bold">₺{(wallets[selectedUser?.id || '']?.balance || 0).toLocaleString()}</p>
            </div>

            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={balanceType === 'add' ? 'default' : 'outline'}
                  onClick={() => setBalanceType('add')}
                  className="flex-1 gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Balance
                </Button>
                <Button
                  type="button"
                  variant={balanceType === 'remove' ? 'destructive' : 'outline'}
                  onClick={() => setBalanceType('remove')}
                  className="flex-1 gap-2"
                >
                  <Minus className="w-4 h-4" />
                  Remove Balance
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="balance-amount">Amount (₺)</Label>
              <Input
                id="balance-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter amount..."
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="balance-reason">Reason (required)</Label>
              <Textarea
                id="balance-reason"
                placeholder="Enter reason for this adjustment..."
                value={balanceReason}
                onChange={(e) => setBalanceReason(e.target.value)}
                rows={2}
              />
            </div>

            {balanceAmount && !isNaN(parseFloat(balanceAmount)) && (
              <div className={`p-3 rounded-lg border ${balanceType === 'add' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <p className="text-sm">
                  New balance will be:{' '}
                  <span className="font-bold">
                    ₺{((wallets[selectedUser?.id || '']?.balance || 0) + (balanceType === 'add' ? parseFloat(balanceAmount) : -parseFloat(balanceAmount))).toLocaleString()}
                  </span>
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBalanceDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAdjustBalance}
              disabled={isProcessing || !balanceAmount || !balanceReason}
              className={balanceType === 'add' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
              {balanceType === 'add' ? 'Add' : 'Remove'} ₺{balanceAmount || '0'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Boom Coins Adjustment Dialog */}
      <Dialog open={boomCoinsDialogOpen} onOpenChange={setBoomCoinsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              💣 Gift Boom Coins
            </DialogTitle>
            <DialogDescription>
              Add or remove Boom Coins from {selectedUser?.display_name}'s account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-2xl font-bold text-amber-500">{(userBoomCoins[selectedUser?.id || '']?.balance || 0).toLocaleString()} 💣</p>
            </div>

            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={boomCoinsType === 'add' ? 'default' : 'outline'}
                  onClick={() => setBoomCoinsType('add')}
                  className="flex-1 gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Gift Coins
                </Button>
                <Button
                  type="button"
                  variant={boomCoinsType === 'remove' ? 'destructive' : 'outline'}
                  onClick={() => setBoomCoinsType('remove')}
                  className="flex-1 gap-2"
                >
                  <Minus className="w-4 h-4" />
                  Remove Coins
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="boom-coins-amount">Amount (Boom Coins)</Label>
              <Input
                id="boom-coins-amount"
                type="number"
                min="0"
                step="1"
                placeholder="Enter amount..."
                value={boomCoinsAmount}
                onChange={(e) => setBoomCoinsAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="boom-coins-reason">Reason (required)</Label>
              <Textarea
                id="boom-coins-reason"
                placeholder="Enter reason for this adjustment..."
                value={boomCoinsReason}
                onChange={(e) => setBoomCoinsReason(e.target.value)}
                rows={2}
              />
            </div>

            {boomCoinsAmount && !isNaN(parseFloat(boomCoinsAmount)) && (
              <div className={`p-3 rounded-lg border ${boomCoinsType === 'add' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <p className="text-sm">
                  New balance will be:{' '}
                  <span className="font-bold">
                    {((userBoomCoins[selectedUser?.id || '']?.balance || 0) + (boomCoinsType === 'add' ? parseFloat(boomCoinsAmount) : -parseFloat(boomCoinsAmount))).toLocaleString()} 💣
                  </span>
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBoomCoinsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAdjustBoomCoins}
              disabled={isProcessing || !boomCoinsAmount || !boomCoinsReason}
              className={boomCoinsType === 'add' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-red-500 hover:bg-red-600'}
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
              {boomCoinsType === 'add' ? 'Gift' : 'Remove'} {boomCoinsAmount || '0'} 💣
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
