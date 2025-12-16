import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, ArrowUpRight, ArrowDownLeft, History, Plus, CreditCard, TrendingUp, TrendingDown, Banknote } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { WalletTopUpDialog } from '@/components/WalletTopUpDialog';
import { WireTransferDialog } from '@/components/WireTransferDialog';
import { CurrencyToggle } from '@/components/CurrencyToggle';
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
  const { formatPrice, currency } = useCurrency();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCardTopUp, setShowCardTopUp] = useState(false);
  const [showWireTransfer, setShowWireTransfer] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Handle payment callback from iyzico
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const amount = searchParams.get('amount');
    const error = searchParams.get('error');

    if (paymentStatus === 'success' && amount) {
      toast.success(`Successfully added ${formatPrice(Number(amount))} to your wallet!`);
      setSearchParams({});
    } else if (paymentStatus === 'failed') {
      toast.error(error || 'Payment failed. Please try again.');
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, formatPrice]);

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
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (walletError) throw walletError;
      
      if (wallet) {
        setBalance(Number(wallet.balance));

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

  // Calculate today's PNL
  const todaysPNL = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayTxns = transactions.filter(txn => {
      const txnDate = new Date(txn.created_at);
      txnDate.setHours(0, 0, 0, 0);
      return txnDate.getTime() === today.getTime();
    });

    let pnl = 0;
    todayTxns.forEach(txn => {
      if (txn.type === 'sale' || txn.type === 'topup') {
        pnl += Number(txn.amount);
      } else if (txn.type === 'purchase' || txn.type === 'fee' || txn.type === 'subscription' || txn.type === 'withdrawal') {
        pnl -= Math.abs(Number(txn.amount));
      }
    });

    return pnl;
  }, [transactions]);

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
          {/* Header with Currency Toggle */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-display text-2xl font-bold text-foreground">My Wallet</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Currency:</span>
              <CurrencyToggle />
            </div>
          </div>

          {/* Balance Card */}
          <Card className="mb-6 overflow-hidden border-primary/20 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-gold/5" />
            <CardContent className="p-8 relative">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2 uppercase tracking-wider font-medium">Available Balance</p>
                    <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground tracking-tight">
                      {formatPrice(balance)}
                    </h2>
                  </div>
                  
                  {/* Today's PNL */}
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                      todaysPNL >= 0 ? 'bg-gain/10 text-gain' : 'bg-loss/10 text-loss'
                    }`}>
                      {todaysPNL >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      <span className="font-semibold text-sm">
                        {todaysPNL >= 0 ? '+' : ''}{formatPrice(todaysPNL)}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">Today's P&L</span>
                  </div>
                </div>

                <Button onClick={() => setShowCardTopUp(true)} size="lg" className="gap-2 shadow-glow h-14 px-8">
                  <Plus className="h-5 w-5" />
                  Add Funds
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Add Funds Options */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="font-display font-semibold text-foreground mb-4">Quick Add Funds</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setShowCardTopUp(true)}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:bg-secondary/30 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Credit / Debit Card</p>
                    <p className="text-sm text-muted-foreground">Instant • USD & TRY • 6.5% fee</p>
                  </div>
                </button>
                <button
                  onClick={() => setShowWireTransfer(true)}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:bg-secondary/30 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Banknote className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Wire Transfer (EFT/Havale)</p>
                    <p className="text-sm text-muted-foreground">TRY only • Domestic TR • 3% fee</p>
                  </div>
                </button>
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
                            {txn.type === 'topup' ? 'Deposit' : txn.type}
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
                          {formatPrice(Math.abs(txn.amount))}
                        </p>
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
        open={showCardTopUp} 
        onOpenChange={setShowCardTopUp}
        onSuccess={() => user && fetchWalletData(user.id)}
      />
      
      <WireTransferDialog
        open={showWireTransfer}
        onOpenChange={setShowWireTransfer}
      />
    </div>
  );
};

export default WalletPage;
