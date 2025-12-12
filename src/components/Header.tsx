import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ShoppingCart, Menu, X, Bell, User, LogOut, Wallet, Vault, BadgeCheck, TrendingUp, Star, Sparkles, Gift } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useLanguage } from '@/contexts/LanguageContext';
import { XPProgressBar } from '@/components/XPProgressBar';
import { NotificationCenter } from '@/components/NotificationCenter';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CurrencyToggle } from '@/components/CurrencyToggle';

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

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              {t.nav.marketplace}
            </Link>
            <Link to="/markets" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              Markets
            </Link>
            <Link to="/deals" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              Deals
            </Link>
            <Link to="/sell" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              {t.nav.sell}
            </Link>
            <Link to="/vault" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
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
                  <DropdownMenuItem onClick={() => navigate('/wallet')}>
                    <Wallet className="w-4 h-4 mr-2" />
                    Wallet
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/vault')}>
                    <Vault className="w-4 h-4 mr-2" />
                    My Vault
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/sell')}>
                    <User className="w-4 h-4 mr-2" />
                    My Listings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/referrals')}>
                    <Gift className="w-4 h-4 mr-2" />
                    Referrals & XP
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/verified-seller')}>
                    <BadgeCheck className="w-4 h-4 mr-2" />
                    Verified Seller
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
            <nav className="flex flex-col gap-3">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                {t.nav.marketplace}
              </Link>
              <Link to="/markets" className="text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <TrendingUp className="w-4 h-4" />
                Markets
              </Link>
              <Link to="/deals" className="text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <Sparkles className="w-4 h-4" />
                Deals
              </Link>
              <Link to="/sell" className="text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                {t.nav.sell}
              </Link>
              <Link to="/vault" className="text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                {t.nav.portfolio}
              </Link>
              {user && (
                <>
                  <Link to="/wallet" className="text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                    <Wallet className="w-4 h-4 inline mr-2" />
                    Wallet
                  </Link>
                  <Link to="/verified-seller" className="text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                    <BadgeCheck className="w-4 h-4 inline mr-2" />
                    Verified Seller
                  </Link>
                  <Link to="/referrals" className="text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                    <Gift className="w-4 h-4 inline mr-2" />
                    Referrals & XP
                  </Link>
                </>
              )}
              {user ? (
                <>
                  <div className="py-2 text-foreground font-medium">
                    {user.email}
                  </div>
                  <Button variant="destructive" onClick={handleSignOut} className="mt-2">
                    <LogOut className="w-4 h-4 mr-2" />
                    {t.nav.signOut}
                  </Button>
                </>
              ) : (
                <Button variant="default" onClick={() => navigate('/auth')} className="mt-2">
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
