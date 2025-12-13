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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="relative w-full max-w-lg p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-2xl text-center my-auto">
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 rounded-full bg-gain/20 flex items-center justify-center">
            <Sparkles className="h-7 w-7 sm:h-8 sm:w-8 text-gain" />
          </div>
          
          <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground mb-2">
            {t.waitlist.success.title}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
            {t.waitlist.success.description}
          </p>
          
          <Button onClick={onDismiss} className="w-full">
            {t.waitlist.success.explore}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl p-5 sm:p-8 rounded-2xl bg-card border border-border shadow-2xl my-auto">
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3 sm:mb-4">
            <Sparkles className="h-4 w-4" />
            {t.waitlist.badge}
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2">
            {t.waitlist.title}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
            {t.waitlist.description}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-0 p-3 sm:p-4 rounded-xl bg-muted/50">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-gain sm:mx-auto sm:mb-2" />
            <p className="text-sm font-medium text-foreground">{t.waitlist.features.pricing}</p>
          </div>
          <div className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-0 p-3 sm:p-4 rounded-xl bg-muted/50">
            <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary sm:mx-auto sm:mb-2" />
            <p className="text-sm font-medium text-foreground">{t.waitlist.features.secure}</p>
          </div>
          <div className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-0 p-3 sm:p-4 rounded-xl bg-muted/50">
            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-gold sm:mx-auto sm:mb-2" />
            <p className="text-sm font-medium text-foreground">{t.waitlist.features.verified}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <Label htmlFor="email" className="text-foreground text-sm sm:text-base">{t.waitlist.form.email}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t.waitlist.form.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 h-11 sm:h-10"
              required
            />
          </div>

          <div>
            <Label className="text-foreground mb-2 sm:mb-3 block text-sm sm:text-base">{t.waitlist.form.interest}</Label>
            <RadioGroup
              value={interest}
              onValueChange={(value) => setInterest(value as typeof interest)}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="buyer" id="buyer" />
                <Label htmlFor="buyer" className="cursor-pointer text-sm sm:text-base">{t.waitlist.form.buying}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="seller" id="seller" />
                <Label htmlFor="seller" className="cursor-pointer text-sm sm:text-base">{t.waitlist.form.selling}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="both" id="both" />
                <Label htmlFor="both" className="cursor-pointer text-sm sm:text-base">{t.waitlist.form.both}</Label>
              </div>
            </RadioGroup>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? t.waitlist.form.submitting : t.waitlist.form.submit}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            {t.waitlist.form.disclaimer}
          </p>
        </form>

        <button
          onClick={onDismiss}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t.waitlist.form.skip}
        </button>
      </div>
    </div>
  );
};
