import { TrendingUp, TrendingDown, Eye, DollarSign, BarChart3, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export const MarketExplorerStats = () => {
  // These would come from real data in production
  const stats = [
    { 
      label: 'Total Market Cap', 
      value: '$2.4B', 
      change: '+3.2%', 
      isPositive: true,
      icon: DollarSign 
    },
    { 
      label: '24h Volume', 
      value: '$12.8M', 
      change: '+8.5%', 
      isPositive: true,
      icon: BarChart3 
    },
    { 
      label: 'Active Listings', 
      value: '2.1M', 
      change: '+1,234', 
      isPositive: true,
      icon: TrendingUp 
    },
    { 
      label: 'Traders Online', 
      value: '12.4K', 
      change: null,
      isPositive: true,
      icon: Users 
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="glass rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <stat.icon className="w-4 h-4 text-primary" />
            </div>
            <span className="text-muted-foreground text-sm">{stat.label}</span>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold font-display text-foreground">{stat.value}</span>
            {stat.change && (
              <span className={`text-sm font-medium flex items-center gap-1 ${stat.isPositive ? 'text-gain' : 'text-loss'}`}>
                {stat.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {stat.change}
              </span>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};