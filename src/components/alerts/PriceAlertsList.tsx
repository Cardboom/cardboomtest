import { Bell, BellOff, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { usePriceAlerts, PriceAlert } from '@/hooks/usePriceAlerts';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export const PriceAlertsList = () => {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const { alerts, isLoading, deleteAlert, toggleAlert } = usePriceAlerts();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse p-4 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8">
        <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-semibold text-lg mb-1">No Price Alerts</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Set alerts on items you're watching to get notified when prices change
        </p>
        <Button onClick={() => navigate('/markets')}>
          Browse Items
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          formatPrice={formatPrice}
          onToggle={(active) => toggleAlert(alert.id, active)}
          onDelete={() => deleteAlert(alert.id)}
          onClick={() => alert.market_item && navigate(`/item/${alert.market_item.id}`)}
        />
      ))}
    </div>
  );
};

interface AlertCardProps {
  alert: PriceAlert;
  formatPrice: (price: number) => string;
  onToggle: (active: boolean) => void;
  onDelete: () => void;
  onClick: () => void;
}

const AlertCard = ({ alert, formatPrice, onToggle, onDelete, onClick }: AlertCardProps) => {
  const item = alert.market_item;
  if (!item) return null;

  const currentPrice = item.current_price;
  const targetPrice = alert.target_price;
  const priceDiff = ((targetPrice - currentPrice) / currentPrice) * 100;
  const isTriggered = alert.is_triggered;
  const willTriggerSoon = alert.alert_type === 'below' 
    ? currentPrice <= targetPrice * 1.05 
    : currentPrice >= targetPrice * 0.95;

  return (
    <div 
      className={cn(
        "p-4 rounded-lg border transition-all cursor-pointer hover:bg-secondary/30",
        isTriggered && "border-primary bg-primary/5",
        !alert.is_active && "opacity-60",
        willTriggerSoon && !isTriggered && "border-amber-500/50 bg-amber-500/5"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {/* Image */}
        {item.image_url ? (
          <img 
            src={item.image_url} 
            alt="" 
            className="w-12 h-12 rounded object-cover bg-secondary"
          />
        ) : (
          <div className="w-12 h-12 rounded bg-secondary flex items-center justify-center">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{item.name}</h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Current: {formatPrice(currentPrice)}</span>
            <span>•</span>
            <span className={cn(
              "flex items-center gap-1",
              alert.alert_type === 'below' ? 'text-gain' : 'text-loss'
            )}>
              {alert.alert_type === 'below' ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <TrendingUp className="w-3 h-3" />
              )}
              Target: {formatPrice(targetPrice)}
            </span>
          </div>
          
          {/* Status */}
          {isTriggered ? (
            <span className="text-xs text-primary font-medium">
              ✓ Triggered!
            </span>
          ) : willTriggerSoon ? (
            <span className="text-xs text-amber-500 font-medium">
              Almost there ({priceDiff > 0 ? '+' : ''}{priceDiff.toFixed(1)}%)
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              {priceDiff > 0 ? '+' : ''}{priceDiff.toFixed(1)}% to go
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={alert.is_active}
            onCheckedChange={onToggle}
            className="data-[state=checked]:bg-primary"
          />
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
