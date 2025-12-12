import { useState } from "react";
import { X, Sparkles, TrendingUp, Users, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface WaitlistBannerProps {
  onDismiss: () => void;
}

export const WaitlistBanner = ({ onDismiss }: WaitlistBannerProps) => {
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState<"buyer" | "seller" | "both">("both");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
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
            title: "Already on the list!",
            description: "You're already signed up for early access.",
          });
          setIsSubmitted(true);
        } else {
          throw error;
        }
      } else {
        setIsSubmitted(true);
        toast({
          title: "Welcome to Cardboom!",
          description: "You're on the list. We'll notify you when we launch.",
        });
      }
    } catch (error) {
      console.error("Waitlist error:", error);
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
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
            You're In!
          </h2>
          <p className="text-muted-foreground mb-6">
            We'll email you when Cardboom launches. In the meantime, feel free to explore the preview.
          </p>
          
          <Button onClick={onDismiss} className="w-full">
            Explore Preview
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
            Coming Soon
          </div>
          <h2 className="text-3xl font-display font-bold text-foreground mb-2">
            Get Early Access to Cardboom
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            The premier marketplace for trading cards and collectibles. Join the waitlist for exclusive early access.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center p-4 rounded-xl bg-muted/50">
            <TrendingUp className="h-6 w-6 text-gain mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">Real-time Pricing</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-muted/50">
            <Shield className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">Secure Transactions</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-muted/50">
            <Users className="h-6 w-6 text-gold mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">Verified Traders</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="email" className="text-foreground">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5"
              required
            />
          </div>

          <div>
            <Label className="text-foreground mb-3 block">I'm interested in</Label>
            <RadioGroup
              value={interest}
              onValueChange={(value) => setInterest(value as typeof interest)}
              className="flex flex-wrap gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="buyer" id="buyer" />
                <Label htmlFor="buyer" className="cursor-pointer">Buying</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="seller" id="seller" />
                <Label htmlFor="seller" className="cursor-pointer">Selling</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="both" id="both" />
                <Label htmlFor="both" className="cursor-pointer">Both</Label>
              </div>
            </RadioGroup>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Joining..." : "Join the Waitlist"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            By joining, you agree to receive updates about Cardboom. No spam, ever.
          </p>
        </form>

        <button
          onClick={onDismiss}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip and preview the marketplace →
        </button>
      </div>
    </div>
  );
};
