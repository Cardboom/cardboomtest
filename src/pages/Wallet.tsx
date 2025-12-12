import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, ArrowUpRight, ArrowDownLeft, History, Plus, CreditCard, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { WalletTopUpDialog } from '@/components/WalletTopUpDialog';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  fee: number;
  description: string;
  created_at: string;
}

const WalletPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTopUp, setShowTopUp] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);
      fetchWalletData(session.user.id);
    };
    checkAuth();
  }, [navigate]);

  const fetchWalletData = async (userId: string) => {
    try {
      // Fetch wallet
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (walletError) throw walletError;
      
      if (wallet) {
        setBalance(Number(wallet.balance));

        // Fetch transactions
        const { data: txns, error: txnError } = await supabase
          .from('transactions')
          .select('*')
          .eq('wallet_id', wallet.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (txnError) throw txnError;
        setTransactions(txns || []);
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'topup':
        return <ArrowDownLeft className="h-4 w-4 text-gain" />;
      case 'purchase':
        return <ArrowUpRight className="h-4 w-4 text-loss" />;
      case 'sale':
        return <ArrowDownLeft className="h-4 w-4 text-gain" />;
      case 'fee':
        return <ArrowUpRight className="h-4 w-4 text-muted-foreground" />;
      case 'subscription':
        return <CreditCard className="h-4 w-4 text-primary" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header cartCount={0} onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Balance Card */}
          <Card className="mb-8 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
                  <h1 className="text-4xl font-display font-bold text-foreground">
                    {formatCurrency(balance)}
                  </h1>
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => setShowTopUp(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Funds
                  </Button>
                </div>
              </div>
              
              <div className="mt-6 p-4 rounded-lg bg-background/50 border border-border/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span>7% fee on credit card top-ups • 6% buy fee • 6% sell fee</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Transaction History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No transactions yet</p>
                  <p className="text-sm mt-1">Add funds to start trading</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((txn) => (
                    <div
                      key={txn.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
                          {getTransactionIcon(txn.type)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground capitalize">
                            {txn.type}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {txn.description || 'Transaction'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${
                          txn.type === 'topup' || txn.type === 'sale' 
                            ? 'text-gain' 
                            : 'text-loss'
                        }`}>
                          {txn.type === 'topup' || txn.type === 'sale' ? '+' : '-'}
                          {formatCurrency(Math.abs(txn.amount))}
                        </p>
                        {txn.fee > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Fee: {formatCurrency(txn.fee)}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(txn.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />

      <WalletTopUpDialog 
        open={showTopUp} 
        onOpenChange={setShowTopUp}
        onSuccess={() => user && fetchWalletData(user.id)}
      />
    </div>
  );
};

export default WalletPage;
