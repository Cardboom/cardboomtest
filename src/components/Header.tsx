import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ShoppingCart, Menu, X, Bell, User, LogOut, Wallet, Vault, BadgeCheck, TrendingUp, Star, Sparkles, Gift, Trophy, PieChart, Gamepad2, Medal, ChevronDown, Users, Crown, MessageCircle, Award } from 'lucide-react';
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
import { useTheme } from '@/hooks/useTheme';
import cardboomLogo from '@/assets/cardboom-logo.png';
import cardboomLogoDark from '@/assets/cardboom-logo-dark.png';

interface HeaderProps {
  cartCount: number;
  onCartClick: () => void;
}

export const Header = ({ cartCount, onCartClick }: HeaderProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userXP, setUserXP] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserXP(session.user.id);
          fetchUnreadCounts(session.user.id);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserXP(session.user.id);
        fetchUnreadCounts(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserXP = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('xp, level, avatar_url')
      .eq('id', userId)
      .single();
    
    if (data) {
      setUserXP(data.xp || 0);
      setUserLevel(data.level || 1);
      setUserAvatar(data.avatar_url);
    }
  };

  const fetchUnreadCounts = async (userId: string) => {
    // Fetch unread messages
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`);
    
    if (conversations && conversations.length > 0) {
      const conversationIds = conversations.map(c => c.id);
      const { count: messagesCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .neq('sender_id', userId)
        .eq('is_read', false);
      
      setUnreadMessages(messagesCount || 0);
    }

    // Fetch unread notifications
    const { count: notificationsCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    setUnreadNotifications(notificationsCount || 0);
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
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/40 shadow-sm">
      {/* AI Insight Banner */}
      <div className="hidden md:flex items-center justify-center py-1.5 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-border/20">
        <AIMarketInsight />
      </div>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
            <img 
              src={isDark ? cardboomLogoDark : cardboomLogo} 
              alt="CardBoom" 
              className="h-40 w-auto object-contain group-hover:scale-105 transition-transform duration-200"
            />
          </Link>

          {/* Search Bar - Improved visibility */}
          <div className={cn(
            "hidden md:flex items-center flex-1 max-w-md relative transition-all duration-200",
            searchFocused && "max-w-lg"
          )}>
            <div className={cn(
              "relative w-full group",
              searchFocused && "ring-2 ring-primary/20 rounded-lg"
            )}>
              <Search className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
                searchFocused ? "text-primary" : "text-muted-foreground"
              )} />
              <Input
                type="text"
                placeholder={t.nav.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    navigate(`/markets?search=${encodeURIComponent(searchQuery.trim())}`);
                    setSearchQuery('');
                  }
                }}
                className="w-full pl-10 pr-4 h-10 bg-muted/50 hover:bg-muted/70 border-border/50 focus:border-primary/50 focus:bg-background rounded-lg text-sm placeholder:text-muted-foreground/70 transition-all"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
            </div>
          </div>

          {/* Desktop Nav with Grouped Menus */}
          <nav className="hidden lg:flex items-center gap-0.5">
            <Link 
              to="/" 
              className="text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-all text-sm font-medium px-3 py-2 rounded-md"
            >
              {t.nav.marketplace}
            </Link>
            
            {/* Trading Dropdown */}
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-sm font-medium text-foreground/80 hover:text-foreground bg-transparent hover:bg-muted/50 data-[state=open]:bg-muted/50 h-9 px-3">
                    <TrendingUp className="w-4 h-4 mr-1.5" />
                    Trading
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[280px] gap-1 p-2">
                      <li>
                        <NavigationMenuLink asChild>
                          <Link to="/markets" className="flex items-center gap-3 p-2.5 rounded-md hover:bg-muted/80 transition-colors group">
                            <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <TrendingUp className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium text-sm">{t.nav.markets}</div>
                              <div className="text-xs text-muted-foreground">Live prices & charts</div>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link to="/deals" className="flex items-center gap-3 p-2.5 rounded-md hover:bg-muted/80 transition-colors group">
                            <div className="w-9 h-9 rounded-md bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                              <Sparkles className="w-4 h-4 text-amber-500" />
                            </div>
                            <div>
                              <div className="font-medium text-sm">{t.nav.deals}</div>
                              <div className="text-xs text-muted-foreground">Arbitrage & hot deals</div>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link to="/fractional" className="flex items-center gap-3 p-2.5 rounded-md hover:bg-muted/80 transition-colors group">
                            <div className="w-9 h-9 rounded-md bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                              <PieChart className="w-4 h-4 text-accent" />
                            </div>
                            <div>
                              <div className="font-medium text-sm">{t.nav.fractional}</div>
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
                  <NavigationMenuTrigger className="text-sm font-medium text-foreground/80 hover:text-foreground bg-transparent hover:bg-muted/50 data-[state=open]:bg-muted/50 h-9 px-3">
                    <Users className="w-4 h-4 mr-1.5" />
                    Community
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[280px] gap-1 p-2">
                      <li>
                        <NavigationMenuLink asChild>
                          <Link to="/leaderboard" className="flex items-center gap-3 p-2.5 rounded-md hover:bg-muted/80 transition-colors group">
                            <div className="w-9 h-9 rounded-md bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                              <Trophy className="w-4 h-4 text-amber-500" />
                            </div>
                            <div>
                              <div className="font-medium text-sm">Leaderboard</div>
                              <div className="text-xs text-muted-foreground">Rankings & tournaments</div>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link to="/hall-of-fame" className="flex items-center gap-3 p-2.5 rounded-md hover:bg-muted/80 transition-colors group">
                            <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <Crown className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium text-sm">Hall of Fame</div>
                              <div className="text-xs text-muted-foreground">Top collectors</div>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link to="/achievements" className="flex items-center gap-3 p-2.5 rounded-md hover:bg-muted/80 transition-colors group">
                            <div className="w-9 h-9 rounded-md bg-yellow-500/10 flex items-center justify-center group-hover:bg-yellow-500/20 transition-colors">
                              <Award className="w-4 h-4 text-yellow-500" />
                            </div>
                            <div>
                              <div className="font-medium text-sm">Achievements</div>
                              <div className="text-xs text-muted-foreground">Earn bragging rights</div>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            <Link 
              to="/gaming" 
              className="text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-all text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5"
            >
              <Gamepad2 className="w-4 h-4" />
              {t.nav.gaming}
            </Link>
            <Link 
              to="/sell" 
              className="text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-all text-sm font-medium px-3 py-2 rounded-md"
            >
              {t.nav.sell}
            </Link>
            <Link 
              to="/vault" 
              className="text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-all text-sm font-medium px-3 py-2 rounded-md"
            >
              {t.nav.portfolio}
            </Link>
          </nav>

          <div className="flex items-center gap-0.5">
            <CurrencyToggle />
            <ThemeToggle />
            <LanguageSelector />
            {user && (
              <div className="hidden sm:flex">
                <NotificationCenter />
              </div>
            )}
            
            <Button variant="ghost" size="icon" className="relative h-9 w-9" onClick={onCartClick}>
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground rounded-full text-[10px] flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="default" className="hidden sm:flex gap-2 items-center">
                    {userAvatar ? (
                      <img 
                        src={userAvatar} 
                        alt="Profile" 
                        className="w-6 h-6 rounded-full object-cover ring-2 ring-primary-foreground/20"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                        <User className="w-3.5 h-3.5" />
                      </div>
                    )}
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
                  <DropdownMenuItem onClick={() => navigate('/pricing')} className="text-primary">
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade to Pro
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/messages')} className="relative">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Messages
                    {unreadMessages > 0 && (
                      <span className="ml-auto bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                        {unreadMessages > 99 ? '99+' : unreadMessages}
                      </span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/notifications')} className="relative">
                    <Bell className="w-4 h-4 mr-2" />
                    Notifications
                    {unreadNotifications > 0 && (
                      <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                        {unreadNotifications > 99 ? '99+' : unreadNotifications}
                      </span>
                    )}
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
