import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ShoppingCart, Menu, X, Bell, User, LogOut, Wallet, Vault, BadgeCheck, TrendingUp, Star, Sparkles, Gift, Trophy, PieChart, Gamepad2, Medal, ChevronDown, Users, Crown, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { toast } from 'sonner';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useLanguage } from '@/contexts/LanguageContext';
import { XPProgressBar } from '@/components/XPProgressBar';
import { NotificationCenter } from '@/components/NotificationCenter';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CurrencyToggle } from '@/components/CurrencyToggle';
import { AIMarketInsight } from '@/components/AIMarketInsight';
import { cn } from '@/lib/utils';

interface HeaderProps {
  cartCount: number;
  onCartClick: () => void;
}

export const Header = ({ cartCount, onCartClick }: HeaderProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userXP, setUserXP] = useState(0);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserXP(session.user.id);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserXP(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserXP = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('xp')
      .eq('id', userId)
      .single();
    
    if (data) {
      setUserXP(data.xp || 0);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Error signing out');
    } else {
      toast.success('Signed out successfully');
      navigate('/');
    }
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/30">
      {/* AI Insight Banner */}
      <div className="hidden md:flex items-center justify-center py-1.5 bg-muted/30 border-b border-border/20">
        <AIMarketInsight />
      </div>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
              <span className="text-primary-foreground font-display font-bold text-lg">C</span>
            </div>
            <span className="font-display text-xl font-bold text-foreground hidden sm:block tracking-tight">
              CARD<span className="text-primary">BOOM</span>
            </span>
          </div>

          {/* Search Bar */}
          <div className={`hidden md:flex items-center flex-1 max-w-xl mx-8 relative transition-all duration-300 ${searchFocused ? 'scale-[1.02]' : ''}`}>
            <Search className="absolute left-4 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t.nav.search}
              className="pl-11 bg-secondary/50 border-border/30 focus:border-primary/50 focus:ring-primary/20 rounded-xl h-11"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>

          {/* Desktop Nav with Grouped Menus */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link to="/" className="text-foreground hover:text-primary transition-colors text-sm font-bold px-3 py-2">
              {t.nav.marketplace}
            </Link>
            
            {/* Trading Dropdown */}
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-sm font-bold bg-transparent hover:bg-transparent data-[state=open]:bg-transparent">
                    <TrendingUp className="w-4 h-4 mr-1.5" />
                    Trading
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[300px] gap-1 p-2">
                      <li>
                        <NavigationMenuLink asChild>
                          <Link to="/markets" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            <div>
                              <div className="font-semibold text-sm">{t.nav.markets}</div>
                              <div className="text-xs text-muted-foreground">Live market prices & charts</div>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link to="/deals" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                            <Sparkles className="w-5 h-5 text-gold" />
                            <div>
                              <div className="font-semibold text-sm">{t.nav.deals}</div>
                              <div className="text-xs text-muted-foreground">Arbitrage & hot deals</div>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link to="/fractional" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                            <PieChart className="w-5 h-5 text-accent" />
                            <div>
                              <div className="font-semibold text-sm">{t.nav.fractional}</div>
                              <div className="text-xs text-muted-foreground">Own fractions of grails</div>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            {/* Community Dropdown */}
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-sm font-bold bg-transparent hover:bg-transparent data-[state=open]:bg-transparent">
                    <Users className="w-4 h-4 mr-1.5" />
                    Community
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[300px] gap-1 p-2">
                      <li>
                        <NavigationMenuLink asChild>
                          <Link to="/leaderboard" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                            <Trophy className="w-5 h-5 text-gold" />
                            <div>
                              <div className="font-semibold text-sm">Leaderboard</div>
                              <div className="text-xs text-muted-foreground">Global rankings & tournaments</div>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link to="/hall-of-fame" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                            <Crown className="w-5 h-5 text-primary" />
                            <div>
                              <div className="font-semibold text-sm">Hall of Fame</div>
                              <div className="text-xs text-muted-foreground">Top collectors & achievements</div>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link to="/gaming" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                            <Gamepad2 className="w-5 h-5 text-accent" />
                            <div>
                              <div className="font-semibold text-sm">{t.nav.gaming}</div>
                              <div className="text-xs text-muted-foreground">Gaming hub & coaching</div>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      {user && (
                        <li>
                          <NavigationMenuLink asChild>
                            <Link to="/messages" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                              <MessageCircle className="w-5 h-5 text-muted-foreground" />
                              <div>
                                <div className="font-semibold text-sm">Messages</div>
                                <div className="text-xs text-muted-foreground">Chat with traders</div>
                              </div>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      )}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            <Link to="/sell" className="text-foreground hover:text-primary transition-colors text-sm font-bold px-3 py-2">
              {t.nav.sell}
            </Link>
            <Link to="/vault" className="text-foreground hover:text-primary transition-colors text-sm font-bold px-3 py-2">
              {t.nav.portfolio}
            </Link>
          </nav>

          <div className="flex items-center gap-1">
            <CurrencyToggle />
            <ThemeToggle />
            <LanguageSelector />
            {user && (
              <div className="hidden sm:flex">
                <NotificationCenter />
              </div>
            )}
            
            <Button variant="ghost" size="icon" className="relative" onClick={onCartClick}>
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="default" className="hidden sm:flex gap-2">
                    <Star className="w-4 h-4" />
                    {user.email?.split('@')[0]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  {/* XP Progress */}
                  <div className="p-3 border-b border-border/50">
                    <XPProgressBar xp={userXP} compact />
                  </div>
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="w-4 h-4 mr-2" />
                    {t.nav.myProfile}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/wallet')}>
                    <Wallet className="w-4 h-4 mr-2" />
                    {t.nav.wallet}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/vault')}>
                    <Vault className="w-4 h-4 mr-2" />
                    {t.nav.myVault}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/sell')}>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    {t.nav.myListings}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/referrals')}>
                    <Gift className="w-4 h-4 mr-2" />
                    {t.nav.referrals}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/verified-seller')}>
                    <BadgeCheck className="w-4 h-4 mr-2" />
                    {t.nav.verifiedSeller}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-500">
                    <LogOut className="w-4 h-4 mr-2" />
                    {t.nav.signOut}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                variant="default" 
                className="hidden sm:flex gap-2"
                onClick={() => navigate('/auth')}
              >
                <User className="w-4 h-4" />
                {t.nav.signIn}
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border/50 animate-fade-in">
            <div className="flex items-center mb-4">
              <Search className="absolute ml-3 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t.nav.search}
                className="pl-10 bg-secondary border-border/50 rounded-full"
              />
            </div>
            <nav className="flex flex-col gap-1">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors py-2 px-2 rounded-lg hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                {t.nav.marketplace}
              </Link>
              
              {/* Trading Section */}
              <div className="py-2 px-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trading</span>
              </div>
              <Link to="/markets" className="text-muted-foreground hover:text-foreground transition-colors py-2 px-2 rounded-lg hover:bg-muted flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <TrendingUp className="w-4 h-4" />
                {t.nav.markets}
              </Link>
              <Link to="/deals" className="text-muted-foreground hover:text-foreground transition-colors py-2 px-2 rounded-lg hover:bg-muted flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <Sparkles className="w-4 h-4" />
                {t.nav.deals}
              </Link>
              <Link to="/fractional" className="text-muted-foreground hover:text-foreground transition-colors py-2 px-2 rounded-lg hover:bg-muted flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <PieChart className="w-4 h-4" />
                {t.nav.fractional}
              </Link>
              
              {/* Community Section */}
              <div className="py-2 px-2 mt-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Community</span>
              </div>
              <Link to="/leaderboard" className="text-muted-foreground hover:text-foreground transition-colors py-2 px-2 rounded-lg hover:bg-muted flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <Trophy className="w-4 h-4" />
                Leaderboard
              </Link>
              <Link to="/hall-of-fame" className="text-muted-foreground hover:text-foreground transition-colors py-2 px-2 rounded-lg hover:bg-muted flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <Crown className="w-4 h-4" />
                Hall of Fame
              </Link>
              <Link to="/gaming" className="text-muted-foreground hover:text-foreground transition-colors py-2 px-2 rounded-lg hover:bg-muted flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <Gamepad2 className="w-4 h-4" />
                {t.nav.gaming}
              </Link>
              
              {/* Sell & Portfolio */}
              <div className="py-2 px-2 mt-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">My Account</span>
              </div>
              <Link to="/sell" className="text-muted-foreground hover:text-foreground transition-colors py-2 px-2 rounded-lg hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                {t.nav.sell}
              </Link>
              <Link to="/vault" className="text-muted-foreground hover:text-foreground transition-colors py-2 px-2 rounded-lg hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                {t.nav.portfolio}
              </Link>
              {user && (
                <>
                  <Link to="/wallet" className="text-muted-foreground hover:text-foreground transition-colors py-2 px-2 rounded-lg hover:bg-muted flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                    <Wallet className="w-4 h-4" />
                    {t.nav.wallet}
                  </Link>
                  <Link to="/messages" className="text-muted-foreground hover:text-foreground transition-colors py-2 px-2 rounded-lg hover:bg-muted flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                    <MessageCircle className="w-4 h-4" />
                    Messages
                  </Link>
                  <Link to="/verified-seller" className="text-muted-foreground hover:text-foreground transition-colors py-2 px-2 rounded-lg hover:bg-muted flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                    <BadgeCheck className="w-4 h-4" />
                    {t.nav.verifiedSeller}
                  </Link>
                  <Link to="/referrals" className="text-muted-foreground hover:text-foreground transition-colors py-2 px-2 rounded-lg hover:bg-muted flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                    <Gift className="w-4 h-4" />
                    {t.nav.referrals}
                  </Link>
                </>
              )}
              {user ? (
                <>
                  <div className="py-2 px-2 text-foreground font-medium mt-2">
                    {user.email}
                  </div>
                  <Button variant="destructive" onClick={handleSignOut} className="mt-2">
                    <LogOut className="w-4 h-4 mr-2" />
                    {t.nav.signOut}
                  </Button>
                </>
              ) : (
                <Button variant="default" onClick={() => navigate('/auth')} className="mt-4">
                  <User className="w-4 h-4 mr-2" />
                  {t.nav.signIn}
                </Button>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
