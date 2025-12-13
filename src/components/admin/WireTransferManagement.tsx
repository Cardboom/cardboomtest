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
  Check,
  X,
  Clock,
  Banknote,
  AlertCircle
} from 'lucide-react';
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

interface WireTransfer {
  id: string;
  amount: number;
  net_amount: number | null;
  commission_rate: number | null;
  status: string;
  sender_name: string | null;
  sender_iban: string | null;
  transfer_description: string | null;
  matched_code: string | null;
  user_id: string | null;
  notes: string | null;
  created_at: string;
  processed_at: string | null;
  currency: string | null;
}

interface Profile {
  id: string;
  display_name: string | null;
  email: string | null;
}

const COMMISSION_RATE = 0.0125; // 1.25%

export const WireTransferManagement = () => {
  const [transfers, setTransfers] = useState<WireTransfer[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTransfer, setSelectedTransfer] = useState<WireTransfer | null>(null);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [matchUsername, setMatchUsername] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchTransfers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('wire_transfers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransfers(data || []);

      // Fetch profiles for matched users
      const userIds = (data || [])
        .map(t => t.user_id)
        .filter((id): id is string => id !== null);
      
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, display_name, email')
          .in('id', userIds);

        if (profileData) {
          const profileMap: Record<string, Profile> = {};
          profileData.forEach(p => {
            profileMap[p.id] = p;
          });
          setProfiles(profileMap);
        }
      }
    } catch (error) {
      console.error('Error fetching transfers:', error);
      toast.error('Failed to fetch wire transfers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const filteredTransfers = transfers.filter(transfer => {
    const matchesSearch = 
      (transfer.sender_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (transfer.sender_iban?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (transfer.transfer_description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (transfer.matched_code?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    const matchesStatus = statusFilter === 'all' || transfer.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleMatchTransfer = async () => {
    if (!selectedTransfer || !matchUsername.trim()) {
      toast.error('Please enter a username');
      return;
    }

    setIsProcessing(true);
    try {
      // Find user by display_name
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .ilike('display_name', matchUsername.trim())
        .maybeSingle();

      if (profileError || !profileData) {
        toast.error('User not found. Please check the username.');
        setIsProcessing(false);
        return;
      }

      // Calculate net amount
      const commission = selectedTransfer.amount * COMMISSION_RATE;
      const netAmount = selectedTransfer.amount - commission;

      // Update wire transfer
      const { error: updateError } = await supabase
        .from('wire_transfers')
        .update({
          user_id: profileData.id,
          matched_code: matchUsername.trim(),
          status: 'matched',
          net_amount: netAmount,
          commission_rate: COMMISSION_RATE,
          notes: adminNotes || null,
        })
        .eq('id', selectedTransfer.id);

      if (updateError) throw updateError;

      toast.success(`Transfer matched to ${profileData.display_name}`);
      setMatchDialogOpen(false);
      setMatchUsername('');
      setAdminNotes('');
      setSelectedTransfer(null);
      fetchTransfers();
    } catch (error) {
      console.error('Error matching transfer:', error);
      toast.error('Failed to match transfer');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmTransfer = async (transfer: WireTransfer) => {
    if (!transfer.user_id) {
      toast.error('Transfer must be matched to a user first');
      return;
    }

    setIsProcessing(true);
    try {
      // Get user's wallet
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', transfer.user_id)
        .single();

      if (walletError || !wallet) {
        toast.error('User wallet not found');
        setIsProcessing(false);
        return;
      }

      const netAmount = transfer.net_amount || (transfer.amount * (1 - COMMISSION_RATE));
      const newBalance = wallet.balance + netAmount;

      // Update wallet balance
      const { error: updateWalletError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('id', wallet.id);

      if (updateWalletError) throw updateWalletError;

      // Create transaction record
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          wallet_id: wallet.id,
          type: 'topup',
          amount: netAmount,
          fee: transfer.amount - netAmount,
          description: `Wire transfer from ${transfer.sender_name || 'Unknown'}`,
          reference_id: transfer.id,
        });

      if (txError) throw txError;

      // Create audit log
      const { error: auditError } = await supabase
        .from('wallet_audit_log')
        .insert({
          wallet_id: wallet.id,
          user_id: transfer.user_id,
          action: 'wire_transfer_credit',
          change_amount: netAmount,
          old_balance: wallet.balance,
          new_balance: newBalance,
          reference_id: transfer.id,
        });

      if (auditError) console.error('Audit log error:', auditError);

      // Update wire transfer status
      const { error: confirmError } = await supabase
        .from('wire_transfers')
        .update({
          status: 'confirmed',
          processed_at: new Date().toISOString(),
        })
        .eq('id', transfer.id);

      if (confirmError) throw confirmError;

      toast.success(`₺${netAmount.toLocaleString()} credited to user's wallet`);
      fetchTransfers();
    } catch (error) {
      console.error('Error confirming transfer:', error);
      toast.error('Failed to confirm transfer');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectTransfer = async (transfer: WireTransfer) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('wire_transfers')
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString(),
        })
        .eq('id', transfer.id);

      if (error) throw error;

      toast.success('Transfer rejected');
      fetchTransfers();
    } catch (error) {
      console.error('Error rejecting transfer:', error);
      toast.error('Failed to reject transfer');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'matched':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30"><AlertCircle className="w-3 h-3 mr-1" />Matched</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30"><Check className="w-3 h-3 mr-1" />Confirmed</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30"><X className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stats = {
    pending: transfers.filter(t => t.status === 'pending').length,
    matched: transfers.filter(t => t.status === 'matched').length,
    confirmed: transfers.filter(t => t.status === 'confirmed').length,
    totalPending: transfers
      .filter(t => t.status === 'pending' || t.status === 'matched')
      .reduce((sum, t) => sum + t.amount, 0),
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <AlertCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Matched</p>
                <p className="text-2xl font-bold text-foreground">{stats.matched}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Check className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Confirmed</p>
                <p className="text-2xl font-bold text-foreground">{stats.confirmed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Banknote className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Total</p>
                <p className="text-xl font-bold text-foreground">₺{stats.totalPending.toLocaleString()}</p>
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
                  placeholder="Search by sender, IBAN, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background/50"
                />
              </div>
            </div>

            <div className="flex gap-2">
              {['all', 'pending', 'matched', 'confirmed', 'rejected'].map(status => (
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

            <Button variant="outline" onClick={fetchTransfers} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transfers Table */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>Wire Transfers ({filteredTransfers.length})</CardTitle>
          <CardDescription>Match transfers to users and confirm to credit their wallets</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredTransfers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No wire transfers found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Sender</TableHead>
                    <TableHead>IBAN</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Matched User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(transfer.created_at), 'dd MMM yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {transfer.sender_name || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {transfer.sender_iban ? 
                          `${transfer.sender_iban.slice(0, 8)}...${transfer.sender_iban.slice(-4)}` : 
                          '-'
                        }
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {transfer.transfer_description || '-'}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ₺{transfer.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {transfer.user_id && profiles[transfer.user_id] ? (
                          <span className="text-primary font-medium">
                            {profiles[transfer.user_id].display_name}
                          </span>
                        ) : transfer.matched_code ? (
                          <span className="text-muted-foreground">{transfer.matched_code}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {transfer.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedTransfer(transfer);
                                setMatchDialogOpen(true);
                              }}
                            >
                              Match
                            </Button>
                          )}
                          {transfer.status === 'matched' && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleConfirmTransfer(transfer)}
                                disabled={isProcessing}
                                className="bg-emerald-600 hover:bg-emerald-700"
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectTransfer(transfer)}
                                disabled={isProcessing}
                                className="text-red-500 hover:text-red-600"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {(transfer.status === 'confirmed' || transfer.status === 'rejected') && (
                            <span className="text-xs text-muted-foreground">
                              {transfer.processed_at && format(new Date(transfer.processed_at), 'dd MMM HH:mm')}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Match Dialog */}
      <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Match Wire Transfer</DialogTitle>
            <DialogDescription>
              Enter the username from the transfer description to match this transfer to a user.
            </DialogDescription>
          </DialogHeader>

          {selectedTransfer && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-semibold">₺{selectedTransfer.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Commission (1.25%):</span>
                  <span className="text-red-500">-₺{(selectedTransfer.amount * COMMISSION_RATE).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Net Amount:</span>
                  <span className="font-bold text-emerald-500">
                    ₺{(selectedTransfer.amount * (1 - COMMISSION_RATE)).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <Label className="text-xs text-muted-foreground">Transfer Description</Label>
                <p className="font-medium mt-1">{selectedTransfer.transfer_description || 'No description'}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter exact username from description"
                  value={matchUsername}
                  onChange={(e) => setMatchUsername(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Admin Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this transfer..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setMatchDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMatchTransfer} disabled={isProcessing || !matchUsername.trim()}>
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
              Match Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
