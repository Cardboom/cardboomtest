import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  Bell, Target, TrendingUp, TrendingDown, 
  Plus, Trash2, ChevronRight, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import { motion, AnimatePresence } from 'framer-motion';

interface PriceAlert {
  id: string;
  itemName: string;
  targetPrice: number;
  currentPrice: number;
  condition: 'above' | 'below';
  enabled: boolean;
  triggered?: boolean;
}

const MOCK_ALERTS: PriceAlert[] = [
  {
    id: '1',
    itemName: 'Charizard PSA 10',
    targetPrice: 45000,
    currentPrice: 42500,
    condition: 'above',
    enabled: true,
  },
  {
    id: '2',
    itemName: 'LeBron Rookie PSA 10',
    targetPrice: 20000,
    currentPrice: 24500,
    condition: 'below',
    enabled: true,
  },
  {
    id: '3',
    itemName: 'Luka Prizm Silver PSA 10',
    targetPrice: 3000,
    currentPrice: 2850,
    condition: 'below',
    enabled: false,
    triggered: true,
  },
];

export const SmartAlertsPanel = () => {
  const { formatPrice } = useCurrency();
  const [alerts, setAlerts] = useState(MOCK_ALERTS);
  const [showAddForm, setShowAddForm] = useState(false);

  const toggleAlert = (alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, enabled: !a.enabled } : a
    ));
  };

  const deleteAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const getProgress = (alert: PriceAlert) => {
    if (alert.condition === 'above') {
      return Math.min((alert.currentPrice / alert.targetPrice) * 100, 100);
    }
    return Math.min((alert.targetPrice / alert.currentPrice) * 100, 100);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent border-b border-border/50">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bell className="w-4 h-4 text-primary" />
            </div>
            <span>Smart Alerts</span>
            <Badge variant="secondary" className="text-xs">
              {alerts.filter(a => a.enabled).length} active
            </Badge>
          </div>
          <Button size="sm" onClick={() => setShowAddForm(!showAddForm)} className="gap-1">
            <Plus className="w-4 h-4" />
            Add Alert
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {/* Add Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 rounded-xl bg-muted border border-border"
            >
              <div className="space-y-3">
                <Input placeholder="Search items..." />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">Below Price</Button>
                  <Button variant="outline" className="flex-1">Above Price</Button>
                </div>
                <Input type="number" placeholder="Target price" />
                <Button className="w-full" onClick={() => {
                  setShowAddForm(false);
                  // In production, this would save to database
                }}>Create Alert</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Alerts List */}
        {alerts.map((alert, index) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "p-4 rounded-xl border transition-all",
              alert.triggered 
                ? "bg-gold/10 border-gold/30" 
                : alert.enabled 
                  ? "bg-muted/50 border-transparent hover:border-primary/20" 
                  : "bg-muted/30 border-transparent opacity-60"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground truncate">{alert.itemName}</p>
                  {alert.triggered && (
                    <Badge className="gap-1 bg-gold text-background">
                      <AlertTriangle className="w-3 h-3" />
                      Triggered!
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm">
                  <Badge variant="outline" className="gap-1 text-xs">
                    {alert.condition === 'above' ? (
                      <TrendingUp className="w-3 h-3 text-gain" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-loss" />
                    )}
                    {alert.condition === 'above' ? 'Above' : 'Below'} {formatPrice(alert.targetPrice)}
                  </Badge>
                  <span className="text-muted-foreground">
                    Current: {formatPrice(alert.currentPrice)}
                  </span>
                </div>
                
                {/* Progress to target */}
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress to target</span>
                    <span>{getProgress(alert).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all",
                        getProgress(alert) >= 95 ? "bg-gold" : "bg-primary"
                      )}
                      style={{ width: `${getProgress(alert)}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch 
                  checked={alert.enabled}
                  onCheckedChange={() => toggleAlert(alert.id)}
                />
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 text-muted-foreground hover:text-loss"
                  onClick={() => deleteAlert(alert.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}

        {alerts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No price alerts set</p>
            <p className="text-sm">Create alerts to get notified when prices change</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
