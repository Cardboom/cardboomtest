import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ShoppingCart, Menu, X, Bell, User, LogOut, Wallet, Vault, BadgeCheck, TrendingUp, Star, Sparkles, Gift, Trophy, PieChart, Gamepad2, Medal, ChevronDown, Users, Crown, MessageCircle, Award, ArrowLeftRight, Mic, Film, Award as GradingIcon, Swords, Gem, Flame, Rocket, Package } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { Badge } from '@/components/ui/badge';
import { CardboomPointsBadge } from '@/components/CardboomPointsBadge';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  const { isPro, isEnterprise } = useSubscription(user?.id);

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
    <header className="fixed top-0 left-0 right-0 z-[60] bg-background/95 backdrop-blur-xl border-b border-border/40 shadow-sm">
      <div className="w-full px-4 lg:px-6">
        <div className="flex items-center justify-between h-16 gap-4 overflow-visible">
          {/* Logo - pushed to the left edge */}
          <Link 
            to="/" 
            className="flex items-center gap-2 group flex-shrink-0 relative z-10 -ml-2"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <img 
              src={isDark ? cardboomLogoDark : cardboomLogo} 
              alt="CardBoom" 
              width={160}
              height={160}
              className="h-40 w-auto object-contain group-hover:scale-105 transition-transform duration-200"
            />
          </Link>

          {/* Search Icon with Dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="hidden md:flex h-9 w-9 hover:bg-muted/50"
              >
                <Search className="h-5 w-5" />
                <span className="sr-only">{t.nav.search}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-[400px] p-3 bg-popover border border-border shadow-xl" 
              align="center"
              sideOffset={8}
            >
              <SmartSearch placeholder={t.nav.search} className="w-full" />
            </PopoverContent>
          </Popover>

          {/* Desktop Nav with Grouped Menus */}
          <nav className="hidden lg:flex items-center gap-1">
            {/* Trading Dropdown - First position */}
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-sm font-semibold text-foreground bg-transparent hover:bg-muted/50 hover:text-primary data-[state=open]:bg-muted/50 data-[state=open]:text-primary h-9 px-3">
                    <TrendingUp className="w-4 h-4 mr-1.5" />
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
                          <Link to="/cardswap" className="flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/80 transition-colors group">
                            <div className="w-8 h-8 rounded-md bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                              <ArrowLeftRight className="w-3.5 h-3.5 text-blue-500" />
                            </div>
                            <div>
                              <div className="font-medium text-xs">Cardswap</div>
                              <div className="text-[10px] text-muted-foreground">Trade cards directly</div>
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
                          <Link to="/boom-packs" className="flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/80 transition-colors group">
                            <div className="w-8 h-8 rounded-md bg-rose-500/10 flex items-center justify-center group-hover:bg-rose-500/20 transition-colors">
                              <Package className="w-3.5 h-3.5 text-rose-500" />
                            </div>
                            <div>
                              <div className="font-medium text-xs">Boom Packs</div>
                              <div className="text-[10px] text-muted-foreground">Open sealed packs</div>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      {/* Fractional feature temporarily disabled */}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            {/* Explore Dropdown (was Community) */}
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-sm font-semibold text-foreground bg-transparent hover:bg-muted/50 hover:text-primary data-[state=open]:bg-muted/50 data-[state=open]:text-primary h-9 px-3">
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    Explore
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
                              <div className="font-medium text-xs">{t.nav.circle}</div>
                              <div className="text-[10px] text-muted-foreground">{t.nav.circleDesc}</div>
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
                              <div className="font-medium text-xs">{t.nav.leaderboard}</div>
                              <div className="text-[10px] text-muted-foreground">{t.nav.leaderboardDesc}</div>
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
                              <div className="font-medium text-xs">{t.nav.hallOfFame}</div>
                              <div className="text-[10px] text-muted-foreground">{t.nav.hallOfFameDesc}</div>
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
                              <div className="font-medium text-xs">{t.nav.achievements}</div>
                              <div className="text-[10px] text-muted-foreground">{t.nav.achievementsDesc}</div>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link to="/card-wars" className="flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/80 transition-colors group">
                            <div className="w-8 h-8 rounded-md bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                              <Swords className="w-3.5 h-3.5 text-red-500" />
                            </div>
                            <div>
                              <div className="font-medium text-xs">{t.nav.cardWars}</div>
                              <div className="text-[10px] text-muted-foreground">Vote & win prizes</div>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link to="/news" className="flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/80 transition-colors group">
                            <div className="w-8 h-8 rounded-md bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                            </div>
                            <div>
                              <div className="font-medium text-xs">{t.nav.news}</div>
                              <div className="text-[10px] text-muted-foreground">{t.nav.newsDesc}</div>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link to="/creators" className="flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/80 transition-colors group">
                            <div className="w-8 h-8 rounded-md bg-pink-500/10 flex items-center justify-center group-hover:bg-pink/20 transition-colors">
                              <Mic className="w-3.5 h-3.5 text-pink-500" />
                            </div>
                            <div>
                              <div className="font-medium text-xs">{t.nav.creatorsAmbassadors}</div>
                              <div className="text-[10px] text-muted-foreground">{t.nav.creatorsAmbassadorsDesc}</div>
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
              className="text-foreground hover:text-primary hover:bg-muted/50 transition-all text-sm font-semibold px-3 py-2 rounded-md flex items-center gap-1.5"
            >
              <Award className="w-4 h-4" />
              {t.nav.grading}
            </Link>
            
            
            <Link 
              to="/gaming" 
              className="text-foreground hover:text-primary hover:bg-muted/50 transition-all text-sm font-semibold px-3 py-2 rounded-md flex items-center gap-1.5"
            >
              <Gamepad2 className="w-4 h-4" />
              {t.nav.gaming}
            </Link>
            
            <Link 
              to="/vault" 
              className="text-foreground hover:text-primary hover:bg-muted/50 transition-all text-sm font-semibold px-3 py-2 rounded-md flex items-center gap-1.5"
            >
              <Vault className="w-4 h-4" />
              {t.nav.myVault}
            </Link>
          </nav>
          
          {/* Spacer to push Sell button right */}
          <div className="hidden lg:block flex-1" />
          
          {/* Sell Button */}
          <Button 
            size="sm"
            onClick={() => navigate('/sell')}
            className="hidden lg:flex gap-1.5 bg-primary hover:bg-primary/90 shadow-md text-sm font-semibold ml-4"
          >
            <span className="font-bold">+</span>
            {t.nav.sell}
          </Button>

          <div className="flex items-center gap-0.5">
            <CurrencyToggle />
            <ThemeToggle />
            <LanguageSelector />
            {user && (
              <div className="hidden sm:flex items-center gap-1">
                <CardboomPointsBadge />
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
                  <DropdownMenuItem onClick={() => navigate('/pass')} className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 hover:from-amber-500/20 hover:via-orange-500/20 hover:to-rose-500/20 border border-amber-500/20 rounded-md my-1">
                    <Flame className="w-4 h-4 mr-2 text-amber-500" />
                    <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent font-semibold">CardBoom Pass</span>
                  </DropdownMenuItem>
                  {!isEnterprise && (
                    <DropdownMenuItem onClick={() => navigate('/pricing')} className="text-primary">
                      {isPro ? (
                        <>
                          <Rocket className="w-4 h-4 mr-2" />
                          Upgrade to Enterprise
                        </>
                      ) : (
                        <>
                          <Crown className="w-4 h-4 mr-2" />
                          {t.nav.upgradePro}
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate('/messages')} className="relative">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    {t.nav.messages}
                    {unreadMessages > 0 && (
                      <span className="ml-auto bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                        {unreadMessages > 99 ? '99+' : unreadMessages}
                      </span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/portfolio')}>
                    <PieChart className="w-4 h-4 mr-2" />
                    {t.nav.portfolio}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/trades')}>
                    <ArrowLeftRight className="w-4 h-4 mr-2" />
                    {t.nav.tradesOffers}
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
                  <DropdownMenuItem onClick={() => navigate('/purchases')}>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {t.nav.myPurchases || 'My Purchases'}
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
                onClick={() => navigate('/auth')}
                className="hidden sm:flex gap-2 bg-gradient-to-r from-primary via-primary to-primary/90 hover:from-primary/90 hover:via-primary hover:to-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 border-0 px-5"
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
                  to="/card-wars" 
                  className="flex items-center gap-3 py-3 px-3 rounded-xl text-foreground hover:bg-muted transition-colors" 
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Swords className="w-5 h-5 text-orange-500" />
                  <span className="font-medium">{t.nav.cardWars}</span>
                  <Badge variant="outline" className="ml-auto border-orange-500/30 text-orange-500 text-[10px] py-0">
                    <Flame className="w-2.5 h-2.5 mr-0.5 animate-pulse" />
                    LIVE
                  </Badge>
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
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t.nav.trading}</span>
                </div>
                
                <Link to="/markets" className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span>{t.nav.markets}</span>
                </Link>
                <Link to="/cardswap" className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <ArrowLeftRight className="w-5 h-5 text-blue-500" />
                  <span>Cardswap</span>
                </Link>
                <Link to="/deals" className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span>{t.nav.deals}</span>
                </Link>
                <Link to="/trades" className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <ArrowLeftRight className="w-5 h-5 text-purple-500" />
                  <span>{t.nav.tradesOffers}</span>
                </Link>
                <Link to="/boom-packs" className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <Package className="w-5 h-5 text-rose-500" />
                  <span>Boom Packs</span>
                </Link>
                {/* Fractional feature temporarily disabled */}
                
                {/* Services */}
                <div className="py-2 px-3 mt-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t.nav.services}</span>
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
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t.nav.community}</span>
                </div>
                
                <Link to="/circle" className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <MessageCircle className="w-5 h-5 text-blue-500" />
                  <span>{t.nav.circle}</span>
                </Link>
                <Link to="/leaderboard" className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <span>{t.nav.leaderboard}</span>
                </Link>
                <Link to="/achievements" className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <Medal className="w-5 h-5 text-yellow-500" />
                  <span>{t.nav.achievements}</span>
                </Link>
                <Link to="/creators" className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <Mic className="w-5 h-5 text-pink-500" />
                  <span>{t.nav.creatorsAmbassadors}</span>
                </Link>
                
                {/* Account */}
                <div className="py-2 px-3 mt-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t.nav.account}</span>
                </div>
                
                <Link to="/sell" className="flex items-center gap-3 py-3 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="text-primary font-semibold">{t.nav.sell}</span>
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
                      <span>{t.nav.myVault}</span>
                    </Link>
                    <Link to="/messages" className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(false)}>
                      <MessageCircle className="w-5 h-5 text-muted-foreground" />
                      <span>{t.nav.messages}</span>
                      {unreadMessages > 0 && (
                        <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                          {unreadMessages > 99 ? '99+' : unreadMessages}
                        </span>
                      )}
                    </Link>
                    <Link to="/purchases" className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(false)}>
                      <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                      <span>{t.nav.myPurchases || 'My Purchases'}</span>
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
                        {t.nav.viewProfile}
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
