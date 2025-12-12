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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="relative w-full max-w-lg mx-4 p-8 rounded-2xl bg-card border border-border shadow-2xl text-center">
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gain/20 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-gain" />
          </div>
          
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">
            {t.waitlist.success.title}
          </h2>
          <p className="text-muted-foreground mb-6">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4 p-8 rounded-2xl bg-card border border-border shadow-2xl">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            {t.waitlist.badge}
          </div>
          <h2 className="text-3xl font-display font-bold text-foreground mb-2">
            {t.waitlist.title}
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            {t.waitlist.description}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center p-4 rounded-xl bg-muted/50">
            <TrendingUp className="h-6 w-6 text-gain mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">{t.waitlist.features.pricing}</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-muted/50">
            <Shield className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">{t.waitlist.features.secure}</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-muted/50">
            <Users className="h-6 w-6 text-gold mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">{t.waitlist.features.verified}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="email" className="text-foreground">{t.waitlist.form.email}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t.waitlist.form.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5"
              required
            />
          </div>

          <div>
            <Label className="text-foreground mb-3 block">{t.waitlist.form.interest}</Label>
            <RadioGroup
              value={interest}
              onValueChange={(value) => setInterest(value as typeof interest)}
              className="flex flex-wrap gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="buyer" id="buyer" />
                <Label htmlFor="buyer" className="cursor-pointer">{t.waitlist.form.buying}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="seller" id="seller" />
                <Label htmlFor="seller" className="cursor-pointer">{t.waitlist.form.selling}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="both" id="both" />
                <Label htmlFor="both" className="cursor-pointer">{t.waitlist.form.both}</Label>
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
