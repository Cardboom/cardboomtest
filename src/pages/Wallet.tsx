import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useLanguage();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTopUp, setShowTopUp] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Handle payment callback from iyzico
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const amount = searchParams.get('amount');
    const error = searchParams.get('error');

    if (paymentStatus === 'success' && amount) {
      toast.success(`Successfully added $${amount} to your wallet!`);
      // Clear the URL params
      setSearchParams({});
    } else if (paymentStatus === 'failed') {
      toast.error(error || 'Payment failed. Please try again.');
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

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
      <div className="min-h-screen bg-background bg-mesh flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-mesh">
      <Header cartCount={0} onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Balance Card */}
          <Card className="mb-8 overflow-hidden border-primary/20 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-gold/5" />
            <CardContent className="p-8 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2 uppercase tracking-wider font-medium">Available Balance</p>
                  <h1 className="text-5xl font-display font-bold text-foreground tracking-tight">
                    {formatCurrency(balance)}
                  </h1>
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => setShowTopUp(true)} size="lg" className="gap-2 shadow-glow">
                    <Plus className="h-5 w-5" />
                    Add Funds
                  </Button>
                </div>
              </div>
              
              <div className="mt-8 p-4 rounded-xl bg-secondary/50 border border-border/30">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <span>7% fee on credit card top-ups • 6% buy fee • 6% sell fee</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions */}
          <Card>
            <CardHeader className="border-b border-border/30">
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <History className="h-5 w-5 text-foreground" />
                </div>
                Transaction History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {transactions.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto mb-4 flex items-center justify-center">
                    <Wallet className="h-8 w-8 opacity-50" />
                  </div>
                  <p className="font-medium">No transactions yet</p>
                  <p className="text-sm mt-1">Add funds to start trading</p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {transactions.map((txn, index) => (
                    <div
                      key={txn.id}
                      className="flex items-center justify-between p-5 hover:bg-secondary/30 transition-colors animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                          {getTransactionIcon(txn.type)}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground capitalize">
                            {txn.type}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {txn.description || 'Transaction'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-mono font-bold text-lg ${
                          txn.type === 'topup' || txn.type === 'sale' 
                            ? 'text-gain' 
                            : 'text-loss'
                        }`}>
                          {txn.type === 'topup' || txn.type === 'sale' ? '+' : '-'}
                          {formatCurrency(Math.abs(txn.amount))}
                        </p>
                        {txn.fee > 0 && (
                          <p className="text-xs text-muted-foreground font-mono">
                            Fee: {formatCurrency(txn.fee)}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(txn.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
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
