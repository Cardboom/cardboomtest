import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeftRight, Clock, CheckCircle, XCircle, 
  Camera, Package, AlertCircle, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TradeDetailDialog } from '@/components/trading/TradeDetailDialog';
import { ProposeTradeDialog } from '@/components/trading/ProposeTradeDialog';
import { TrustedMerchants } from '@/components/trading/TrustedMerchants';

// Mock trades data
const MOCK_TRADES = [
  { 
    id: '1',
    status: 'proposed',
    partner: 'CardKing99',
    myItems: [{ name: 'Charizard Base Set PSA 10', value: 420000 }],
    theirItems: [{ name: 'Pikachu Illustrator PSA 9', value: 2500000 }],
    cashAdjustment: 2080000,
    cashFromMe: true,
    createdAt: '2 hours ago',
  },
  { 
    id: '2',
    status: 'pending_photos',
    partner: 'TopCollector',
    myItems: [{ name: 'LeBron James Rookie PSA 10', value: 245000 }],
    theirItems: [{ name: 'Michael Jordan Fleer PSA 10', value: 89000 }, { name: 'Luka Doncic Prizm PSA 10', value: 12500 }],
    cashAdjustment: 143500,
    cashFromMe: false,
    createdAt: '1 day ago',
  },
  { 
    id: '3',
    status: 'completed',
    partner: 'VintageCards',
    myItems: [{ name: 'Black Lotus Alpha PSA 9', value: 185000 }],
    theirItems: [{ name: 'Blue-Eyes White Dragon PSA 10', value: 35000 }],
    cashAdjustment: 150000,
    cashFromMe: false,
    createdAt: '1 week ago',
  },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'proposed':
      return <Badge variant="secondary">Proposed</Badge>;
    case 'pending_photos':
      return <Badge className="bg-accent text-accent-foreground">Pending Photos</Badge>;
    case 'pending_confirmation':
      return <Badge className="bg-blue-500/20 text-blue-400">Pending Confirmation</Badge>;
    case 'confirmed':
      return <Badge className="bg-primary/20 text-primary">Confirmed</Badge>;
    case 'in_transit':
      return <Badge className="bg-purple-500/20 text-purple-400">In Transit</Badge>;
    case 'completed':
      return <Badge className="bg-gain/20 text-gain">Completed</Badge>;
    case 'cancelled':
      return <Badge className="bg-loss/20 text-loss">Cancelled</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const Trades = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('active');
  const [selectedTrade, setSelectedTrade] = useState<string | null>(null);
  const [showProposeDialog, setShowProposeDialog] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`;
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`;
    return `$${price.toLocaleString()}`;
  };

  const activeTrades = MOCK_TRADES.filter(t => !['completed', 'cancelled'].includes(t.status));
  const completedTrades = MOCK_TRADES.filter(t => ['completed', 'cancelled'].includes(t.status));

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={cartItems.length} onCartClick={() => {}} />
        <main className="container mx-auto px-4 py-20 text-center">
          <ArrowLeftRight className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Sign in to view trades</h1>
          <p className="text-muted-foreground mb-6">Trade cards securely with other collectors through our vault system.</p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header cartCount={cartItems.length} onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">My Trades</h1>
            <p className="text-muted-foreground">Manage your card trades with other collectors</p>
          </div>
          <Button onClick={() => setShowProposeDialog(true)} className="gap-2">
            <ArrowLeftRight className="w-4 h-4" />
            Propose Trade
          </Button>
        </div>

        {/* Info Banner */}
        <div className="glass rounded-xl p-4 mb-6 flex items-start gap-3">
          <Package className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-foreground font-medium">How trades work</p>
            <p className="text-muted-foreground text-sm mt-1">
              Both parties send cards to our vault for verification. Once photos are confirmed and both accept, 
              cards are transferred to the new owners in vault. You can then list, trade, or request shipping.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-secondary/50 p-1 rounded-xl mb-4">
            <TabsTrigger value="active" className="rounded-lg">
              Active ({activeTrades.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="rounded-lg">
              Completed ({completedTrades.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <div className="space-y-4">
              {activeTrades.length === 0 ? (
                <div className="glass rounded-xl p-8 text-center">
                  <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No active trades</p>
                </div>
              ) : (
                activeTrades.map((trade) => (
                  <div 
                    key={trade.id}
                    onClick={() => setSelectedTrade(trade.id)}
                    className="glass rounded-xl p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getStatusBadge(trade.status)}
                        <span className="text-muted-foreground text-sm">with {trade.partner}</span>
                      </div>
                      <span className="text-muted-foreground text-xs">{trade.createdAt}</span>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      {/* My Items */}
                      <div>
                        <p className="text-muted-foreground text-xs mb-2">You Send</p>
                        {trade.myItems.map((item, i) => (
                          <p key={i} className="text-foreground text-sm">{item.name}</p>
                        ))}
                        {trade.cashFromMe && trade.cashAdjustment > 0 && (
                          <p className="text-loss text-sm">+ {formatPrice(trade.cashAdjustment)} cash</p>
                        )}
                      </div>

                      {/* Arrow */}
                      <div className="hidden md:flex items-center justify-center">
                        <ArrowLeftRight className="w-6 h-6 text-muted-foreground" />
                      </div>

                      {/* Their Items */}
                      <div>
                        <p className="text-muted-foreground text-xs mb-2">You Receive</p>
                        {trade.theirItems.map((item, i) => (
                          <p key={i} className="text-foreground text-sm">{item.name}</p>
                        ))}
                        {!trade.cashFromMe && trade.cashAdjustment > 0 && (
                          <p className="text-gain text-sm">+ {formatPrice(trade.cashAdjustment)} cash</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end mt-3">
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="completed">
            <div className="space-y-4">
              {completedTrades.length === 0 ? (
                <div className="glass rounded-xl p-8 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No completed trades</p>
                </div>
              ) : (
                completedTrades.map((trade) => (
                  <div 
                    key={trade.id}
                    onClick={() => setSelectedTrade(trade.id)}
                    className="glass rounded-xl p-4 cursor-pointer hover:bg-secondary/30 transition-colors opacity-75"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getStatusBadge(trade.status)}
                        <span className="text-muted-foreground text-sm">with {trade.partner}</span>
                      </div>
                      <span className="text-muted-foreground text-xs">{trade.createdAt}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-foreground text-sm">
                        {trade.myItems.map(i => i.name).join(', ')} ↔ {trade.theirItems.map(i => i.name).join(', ')}
                      </p>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Trusted Merchants Section */}
        <div className="mt-8">
          <TrustedMerchants />
        </div>
      </main>

      <Footer />

      <TradeDetailDialog
        open={!!selectedTrade}
        onOpenChange={() => setSelectedTrade(null)}
        tradeId={selectedTrade || ''}
      />

      <ProposeTradeDialog
        open={showProposeDialog}
        onOpenChange={setShowProposeDialog}
      />
    </div>
  );
};

export default Trades;
