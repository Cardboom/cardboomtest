import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ShoppingCart, Menu, X, Bell, User, LogOut, Wallet, Vault, BadgeCheck, TrendingUp, Star, Sparkles, Gift, Trophy, PieChart, Gamepad2, Medal, ChevronDown, Users, Crown, MessageCircle, Award, ArrowLeftRight, Mic, Film, Award as GradingIcon, Swords } from 'lucide-react';
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
import { SmartSearch } from '@/components/SmartSearch';
import { useTheme } from '@/hooks/useTheme';
import cardboomLogo from '@/assets/cardboom-logo.png';
import cardboomLogoDark from '@/assets/cardboom-logo-dark-new.png';

interface HeaderProps {
  cartCount: number;
  onCartClick: () => void;
}

export const Header = ({ cartCount, onCartClick }: HeaderProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [isDark, setIsDark] = useState(false);
  
  // Listen for theme changes on document
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkTheme();
    
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);
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
    <>
    <header className="sticky top-0 z-[60] bg-background/95 backdrop-blur-xl border-b border-border/40 shadow-sm">
      {/* AI Insight Banner */}
      <div className="hidden md:flex items-center justify-center py-1.5 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-border/20">
        <AIMarketInsight />
      </div>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-4 overflow-visible">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group flex-shrink-0 relative z-10">
            <img 
              src={isDark ? cardboomLogoDark : cardboomLogo} 
              alt="CardBoom" 
              className="h-40 w-auto object-contain group-hover:scale-105 transition-transform duration-200"
            />
          </Link>

          {/* Smart Search with Autocomplete */}
          <div className="hidden md:flex items-center flex-1 max-w-md">
            <SmartSearch placeholder={t.nav.search} className="w-full" />
          </div>

          {/* Desktop Nav with Grouped Menus */}
          <nav className="hidden lg:flex items-center gap-0">
            <Link 
              to="/" 
              className="text-foreground hover:text-primary hover:bg-muted/50 transition-all text-xs font-semibold px-2 py-1.5 rounded-md"
            >
              {t.nav.marketplace}
            </Link>
            
            {/* Reels Link */}
            <Link 
              to="/reels" 
              className="text-foreground hover:text-primary hover:bg-muted/50 transition-all text-xs font-semibold px-2 py-1.5 rounded-md flex items-center gap-1"
            >
              <Film className="w-3.5 h-3.5" />
              {t.nav.reels}
            </Link>
            
            {/* Trading Dropdown */}
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-xs font-semibold text-foreground bg-transparent hover:bg-muted/50 hover:text-primary data-[state=open]:bg-muted/50 data-[state=open]:text-primary h-8 px-2">
                    <TrendingUp className="w-3.5 h-3.5 mr-1" />
                    {t.nav.trading}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[260px] gap-1 p-2">
                      <li>
                        <NavigationMenuLink asChild>
                          <Link to="/markets" className="flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/80 transition-colors group">
                            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <TrendingUp className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium text-xs">{t.nav.markets}</div>
                              <div className="text-[10px] text-muted-foreground">{t.nav.marketsDesc}</div>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link to="/explorer" className="flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/80 transition-colors group">
                            <div className="w-8 h-8 rounded-md bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                              <Search className="w-3.5 h-3.5 text-blue-500" />
                            </div>
                            <div>
                              <div className="font-medium text-xs">{t.nav.explorer}</div>
                              <div className="text-[10px] text-muted-foreground">{t.nav.explorerDesc}</div>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link to="/deals" className="flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/80 transition-colors group">
                            <div className="w-8 h-8 rounded-md bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            </div>
                            <div>
                              <div className="font-medium text-xs">{t.nav.deals}</div>
                              <div className="text-[10px] text-muted-foreground">{t.nav.dealsDesc}</div>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link to="/trades" className="flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/80 transition-colors group">
                            <div className="w-8 h-8 rounded-md bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                              <ArrowLeftRight className="w-3.5 h-3.5 text-purple-500" />
                            </div>
                            <div>
                              <div className="font-medium text-xs">{t.nav.tradesOffers}</div>
                              <div className="text-[10px] text-muted-foreground">{t.nav.tradesOffersDesc}</div>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link to="/fractional" className="flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/80 transition-colors group">
                            <div className="w-8 h-8 rounded-md bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                              <PieChart className="w-3.5 h-3.5 text-accent" />
                            </div>
                            <div>
                              <div className="font-medium text-xs">{t.nav.fractional}</div>
                              <div className="text-[10px] text-muted-foreground">{t.nav.fractionalDesc}</div>
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
                  <NavigationMenuTrigger className="text-xs font-semibold text-foreground bg-transparent hover:bg-muted/50 hover:text-primary data-[state=open]:bg-muted/50 data-[state=open]:text-primary h-8 px-2">
                    <Users className="w-3.5 h-3.5 mr-1" />
                    Community
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[260px] gap-1 p-2">
                      <li>
                        <NavigationMenuLink asChild>
                          <Link to="/circle" className="flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/80 transition-colors group">
                            <div className="w-8 h-8 rounded-md bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                              <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                            </div>
                            <div>
                              <div className="font-medium text-xs">Circle</div>
                              <div className="text-[10px] text-muted-foreground">Discussions & insights</div>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link to="/leaderboard" className="flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/80 transition-colors group">
                            <div className="w-8 h-8 rounded-md bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                              <Trophy className="w-3.5 h-3.5 text-amber-500" />
                            </div>
                            <div>
                              <div className="font-medium text-xs">Leaderboard</div>
                              <div className="text-[10px] text-muted-foreground">Rankings & tournaments</div>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link to="/hall-of-fame" className="flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/80 transition-colors group">
                            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <Crown className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium text-xs">Hall of Fame</div>
                              <div className="text-[10px] text-muted-foreground">Top collectors</div>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link to="/achievements" className="flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/80 transition-colors group">
                            <div className="w-8 h-8 rounded-md bg-yellow-500/10 flex items-center justify-center group-hover:bg-yellow-500/20 transition-colors">
                              <Award className="w-3.5 h-3.5 text-yellow-500" />
                            </div>
                            <div>
                              <div className="font-medium text-xs">Achievements</div>
                              <div className="text-[10px] text-muted-foreground">Earn bragging rights</div>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link to="/referrals" className="flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/80 transition-colors group">
                            <div className="w-8 h-8 rounded-md bg-pink-500/10 flex items-center justify-center group-hover:bg-pink/20 transition-colors">
                              <Mic className="w-3.5 h-3.5 text-pink-500" />
                            </div>
                            <div>
                              <div className="font-medium text-xs">Creators & Ambassadors</div>
                              <div className="text-[10px] text-muted-foreground">Become a creator</div>
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
              to="/grading" 
              className="text-foreground hover:text-primary hover:bg-muted/50 transition-all text-xs font-semibold px-2 py-1.5 rounded-md flex items-center gap-1"
            >
              <Award className="w-3.5 h-3.5" />
              {t.nav.grading}
            </Link>
            
            {/* Card Wars Link */}
            <Link 
              to="/#card-wars" 
              className="text-foreground hover:text-primary hover:bg-muted/50 transition-all text-xs font-semibold px-2 py-1.5 rounded-md flex items-center gap-1"
            >
              <Swords className="w-3.5 h-3.5" />
              Card Wars
            </Link>
            
            <Link 
              to="/gaming" 
              className="text-foreground hover:text-primary hover:bg-muted/50 transition-all text-xs font-semibold px-2 py-1.5 rounded-md flex items-center gap-1"
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              {t.nav.gaming}
            </Link>
          </nav>
          
          {/* Sell Button - Compact */}
          <Button 
            size="sm"
            onClick={() => navigate('/sell')}
            className="hidden lg:flex gap-1.5 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md shadow-primary/20 text-sm"
          >
            <span className="font-bold">+</span>
            {t.nav.sell}
          </Button>

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
                  <DropdownMenuItem onClick={() => navigate('/portfolio')}>
                    <PieChart className="w-4 h-4 mr-2" />
                    My Portfolio
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/trades')}>
                    <ArrowLeftRight className="w-4 h-4 mr-2" />
                    Trades & Offers
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
              className="lg:hidden relative z-[9999] pointer-events-auto"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

      </div>
    </header>
      
      {/* Mobile Menu - Fixed Full Screen - OUTSIDE header for proper z-index */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-x-0 top-[64px] bottom-0 z-[90] bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-x-0 top-[64px] bottom-0 z-[100] bg-background overflow-y-auto overscroll-contain lg:hidden">
          <div className="container mx-auto px-4 py-4 pb-24">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t.nav.search}
                  className="pl-10 bg-muted border-border/50 rounded-xl h-11 w-full"
                />
              </div>
              
              <nav className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                {/* Main Links */}
                <Link 
                  to="/" 
                  className="flex items-center gap-3 py-3 px-3 rounded-xl text-foreground hover:bg-muted transition-colors" 
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <TrendingUp className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">{t.nav.marketplace}</span>
                </Link>
                
                <Link 
                  to="/reels" 
                  className="flex items-center gap-3 py-3 px-3 rounded-xl text-foreground hover:bg-muted transition-colors" 
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Film className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">{t.nav.reels}</span>
                </Link>
                
                {/* Divider with label */}
                <div className="py-2 px-3 mt-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Trading</span>
                </div>
                
                <Link to="/markets" className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span>{t.nav.markets}</span>
                </Link>
                <Link to="/explorer" className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <Search className="w-5 h-5 text-blue-500" />
                  <span>Explorer</span>
                </Link>
                <Link to="/deals" className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span>{t.nav.deals}</span>
                </Link>
                <Link to="/trades" className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <ArrowLeftRight className="w-5 h-5 text-purple-500" />
                  <span>Trades & Offers</span>
                </Link>
                <Link to="/fractional" className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <PieChart className="w-5 h-5 text-cyan-500" />
                  <span>{t.nav.fractional}</span>
                </Link>
                
                {/* Services */}
                <div className="py-2 px-3 mt-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Services</span>
                </div>
                
                <Link to="/grading" className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <Award className="w-5 h-5 text-emerald-500" />
                  <span>{t.nav.grading}</span>
                </Link>
                <Link to="/gaming" className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <Gamepad2 className="w-5 h-5 text-pink-500" />
                  <span>{t.nav.gaming}</span>
                </Link>
                
                {/* Community */}
                <div className="py-2 px-3 mt-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Community</span>
                </div>
                
                <Link to="/circle" className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <MessageCircle className="w-5 h-5 text-blue-500" />
                  <span>Circle</span>
                </Link>
                <Link to="/leaderboard" className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <span>Leaderboard</span>
                </Link>
                <Link to="/achievements" className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <Medal className="w-5 h-5 text-yellow-500" />
                  <span>Achievements</span>
                </Link>
                <Link to="/referrals" className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <Mic className="w-5 h-5 text-pink-500" />
                  <span>Creators</span>
                </Link>
                
                {/* Account */}
                <div className="py-2 px-3 mt-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Account</span>
                </div>
                
                <Link to="/sell" className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <TrendingUp className="w-5 h-5 text-muted-foreground" />
                  <span>{t.nav.sell}</span>
                </Link>
                <Link to="/portfolio" className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <PieChart className="w-5 h-5 text-muted-foreground" />
                  <span>{t.nav.portfolio}</span>
                </Link>
                
                {user && (
                  <>
                    <Link to="/wallet" className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(false)}>
                      <Wallet className="w-5 h-5 text-muted-foreground" />
                      <span>{t.nav.wallet}</span>
                    </Link>
                    <Link to="/vault" className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(false)}>
                      <Vault className="w-5 h-5 text-muted-foreground" />
                      <span>My Vault</span>
                    </Link>
                    <Link to="/messages" className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(false)}>
                      <MessageCircle className="w-5 h-5 text-muted-foreground" />
                      <span>Messages</span>
                      {unreadMessages > 0 && (
                        <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                          {unreadMessages > 99 ? '99+' : unreadMessages}
                        </span>
                      )}
                    </Link>
                  </>
                )}
                
                {/* Auth section */}
                <div className="mt-4 pt-4 border-t border-border">
                  {user ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 px-3 py-2">
                        {userAvatar ? (
                          <img src={userAvatar} alt="Profile" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{user.email?.split('@')[0]}</div>
                          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                        </div>
                      </div>
                      <Link 
                        to="/profile" 
                        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-muted hover:bg-muted/80 transition-colors font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        View Profile
                      </Link>
                      <Button 
                        variant="destructive" 
                        onClick={handleSignOut} 
                        className="w-full rounded-xl"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        {t.nav.signOut}
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="default" 
                      onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }} 
                      className="w-full h-11 rounded-xl"
                    >
                      <User className="w-4 h-4 mr-2" />
                      {t.nav.signIn}
                    </Button>
                  )}
                </div>
              </nav>
            </div>
          </div>
        </>
      )}
    </>
  );
};
