import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Wallet, ShoppingCart, Menu, X, Bell } from 'lucide-react';

interface HeaderProps {
  cartCount: number;
  onCartClick: () => void;
}

export const Header = ({ cartCount, onCartClick }: HeaderProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-lg">V</span>
            </div>
            <span className="font-display text-xl font-bold text-foreground hidden sm:block">
              VAULT<span className="text-primary">X</span>
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

            <Button variant="default" className="hidden sm:flex gap-2">
              <Wallet className="w-4 h-4" />
              Connect
            </Button>

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
              <Button variant="default" className="mt-2">
                <Wallet className="w-4 h-4 mr-2" />
                Connect Wallet
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
