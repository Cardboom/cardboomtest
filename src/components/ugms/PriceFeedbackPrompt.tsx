import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Minus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface PriceFeedbackPromptProps {
  marketItemId: string;
  listingId?: string;
  currentPrice: number;
  onClose?: () => void;
  type: 'price_fair' | 'would_buy';
}

export function PriceFeedbackPrompt({
  marketItemId,
  listingId,
  currentPrice,
  onClose,
  type
}: PriceFeedbackPromptProps) {
  const [submitted, setSubmitted] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const handleSubmit = async (value: string) => {
    setSelected(value);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('user_market_signals')
        .insert({
          user_id: user?.id || null,
          market_item_id: marketItemId,
          listing_id: listingId,
          signal_type: type,
          signal_value: value,
          price_at_signal: currentPrice
        });

      setSubmitted(true);
      setTimeout(() => {
        onClose?.();
      }, 1500);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  if (submitted) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-center gap-2 py-2 text-sm text-green-500"
      >
        <ThumbsUp className="h-4 w-4" />
        Thanks for your feedback!
      </motion.div>
    );
  }

  const options = type === 'price_fair' 
    ? [
        { value: 'high', label: 'High', icon: ThumbsDown, color: 'text-red-500 hover:bg-red-500/10' },
        { value: 'fair', label: 'Fair', icon: Minus, color: 'text-yellow-500 hover:bg-yellow-500/10' },
        { value: 'low', label: 'Low', icon: ThumbsUp, color: 'text-green-500 hover:bg-green-500/10' }
      ]
    : [
        { value: 'yes', label: 'Yes', icon: ThumbsUp, color: 'text-green-500 hover:bg-green-500/10' },
        { value: 'maybe', label: 'Maybe', icon: Minus, color: 'text-yellow-500 hover:bg-yellow-500/10' },
        { value: 'no', label: 'No', icon: ThumbsDown, color: 'text-red-500 hover:bg-red-500/10' }
      ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-muted/50 rounded-lg p-3 border border-border"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">
          {type === 'price_fair' ? 'Was this price fair?' : 'Would you buy at this price?'}
        </p>
        {onClose && (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        {options.map((option) => (
          <Button
            key={option.value}
            variant="ghost"
            size="sm"
            onClick={() => handleSubmit(option.value)}
            className={cn(
              "flex-1 gap-1",
              option.color,
              selected === option.value && "ring-2 ring-primary"
            )}
          >
            <option.icon className="h-4 w-4" />
            {option.label}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Your feedback helps improve pricing accuracy
      </p>
    </motion.div>
  );
}
