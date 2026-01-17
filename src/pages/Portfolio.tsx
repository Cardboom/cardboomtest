import { useState, useEffect, useMemo } from 'react';
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
  Edit, ExternalLink, Package, DollarSign, PieChart, Clock, Upload, Share2,
  Wallet, CheckSquare, Square
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AddToPortfolioDialog } from '@/components/portfolio/AddToPortfolioDialog';
import { PortfolioImport } from '@/components/portfolio/PortfolioImport';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatDistanceToNow, subDays, format } from 'date-fns';
import { formatGrade, CardGrade } from '@/hooks/useGradePrices';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

// Portfolio item type
interface PortfolioItem {
  id: string;
  name: string;
  grade: CardGrade;
  purchasePrice: number;
  currentPrice: number;
  quantity: number;
  inVault: boolean;
  image: string;
}

const Portfolio = () => {
  const navigate = useNavigate();
  const { formatPrice: formatCurrencyPrice } = useCurrency();
  const [cartItems, setCartItems] = useState([]);
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  // Fetch real portfolio data from database
  const { data: portfolioItems = [], refetch: refetchPortfolio } = useQuery({
    queryKey: ['portfolio-items', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Fetch portfolio_items with market data
      const { data: dbItems, error } = await supabase
        .from('portfolio_items')
        .select('*, market_item:market_items(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform to PortfolioItem format
      return (dbItems || []).map(item => ({
        id: item.id,
        name: item.custom_name || item.market_item?.name || 'Unknown Card',
        grade: (item.grade || 'raw') as CardGrade,
        purchasePrice: item.purchase_price || 0,
        currentPrice: item.market_item?.current_price || item.purchase_price || 0,
        quantity: item.quantity || 1,
        inVault: false,
        image: item.image_url || item.market_item?.image_url || '/placeholder.svg',
      }));
    },
    enabled: !!user,
  });

  const handleRemoveItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('portfolio_items')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);
      
      if (error) throw error;
      
      refetchPortfolio();
      setSelectedItems(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success('Item removed from portfolio');
    } catch (error) {
      toast.error('Failed to remove item');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    
    try {
      const { error } = await supabase
        .from('portfolio_items')
        .delete()
        .in('id', Array.from(selectedItems))
        .eq('user_id', user?.id);
      
      if (error) throw error;
      
      refetchPortfolio();
      toast.success(`${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''} removed from portfolio`);
      setSelectedItems(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      toast.error('Failed to remove items');
    }
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredPortfolio.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredPortfolio.map(item => item.id)));
    }
  };


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
  const totalValue = portfolioItems.reduce((sum, item) => sum + item.currentPrice * item.quantity, 0);
  const totalCost = portfolioItems.reduce((sum, item) => sum + item.purchasePrice * item.quantity, 0);
  const totalPnL = totalValue - totalCost;
  const pnlPercent = totalCost > 0 ? ((totalPnL / totalCost) * 100) : 0;
  const netWorth = totalValue + fractionalCurrentValue;

  // Fetch real historical data from portfolio_snapshots
  const { data: snapshotData } = useQuery({
    queryKey: ['portfolio-snapshots', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data, error } = await supabase
        .from('portfolio_snapshots')
        .select('total_value, recorded_at')
        .eq('user_id', user.id)
        .gte('recorded_at', thirtyDaysAgo)
        .order('recorded_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Generate chart data from real snapshots or fallback to current value
  const chartData = useMemo(() => {
    if (snapshotData && snapshotData.length > 0) {
      return snapshotData.map(s => ({
        date: format(new Date(s.recorded_at), 'MMM dd'),
        fullDate: format(new Date(s.recorded_at), 'MMM dd, yyyy'),
        value: Math.round(Number(s.total_value)),
      }));
    }
    // Fallback: just show current value as single point
    return [{ date: format(new Date(), 'MMM dd'), fullDate: format(new Date(), 'MMM dd, yyyy'), value: Math.round(netWorth) }];
  }, [snapshotData, netWorth]);

  const chartChange = chartData.length > 1 ? netWorth - chartData[0].value : 0;
  const chartChangePercent = chartData.length > 1 && chartData[0].value > 0 
    ? ((netWorth - chartData[0].value) / chartData[0].value) * 100 
    : 0;

  const filteredPortfolio = portfolioItems.filter(item =>
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
        {/* Net Worth Hero Section */}
        <div className="glass rounded-2xl p-6 md:p-8 mb-6 relative overflow-hidden">
          {/* Background gradient effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />
          
          <div className="relative z-10">
            {/* Header with title and actions */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-5 h-5 text-primary" />
                  <span className="text-muted-foreground text-sm font-medium uppercase tracking-wide">Your Net Worth</span>
                </div>
                <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
                  {formatPrice(netWorth)}
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className={cn(
                    "flex items-center gap-1 text-lg font-semibold",
                    chartChange >= 0 ? "text-gain" : "text-loss"
                  )}>
                    {chartChange >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    {chartChange >= 0 ? '+' : ''}{formatPrice(chartChange)}
                  </span>
                  <span className={cn(
                    "text-sm px-2 py-0.5 rounded-full font-medium",
                    chartChangePercent >= 0 ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"
                  )}>
                    {chartChangePercent >= 0 ? '+' : ''}{chartChangePercent.toFixed(2)}%
                  </span>
                  <span className="text-muted-foreground text-sm">Past 30 days</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowImportDialog(true)} className="gap-2">
                  <Upload className="w-4 h-4" />
                  Import
                </Button>
                <Button onClick={() => setShowAddDialog(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Item
                </Button>
              </div>
            </div>

            {/* Portfolio Chart */}
            <div className="h-[200px] md:h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartChange >= 0 ? "hsl(var(--gain))" : "hsl(var(--loss))"} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={chartChange >= 0 ? "hsl(var(--gain))" : "hsl(var(--loss))"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    interval="preserveStartEnd"
                    tickMargin={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(value) => formatPrice(value)}
                    width={80}
                    domain={[(dataMin: number) => Math.max(0, dataMin * 0.9), (dataMax: number) => dataMax * 1.1]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: 4 }}
                    formatter={(value: number) => [formatPrice(value), 'Portfolio Value']}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke={chartChange >= 0 ? "hsl(var(--gain))" : "hsl(var(--loss))"} 
                    strokeWidth={2}
                    fill="url(#portfolioGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
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
          {/* Fractional section temporarily disabled */}
        </div>

        {/* Search and Bulk Actions */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search your portfolio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={isSelectionMode ? "secondary" : "outline"}
              size="sm"
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) setSelectedItems(new Set());
              }}
              className="gap-2"
            >
              <CheckSquare className="w-4 h-4" />
              {isSelectionMode ? 'Cancel' : 'Select'}
            </Button>
            
            {isSelectionMode && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                >
                  {selectedItems.size === filteredPortfolio.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={selectedItems.size === 0}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete ({selectedItems.size})
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Portfolio Items */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="hidden lg:grid grid-cols-12 gap-4 p-4 bg-secondary/50 text-muted-foreground text-sm font-medium border-b border-border/50">
            {isSelectionMode && <div className="col-span-1"></div>}
            <div className={cn("col-span-4", isSelectionMode && "col-span-3")}>Item</div>
            <div className="col-span-1 text-center">Qty</div>
            <div className="col-span-2 text-right">Cost Basis</div>
            <div className="col-span-2 text-right">Current Value</div>
            <div className="col-span-2 text-right">P/L</div>
            {!isSelectionMode && <div className="col-span-1"></div>}
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
                  <div key={item.id} className={cn(
                    "grid grid-cols-12 gap-4 p-4 items-center transition-colors",
                    isSelectionMode && selectedItems.has(item.id) ? "bg-primary/10" : "hover:bg-secondary/30"
                  )}>
                    {/* Selection Checkbox */}
                    {isSelectionMode && (
                      <div 
                        className="col-span-1 flex items-center justify-center cursor-pointer"
                        onClick={() => toggleItemSelection(item.id)}
                      >
                        {selectedItems.has(item.id) ? (
                          <CheckSquare className="w-5 h-5 text-primary" />
                        ) : (
                          <Square className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    )}
                    
                    {/* Item Info */}
                    <div className={cn(
                      "col-span-12 lg:col-span-4 flex items-center gap-3",
                      isSelectionMode && "lg:col-span-3"
                    )}>
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

                    {/* Actions - hide in selection mode */}
                    {!isSelectionMode && (
                      <div className="hidden lg:flex col-span-1 justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    {/* Mobile Stats */}
                    <div className="col-span-12 lg:hidden flex items-center justify-between mt-2">
                      {isSelectionMode ? (
                        <div 
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={() => toggleItemSelection(item.id)}
                        >
                          {selectedItems.has(item.id) ? (
                            <CheckSquare className="w-5 h-5 text-primary" />
                          ) : (
                            <Square className="w-5 h-5 text-muted-foreground" />
                          )}
                          <span className="text-sm">{selectedItems.has(item.id) ? 'Selected' : 'Tap to select'}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">Qty: {item.quantity}</span>
                          <span className="text-border">|</span>
                          <span className="text-muted-foreground text-xs">Cost: {formatPrice(item.purchasePrice * item.quantity)}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10 ml-1"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
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
      <PortfolioImport 
        open={showImportDialog} 
        onOpenChange={setShowImportDialog}
        onImportComplete={() => {}}
      />
    </div>
  );
};

export default Portfolio;
