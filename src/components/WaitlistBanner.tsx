import { useState } from "react";
import { X, Sparkles, TrendingUp, Users, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface WaitlistBannerProps {
  onDismiss: () => void;
}

export const WaitlistBanner = ({ onDismiss }: WaitlistBannerProps) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState<"buyer" | "seller" | "both">("both");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: t.waitlist.toast.emailRequired,
        description: t.waitlist.toast.emailRequiredDesc,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("waitlist")
        .insert({ email: email.trim().toLowerCase(), interest });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: t.waitlist.toast.alreadyJoined,
            description: t.waitlist.toast.alreadyJoinedDesc,
          });
          setIsSubmitted(true);
        } else {
          throw error;
        }
      } else {
        setIsSubmitted(true);
        toast({
          title: t.waitlist.toast.welcome,
          description: t.waitlist.toast.welcomeDesc,
        });
      }
    } catch (error) {
      console.error("Waitlist error:", error);
      toast({
        title: t.waitlist.toast.error,
        description: t.waitlist.toast.errorDesc,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
        <div className="relative w-full max-w-sm p-5 sm:p-6 rounded-xl sm:rounded-2xl bg-card border border-border shadow-2xl text-center my-auto">
          <button
            onClick={onDismiss}
            className="absolute top-2 right-2 sm:top-3 sm:right-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          
          <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 sm:mb-4 rounded-full bg-gain/20 flex items-center justify-center">
            <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-gain" />
          </div>
          
          <h2 className="text-lg sm:text-xl font-display font-bold text-foreground mb-1.5">
            {t.waitlist.success.title}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">
            {t.waitlist.success.description}
          </p>
          
          <Button onClick={onDismiss} className="w-full h-10 text-sm">
            {t.waitlist.success.explore}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-background/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-md sm:max-w-lg p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-card border border-border shadow-2xl mt-12 sm:mt-0 sm:my-auto">
        {/* Skip button - prominent on mobile */}
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 sm:top-3 sm:right-3 flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="hidden sm:inline">{t.waitlist.form.skip}</span>
          <span className="sm:hidden">Skip</span>
          <X className="h-4 w-4" />
        </button>

        <div className="text-center mb-4 sm:mb-6 mt-6 sm:mt-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-2 sm:mb-3">
            <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
            {t.waitlist.badge}
          </div>
          <h2 className="text-lg sm:text-2xl font-display font-bold text-foreground mb-1.5 sm:mb-2">
            {t.waitlist.title}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
            {t.waitlist.description}
          </p>
        </div>

        {/* Features - horizontal on mobile */}
        <div className="flex flex-wrap justify-center gap-2 sm:grid sm:grid-cols-3 sm:gap-3 mb-4 sm:mb-6">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 text-xs sm:text-sm">
            <TrendingUp className="h-3.5 w-3.5 text-gain" />
            <span className="font-medium">{t.waitlist.features.pricing}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 text-xs sm:text-sm">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">{t.waitlist.features.secure}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 text-xs sm:text-sm">
            <Users className="h-3.5 w-3.5 text-gold" />
            <span className="font-medium">{t.waitlist.features.verified}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <Label htmlFor="email" className="text-foreground text-xs sm:text-sm">{t.waitlist.form.email}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t.waitlist.form.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-10 text-sm"
              required
            />
          </div>

          <div>
            <Label className="text-foreground mb-2 block text-xs sm:text-sm">{t.waitlist.form.interest}</Label>
            <RadioGroup
              value={interest}
              onValueChange={(value) => setInterest(value as typeof interest)}
              className="flex flex-wrap gap-3 sm:gap-4"
            >
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="buyer" id="buyer" className="h-4 w-4" />
                <Label htmlFor="buyer" className="cursor-pointer text-xs sm:text-sm">{t.waitlist.form.buying}</Label>
              </div>
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="seller" id="seller" className="h-4 w-4" />
                <Label htmlFor="seller" className="cursor-pointer text-xs sm:text-sm">{t.waitlist.form.selling}</Label>
              </div>
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="both" id="both" className="h-4 w-4" />
                <Label htmlFor="both" className="cursor-pointer text-xs sm:text-sm">{t.waitlist.form.both}</Label>
              </div>
            </RadioGroup>
          </div>

          <Button type="submit" className="w-full h-10 text-sm" disabled={isSubmitting}>
            {isSubmitting ? t.waitlist.form.submitting : t.waitlist.form.submit}
          </Button>

          <p className="text-center text-[10px] sm:text-xs text-muted-foreground">
            {t.waitlist.form.disclaimer}
          </p>
        </form>
      </div>
    </div>
  );
};
