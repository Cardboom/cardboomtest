import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Clock, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';

interface ExitIntentPopupProps {
  discountPercent?: number;
  expiryMinutes?: number;
}

export const ExitIntentPopup = ({ 
  discountPercent = 50,
  expiryMinutes = 30 
}: ExitIntentPopupProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const [timeLeft, setTimeLeft] = useState(expiryMinutes * 60);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user is logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!isVisible || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Exit intent detection
  const handleMouseLeave = useCallback((e: MouseEvent) => {
    // Only trigger when mouse leaves to top of viewport
    if (e.clientY <= 5 && !hasShown && !user) {
      // Check if already shown in this session
      const alreadyShown = sessionStorage.getItem('exitIntentShown');
      if (!alreadyShown) {
        setIsVisible(true);
        setHasShown(true);
        sessionStorage.setItem('exitIntentShown', 'true');
      }
    }
  }, [hasShown, user]);

  useEffect(() => {
    // Don't show on certain pages
    const excludedPaths = ['/auth', '/admin', '/checkout'];
    if (excludedPaths.some(path => location.pathname.startsWith(path))) {
      return;
    }

    document.addEventListener('mouseout', handleMouseLeave);
    return () => document.removeEventListener('mouseout', handleMouseLeave);
  }, [handleMouseLeave, location.pathname]);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    
    setIsSubmitting(true);
    try {
      // Store email in abandoned_carts for follow-up
      const { error } = await supabase
        .from('abandoned_carts')
        .insert({
          email: email.toLowerCase(),
          status: 'exit_intent_capture',
          cart_data: { discount_percent: discountPercent, source: 'exit_intent' }
        });

      if (!error) {
        setIsVisible(false);
        navigate('/auth?discount=true');
      }
    } catch (err) {
      console.error('Error saving discount:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  // Don't show for logged in users
  if (user) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100]"
            onClick={handleClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[101] max-w-md w-full"
          >
            <div className="relative bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header with gradient */}
              <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 pb-4">
                <Badge className="mb-3 bg-loss/20 text-loss border-loss/30">
                  <Clock className="w-3 h-3 mr-1" />
                  Expires in {formatTime(timeLeft)}
                </Badge>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Gift className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-bold text-foreground">
                      Wait! Don't Miss This
                    </h2>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 pt-4 space-y-4">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gain/10 border border-gain/30">
                    <Sparkles className="w-4 h-4 text-gain" />
                    <span className="text-2xl font-display font-bold text-gain">
                      {discountPercent}% OFF
                    </span>
                    <span className="text-sm text-gain/80">Commission</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your first sale on CardBoom with reduced fees!
                  </p>
                </div>

                {/* Email input */}
                <div className="space-y-3">
                  <Input
                    type="email"
                    placeholder="Enter your email..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-center"
                  />
                  <Button 
                    className="w-full gap-2" 
                    size="lg"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !email.trim()}
                  >
                    {isSubmitting ? 'Claiming...' : 'Claim My Discount'}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  No spam. Unsubscribe anytime. By signing up you agree to our terms.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
