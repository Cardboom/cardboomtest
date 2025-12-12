import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, TrendingUp, TrendingDown, Search, Trash2, 
  Edit, ExternalLink, Package, DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AddToPortfolioDialog } from '@/components/portfolio/AddToPortfolioDialog';

// Mock portfolio data
const MOCK_PORTFOLIO = [
  { 
    id: '1', 
    name: 'Charizard Base Set', 
    grade: 'PSA 10',
    purchasePrice: 380000, 
    currentPrice: 420000, 
    quantity: 1,
    inVault: true,
    image: '/placeholder.svg'
  },
  { 
    id: '2', 
    name: 'LeBron James Rookie', 
    grade: 'PSA 10',
    purchasePrice: 220000, 
    currentPrice: 245000, 
    quantity: 1,
    inVault: false,
    image: '/placeholder.svg'
  },
  { 
    id: '3', 
    name: 'Monkey D. Luffy Leader', 
    grade: 'PSA 10',
    purchasePrice: 500, 
    currentPrice: 850, 
    quantity: 3,
    inVault: false,
    image: '/placeholder.svg'
  },
  { 
    id: '4', 
    name: 'Pikachu Illustrator', 
    grade: 'PSA 9',
    purchasePrice: 2200000, 
    currentPrice: 2500000, 
    quantity: 1,
    inVault: true,
    image: '/placeholder.svg'
  },
];

const Portfolio = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);

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
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">My Portfolio</h1>
            <p className="text-muted-foreground">Track your collection and performance</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="glass rounded-xl p-4">
            <p className="text-muted-foreground text-sm mb-1">Total Value</p>
            <p className="font-display text-2xl font-bold text-foreground">{formatPrice(totalValue)}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-muted-foreground text-sm mb-1">Total Cost</p>
            <p className="font-display text-2xl font-bold text-foreground">{formatPrice(totalCost)}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-muted-foreground text-sm mb-1">Unrealized P/L</p>
            <p className={cn(
              "font-display text-2xl font-bold",
              totalPnL >= 0 ? "text-gain" : "text-loss"
            )}>
              {totalPnL >= 0 ? '+' : ''}{formatPrice(totalPnL)}
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
                          "text-xs px-2 py-0.5 rounded",
                          item.grade === 'PSA 10' ? "bg-gold/20 text-gold" : "bg-purple-500/20 text-purple-400"
                        )}>
                          {item.grade}
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
