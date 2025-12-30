import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Mail, Bell, TrendingUp, ShoppingBag, Calendar, Megaphone } from "lucide-react";

interface EmailPreference {
  id: string;
  user_id: string;
  welcome_emails: boolean;
  price_alerts: boolean;
  sold_notifications: boolean;
  weekly_digest: boolean;
  marketing_emails: boolean;
  order_updates: boolean;
}

const preferenceOptions = [
  {
    key: 'price_alerts',
    label: 'Price Alerts',
    description: 'Get notified when items on your watchlist change price',
    icon: TrendingUp,
  },
  {
    key: 'sold_notifications',
    label: 'Sold Notifications',
    description: 'Get notified when your items are sold',
    icon: ShoppingBag,
  },
  {
    key: 'order_updates',
    label: 'Order Updates',
    description: 'Receive updates about your orders and purchases',
    icon: Bell,
  },
  {
    key: 'weekly_digest',
    label: 'Weekly Digest',
    description: 'Receive a weekly summary of market trends',
    icon: Calendar,
  },
  {
    key: 'marketing_emails',
    label: 'Marketing & Promotions',
    description: 'Receive promotional offers and announcements',
    icon: Megaphone,
  },
];

export function EmailPreferences() {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['email-preferences', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('email_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      
      // Create default preferences if none exist
      if (!data) {
        const { data: newPrefs, error: insertError } = await supabase
          .from('email_preferences')
          .insert({
            user_id: userId,
            welcome_emails: true,
            price_alerts: true,
            sold_notifications: true,
            weekly_digest: true,
            marketing_emails: true,
            order_updates: true,
          })
          .select()
          .single();
        
        if (insertError) throw insertError;
        return newPrefs;
      }
      
      return data;
    },
    enabled: !!userId,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      if (!userId) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from('email_preferences')
        .update({ [key]: value })
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-preferences', userId] });
      toast.success("Preferences updated");
    },
    onError: (error: any) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  if (!userId) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">Please sign in to manage email preferences</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">Loading preferences...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Preferences
        </CardTitle>
        <CardDescription>
          Manage what emails you receive from CardBoom
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {preferenceOptions.map((option) => {
          const Icon = option.icon;
          const isEnabled = preferences?.[option.key as keyof EmailPreference] ?? true;
          
          return (
            <div
              key={option.key}
              className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-background/50"
            >
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">{option.label}</p>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </div>
              <Switch
                checked={isEnabled as boolean}
                onCheckedChange={(checked) => {
                  updateMutation.mutate({ key: option.key, value: checked });
                }}
                disabled={updateMutation.isPending}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
