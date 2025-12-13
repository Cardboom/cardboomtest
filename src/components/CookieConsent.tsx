import { useState, useEffect, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Cookie, Shield, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const COOKIE_CONSENT_KEY = 'cardboom_cookie_consent';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

export const CookieConsent = forwardRef<HTMLDivElement>((_, ref) => {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always required
    analytics: false,
    marketing: false,
    functional: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Delay showing banner for better UX
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true,
    };
    saveConsent(allAccepted);
  };

  const handleAcceptSelected = () => {
    saveConsent(preferences);
  };

  const handleRejectNonEssential = () => {
    const essentialOnly: CookiePreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false,
    };
    saveConsent(essentialOnly);
  };

  const saveConsent = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      preferences: prefs,
      timestamp: new Date().toISOString(),
      version: '1.0',
    }));
    setShowBanner(false);
    setShowSettings(false);
  };

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6"
      >
        <div className="container mx-auto max-w-5xl">
          <div className="glass rounded-2xl border border-border/50 shadow-2xl overflow-hidden">
            {/* Main Banner */}
            {!showSettings ? (
              <div className="p-6 md:p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Cookie className="w-6 h-6 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-lg font-bold text-foreground mb-2">
                      Cookie Preferences
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      We use cookies to enhance your experience, analyze site traffic, and for marketing purposes. 
                      By clicking "Accept All", you consent to our use of cookies in accordance with 
                      <a href="/privacy" className="text-primary hover:underline mx-1">GDPR</a>
                      and
                      <a href="/privacy" className="text-primary hover:underline mx-1">KVKK</a>
                      regulations. You can customize your preferences or reject non-essential cookies.
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        onClick={handleAcceptAll}
                        className="btn-premium text-primary-foreground"
                      >
                        Accept All
                      </Button>
                      <Button
                        onClick={handleRejectNonEssential}
                        variant="outline"
                        className="border-border/50 hover:bg-secondary"
                      >
                        Essential Only
                      </Button>
                      <Button
                        onClick={() => setShowSettings(true)}
                        variant="ghost"
                        className="text-muted-foreground hover:text-foreground gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Customize
                      </Button>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRejectNonEssential}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            ) : (
              /* Settings Panel */
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 text-primary" />
                    <h3 className="font-display text-lg font-bold text-foreground">
                      Cookie Settings
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSettings(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="space-y-4 mb-6">
                  {/* Necessary Cookies */}
                  <CookieOption
                    title="Necessary Cookies"
                    description="Required for the website to function properly. Cannot be disabled."
                    checked={true}
                    disabled={true}
                    onChange={() => {}}
                  />

                  {/* Analytics Cookies */}
                  <CookieOption
                    title="Analytics Cookies"
                    description="Help us understand how visitors interact with our website."
                    checked={preferences.analytics}
                    onChange={(checked) => setPreferences({ ...preferences, analytics: checked })}
                  />

                  {/* Marketing Cookies */}
                  <CookieOption
                    title="Marketing Cookies"
                    description="Used to track visitors across websites for advertising purposes."
                    checked={preferences.marketing}
                    onChange={(checked) => setPreferences({ ...preferences, marketing: checked })}
                  />

                  {/* Functional Cookies */}
                  <CookieOption
                    title="Functional Cookies"
                    description="Enable enhanced functionality and personalization."
                    checked={preferences.functional}
                    onChange={(checked) => setPreferences({ ...preferences, functional: checked })}
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleAcceptSelected}
                    className="btn-premium text-primary-foreground"
                  >
                    Save Preferences
                  </Button>
                  <Button
                    onClick={handleAcceptAll}
                    variant="outline"
                    className="border-border/50"
                  >
                    Accept All
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground mt-4">
                  Learn more about how we use cookies in our{' '}
                  <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
                  For Turkish residents, this complies with KVKK (Law No. 6698).
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

CookieConsent.displayName = 'CookieConsent';

interface CookieOptionProps {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

const CookieOption = ({ title, description, checked, disabled, onChange }: CookieOptionProps) => (
  <div className={`flex items-start gap-4 p-4 rounded-xl ${disabled ? 'bg-muted/30' : 'bg-secondary/50'} border border-border/30`}>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-foreground text-sm">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </div>
    <label className="relative inline-flex items-center cursor-pointer shrink-0">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className={`
        w-11 h-6 rounded-full peer transition-colors
        ${disabled ? 'bg-primary/50 cursor-not-allowed' : 'bg-border peer-checked:bg-primary'}
        after:content-[''] after:absolute after:top-0.5 after:left-[2px]
        after:bg-white after:rounded-full after:h-5 after:w-5
        after:transition-all peer-checked:after:translate-x-full
      `} />
    </label>
  </div>
);
