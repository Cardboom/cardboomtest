import { X, Trash2, CreditCard, Bitcoin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collectible } from '@/types/collectible';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: Collectible[];
  onRemoveItem: (id: string) => void;
}

export const CartDrawer = ({ isOpen, onClose, items, onRemoveItem }: CartDrawerProps) => {
  const total = items.reduce((sum, item) => sum + item.price, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md h-full glass border-l border-border/50 animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <h2 className="font-display text-xl font-bold">Your Cart</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 h-[calc(100%-200px)]">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-6xl mb-4">🛒</div>
              <p className="text-muted-foreground">Your cart is empty</p>
              <p className="text-sm text-muted-foreground mt-2">
                Start adding some grails!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 glass rounded-xl p-3"
                >
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-secondary/50 shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground text-sm line-clamp-2">
                      {item.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.condition}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-foreground">
                        ${item.price.toLocaleString()}
                      </span>
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="p-1 text-muted-foreground hover:text-loss transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border/50 bg-card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted-foreground">Total</span>
              <span className="text-2xl font-bold font-display text-foreground">
                ${total.toLocaleString()}
              </span>
            </div>
            <div className="space-y-3">
              <Button variant="hero" className="w-full" size="lg">
                <CreditCard className="w-5 h-5" />
                Pay with Card
              </Button>
              <Button variant="gold" className="w-full" size="lg">
                <Bitcoin className="w-5 h-5" />
                Pay with Crypto
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
