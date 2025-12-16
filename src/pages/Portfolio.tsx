import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Plus, TrendingUp, TrendingDown, Search, Trash2, 
  Edit, ExternalLink, Package, DollarSign, PieChart, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AddToPortfolioDialog } from '@/components/portfolio/AddToPortfolioDialog';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatDistanceToNow } from 'date-fns';
import { formatGrade, CardGrade } from '@/hooks/useGradePrices';

// Mock portfolio data with grade-specific prices
const MOCK_PORTFOLIO = [
  { 
    id: '1', 
    name: 'Charizard Base Set', 
    grade: 'psa10' as CardGrade,
    purchasePrice: 380000, 
    currentPrice: 420000, // PSA 10 price
    quantity: 1,
    inVault: true,
    image: '/placeholder.svg'
  },
  { 
    id: '2', 
    name: 'LeBron James Rookie', 
    grade: 'psa10' as CardGrade,
    purchasePrice: 220000, 
    currentPrice: 245000, // PSA 10 price
    quantity: 1,
    inVault: false,
    image: '/placeholder.svg'
  },
  { 
    id: '3', 
    name: 'Monkey D. Luffy Leader', 
    grade: 'psa10' as CardGrade,
    purchasePrice: 500, 
    currentPrice: 850, // PSA 10 price
    quantity: 3,
    inVault: false,
    image: '/placeholder.svg'
  },
  { 
    id: '4', 
    name: 'Pikachu Illustrator', 
    grade: 'psa9' as CardGrade,
    purchasePrice: 2200000, 
    currentPrice: 2500000, // PSA 9 price (lower than PSA 10 would be)
    quantity: 1,
    inVault: true,
    image: '/placeholder.svg'
  },
  { 
    id: '5', 
    name: 'Michael Jordan Fleer Rookie', 
    grade: 'psa8' as CardGrade,
    purchasePrice: 45000, 
    currentPrice: 52000, // PSA 8 price (lower than PSA 9/10)
    quantity: 1,
    inVault: false,
    image: '/placeholder.svg'
  },
];

const Portfolio = () => {
  const navigate = useNavigate();
  const { formatPrice: formatCurrencyPrice } = useCurrency();
  const [cartItems, setCartItems] = useState([]);
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  // Fetch user's fractional holdings
  const { data: fractionalHoldings } = useQuery({
    queryKey: ['portfolio-fractional-holdings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('fractional_ownership')
        .select(`
          *,
          fractional_listing:fractional_listings(
            *,
            listing:listings(title, image_url, price),
            market_item:market_items(name, image_url, current_price)
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const fractionalTotalInvested = fractionalHoldings?.reduce((sum, h) => sum + h.total_invested, 0) || 0;
  const fractionalCurrentValue = fractionalHoldings?.reduce((sum, h) => {
    const sharePrice = h.fractional_listing?.share_price || 0;
    return sum + (h.shares_owned * sharePrice);
  }, 0) || 0;
  const fractionalPnL = fractionalCurrentValue - fractionalTotalInvested;

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`;
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`;
    return `$${price.toLocaleString()}`;
  };

  // Calculate portfolio stats
  const totalValue = MOCK_PORTFOLIO.reduce((sum, item) => sum + item.currentPrice * item.quantity, 0);
  const totalCost = MOCK_PORTFOLIO.reduce((sum, item) => sum + item.purchasePrice * item.quantity, 0);
  const totalPnL = totalValue - totalCost;
  const pnlPercent = ((totalPnL / totalCost) * 100);

  const filteredPortfolio = MOCK_PORTFOLIO.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={cartItems.length} onCartClick={() => {}} />
        <main className="container mx-auto px-4 py-20 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Sign in to view your portfolio</h1>
          <p className="text-muted-foreground mb-6">Track your collection and see your P/L in real-time.</p>
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
          <div className="flex items-center gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">My Portfolio</h1>
              <p className="text-muted-foreground">Track your collection and performance</p>
            </div>
            {fractionalHoldings && fractionalHoldings.length > 0 && (
              <Link to="/fractional">
                <Badge variant="secondary" className="gap-1 cursor-pointer hover:bg-secondary/80">
                  <PieChart className="w-3 h-3" />
                  {fractionalHoldings.length} Fractional Holdings
                </Badge>
              </Link>
            )}
          </div>
          <Button onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="glass rounded-xl p-4">
            <p className="text-muted-foreground text-sm mb-1">Total Value</p>
            <p className="font-display text-2xl font-bold text-foreground">{formatPrice(totalValue + fractionalCurrentValue)}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-muted-foreground text-sm mb-1">Total Cost</p>
            <p className="font-display text-2xl font-bold text-foreground">{formatPrice(totalCost + fractionalTotalInvested)}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-muted-foreground text-sm mb-1">Unrealized P/L</p>
            <p className={cn(
              "font-display text-2xl font-bold",
              (totalPnL + fractionalPnL) >= 0 ? "text-gain" : "text-loss"
            )}>
              {(totalPnL + fractionalPnL) >= 0 ? '+' : ''}{formatPrice(totalPnL + fractionalPnL)}
            </p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-muted-foreground text-sm mb-1">Return %</p>
            <p className={cn(
              "font-display text-2xl font-bold flex items-center gap-1",
              pnlPercent >= 0 ? "text-gain" : "text-loss"
            )}>
              {pnlPercent >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%
            </p>
          </div>
          <Link to="/fractional" className="glass rounded-xl p-4 hover:border-primary/50 transition-colors border border-transparent">
            <p className="text-muted-foreground text-sm mb-1 flex items-center gap-1">
              <PieChart className="w-3 h-3" />
              Fractional
            </p>
            <p className="font-display text-2xl font-bold text-primary">{formatPrice(fractionalCurrentValue)}</p>
            {fractionalPnL !== 0 && (
              <p className={cn("text-xs", fractionalPnL >= 0 ? "text-gain" : "text-loss")}>
                {fractionalPnL >= 0 ? '+' : ''}{formatPrice(fractionalPnL)}
              </p>
            )}
          </Link>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search your portfolio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Portfolio Items */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="hidden lg:grid grid-cols-12 gap-4 p-4 bg-secondary/50 text-muted-foreground text-sm font-medium border-b border-border/50">
            <div className="col-span-4">Item</div>
            <div className="col-span-1 text-center">Qty</div>
            <div className="col-span-2 text-right">Cost Basis</div>
            <div className="col-span-2 text-right">Current Value</div>
            <div className="col-span-2 text-right">P/L</div>
            <div className="col-span-1"></div>
          </div>

          <div className="divide-y divide-border/30">
            {filteredPortfolio.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No items in your portfolio
              </div>
            ) : (
              filteredPortfolio.map((item) => {
                const pnl = (item.currentPrice - item.purchasePrice) * item.quantity;
                const pnlPct = ((item.currentPrice - item.purchasePrice) / item.purchasePrice) * 100;

                return (
                  <div key={item.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-secondary/30 transition-colors">
                    {/* Item Info */}
                    <div className="col-span-12 lg:col-span-4 flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg bg-secondary overflow-hidden shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-foreground font-medium">{item.name}</p>
                          {item.inVault && (
                            <Badge variant="secondary" className="text-xs">Vault</Badge>
                          )}
                        </div>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded font-semibold",
                          item.grade === 'psa10' && "bg-gold/20 text-gold",
                          item.grade === 'psa9' && "bg-purple-500/20 text-purple-400",
                          item.grade === 'psa8' && "bg-blue-500/20 text-blue-400",
                          item.grade === 'bgs10' && "bg-gold/20 text-gold",
                          item.grade === 'bgs9_5' && "bg-purple-500/20 text-purple-400",
                          !['psa10', 'psa9', 'psa8', 'bgs10', 'bgs9_5'].includes(item.grade) && "bg-secondary text-muted-foreground"
                        )}>
                          {formatGrade(item.grade)}
                        </span>
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="hidden lg:block col-span-1 text-center text-foreground">
                      {item.quantity}
                    </div>

                    {/* Cost Basis */}
                    <div className="hidden lg:block col-span-2 text-right">
                      <p className="text-foreground font-medium">{formatPrice(item.purchasePrice * item.quantity)}</p>
                      <p className="text-muted-foreground text-xs">{formatPrice(item.purchasePrice)} each</p>
                    </div>

                    {/* Current Value */}
                    <div className="hidden lg:block col-span-2 text-right">
                      <p className="text-foreground font-semibold">{formatPrice(item.currentPrice * item.quantity)}</p>
                      <p className="text-muted-foreground text-xs">{formatPrice(item.currentPrice)} each</p>
                    </div>

                    {/* P/L */}
                    <div className="hidden lg:block col-span-2 text-right">
                      <p className={cn("font-semibold", pnl >= 0 ? "text-gain" : "text-loss")}>
                        {pnl >= 0 ? '+' : ''}{formatPrice(pnl)}
                      </p>
                      <p className={cn("text-xs", pnlPct >= 0 ? "text-gain" : "text-loss")}>
                        {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="hidden lg:flex col-span-1 justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Mobile Stats */}
                    <div className="col-span-12 lg:hidden flex items-center justify-between mt-2">
                      <div>
                        <span className="text-muted-foreground text-xs">Qty: {item.quantity}</span>
                        <span className="mx-2 text-border">|</span>
                        <span className="text-muted-foreground text-xs">Cost: {formatPrice(item.purchasePrice * item.quantity)}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-foreground font-semibold">{formatPrice(item.currentPrice * item.quantity)}</p>
                        <p className={cn("text-xs", pnl >= 0 ? "text-gain" : "text-loss")}>
                          {pnl >= 0 ? '+' : ''}{formatPrice(pnl)} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      <Footer />

      <AddToPortfolioDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
    </div>
  );
};

export default Portfolio;
