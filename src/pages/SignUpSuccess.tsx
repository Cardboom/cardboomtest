import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CheckCircle, Sparkles, ArrowRight, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

const SignUpSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Fire Google Ads conversion event on page load
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'conversion', {
        'send_to': 'AW-17885952633/7FbfCL-2pugbEPn019BC'
      });
      console.log('[Conversion] Sign-up conversion fired');
    }

    // Also fire to dataLayer for GTM
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push({
        event: 'sign_up_complete',
        conversion_type: 'new_user'
      });
    }
  }, []);

  // Check if user is actually logged in, otherwise redirect to auth
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // No session, this might be a direct visit - still show page but check
        console.log('[SignUpSuccess] No active session');
      }
    };
    checkSession();
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Helmet>
        <title>Welcome to CardBoom! | Sign Up Complete</title>
        <meta name="robots" content="noindex, nofollow" />
        {/* Google Ads conversion event snippet - fires on page load */}
        <script>
          {`
            gtag('event', 'conversion', {'send_to': 'AW-17885952633/7FbfCL-2pugbEPn019BC'});
          `}
        </script>
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <Card className="glass border-primary/30 overflow-hidden">
          {/* Success animation header */}
          <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8 text-center relative">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle className="w-12 h-12 text-primary" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Welcome to CardBoom! 🎉
              </h1>
              <p className="text-muted-foreground">
                Your account has been created successfully
              </p>
            </motion.div>
            
            {/* Decorative sparkles */}
            <Sparkles className="absolute top-4 right-4 w-6 h-6 text-primary/50 animate-pulse" />
            <Sparkles className="absolute bottom-4 left-4 w-4 h-4 text-primary/30 animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Free grading credit section */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg p-4 border border-yellow-500/30"
            >
              <div className="flex items-start gap-3">
                <Sparkles className="w-6 h-6 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">🎉 Free AI Grading Credit</p>
                  <p className="text-sm text-muted-foreground">
                    Complete your profile with phone & ID verification to unlock your <strong>free AI grading</strong>! 
                    Grade any card with CBGI absolutely free.
                  </p>
                  <Link 
                    to="/settings" 
                    className="text-xs text-yellow-600 hover:text-yellow-500 font-medium mt-2 inline-flex items-center gap-1"
                  >
                    Complete verification <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* Welcome bonus section */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-r from-primary/10 to-transparent rounded-lg p-4 border border-primary/20"
            >
              <div className="flex items-start gap-3">
                <Gift className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">Welcome Bonus</p>
                  <p className="text-sm text-muted-foreground">
                    You've earned 100 bonus gems to get started! Explore the marketplace and start building your collection.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* What's next section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="space-y-3"
            >
              <h3 className="font-medium text-foreground">What's Next?</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Browse thousands of trading cards and collectibles
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Get AI-powered card grading with CBGI
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Track your portfolio value in real-time
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Buy and sell with secure escrow protection
                </li>
              </ul>
            </motion.div>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="space-y-3 pt-2"
            >
              <Button asChild className="w-full" size="lg">
                <Link to="/explorer">
                  Start Exploring
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/grading">
                  Try AI Grading
                </Link>
              </Button>
            </motion.div>
          </CardContent>
        </Card>

        {/* Footer link */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center text-sm text-muted-foreground mt-6"
        >
          Need help getting started?{' '}
          <Link to="/help" className="text-primary hover:underline">
            Visit our Help Center
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
};

export default SignUpSuccess;
