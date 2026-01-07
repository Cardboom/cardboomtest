import { AlertCircle, ArrowLeftRight } from 'lucide-react';
import { motion } from 'framer-motion';

export const ArbitrageView = () => {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">0</p>
              <p className="text-sm text-muted-foreground">Arbitrage Opportunities</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Info Banner */}
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 flex flex-col items-center gap-4 text-center">
        <AlertCircle className="w-12 h-12 text-primary" />
        <div>
          <p className="text-foreground font-semibold text-lg mb-2">Arbitrage Coming Soon</p>
          <p className="text-muted-foreground">
            Arbitrage opportunities will be available once you have active listings. 
            Compare your CardBoom listings against market data to find pricing opportunities.
          </p>
        </div>
      </div>
    </div>
  );
};
