import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ShoppingCart, Menu, X, Bell, User, LogOut } from 'lucide-react';
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

interface HeaderProps {
  cartCount: number;
  onCartClick: () => void;
}

export const Header = ({ cartCount, onCartClick }: HeaderProps) => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Error signing out');
    } else {
      toast.success('Signed out successfully');
    }
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-lg">C</span>
            </div>
            <span className="font-display text-xl font-bold text-foreground hidden sm:block">
              CARD<span className="text-primary">BOOM</span>
            </span>
          </div>

          {/* Search Bar */}
          <div className={`hidden md:flex items-center flex-1 max-w-xl mx-8 relative transition-all duration-300 ${searchFocused ? 'scale-105' : ''}`}>
            <Search className="absolute left-3 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search cards, figures, TCG..."
              className="pl-10 bg-secondary border-border/50 focus:border-primary/50 focus:ring-primary/20 rounded-full"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6">
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              Explore
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              Sell
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              Portfolio
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="hidden sm:flex relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </Button>
            
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
                    <User className="w-4 h-4" />
                    {user.email?.split('@')[0]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate('/')}>
                    <User className="w-4 h-4 mr-2" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-500">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
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
                Sign In
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
                placeholder="Search..."
                className="pl-10 bg-secondary border-border/50 rounded-full"
              />
            </div>
            <nav className="flex flex-col gap-3">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors py-2">
                Explore
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors py-2">
                Sell
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors py-2">
                Portfolio
              </a>
              {user ? (
                <>
                  <div className="py-2 text-foreground font-medium">
                    {user.email}
                  </div>
                  <Button variant="destructive" onClick={handleSignOut} className="mt-2">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button variant="default" onClick={() => navigate('/auth')} className="mt-2">
                  <User className="w-4 h-4 mr-2" />
                  Sign In / Register
                </Button>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
