import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, TrendingDown, MessageSquare, Package, UserPlus, Star, Gift, Sparkles, Award, Truck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

const getNotificationIcon = (type: string, data?: Record<string, unknown>) => {
  // Check if this is a grading completion notification
  if (type === 'order_update' && data?.grading_order_id) {
    return <Award className="h-4 w-4 text-amber-500" />;
  }
  
  switch (type) {
    case 'price_alert':
      return <TrendingDown className="h-4 w-4 text-primary" />;
    case 'new_offer':
      return <Package className="h-4 w-4 text-blue-500" />;
    case 'message':
      return <MessageSquare className="h-4 w-4 text-purple-500" />;
    case 'order_update':
      return <Package className="h-4 w-4 text-orange-500" />;
    case 'follower':
      return <UserPlus className="h-4 w-4 text-pink-500" />;
    case 'review':
      return <Star className="h-4 w-4 text-gold" />;
    case 'referral':
      return <Gift className="h-4 w-4 text-primary" />;
    case 'shipping_approval_required':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case 'shipping_approved':
      return <Truck className="h-4 w-4 text-green-500" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

// Helper to check if notification requires action
const isActionRequired = (type: string) => {
  return type === 'shipping_approval_required';
};

export const NotificationCenter = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const { toast } = useToast();
  
  const [canClaimXP, setCanClaimXP] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [xpReward, setXpReward] = useState(0);
  const [isClaiming, setIsClaiming] = useState(false);

  const checkDailyXP = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const { data: todayLogin } = await supabase
      .from('daily_logins')
      .select('*')
      .eq('user_id', user.id)
      .eq('login_date', today)
      .single();

    if (!todayLogin) {
      // Check yesterday's streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const { data: yesterdayLogin } = await supabase
        .from('daily_logins')
        .select('streak_count')
        .eq('user_id', user.id)
        .eq('login_date', yesterdayStr)
        .single();

      const streak = yesterdayLogin ? (yesterdayLogin.streak_count || 0) + 1 : 1;
      const reward = Math.min(10 + (streak - 1) * 5, 100);
      
      setCurrentStreak(streak);
      setXpReward(reward);
      setCanClaimXP(true);
    }
  }, []);

  useEffect(() => {
    checkDailyXP();
  }, [checkDailyXP]);

  const claimDailyXP = async () => {
    setIsClaiming(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      
      // Insert daily login
      await supabase.from('daily_logins').insert({
        user_id: user.id,
        login_date: today,
        streak_count: currentStreak
      });

      // Update profile XP
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp, level')
        .eq('id', user.id)
        .single();

      const newXP = (profile?.xp || 0) + xpReward;
      const newLevel = Math.floor(newXP / 1000) + 1;

      await supabase
        .from('profiles')
        .update({ xp: newXP, level: newLevel })
        .eq('id', user.id);

      toast({
        title: `+${xpReward} XP Claimed!`,
        description: `Day ${currentStreak} streak bonus!`,
      });

      setCanClaimXP(false);
    } catch (error) {
      console.error('Error claiming XP:', error);
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground rounded-sm text-[10px] font-bold flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-auto p-1 text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>

        {/* Daily XP Claim */}
        {canClaimXP && (
          <>
            <DropdownMenuItem 
              onClick={claimDailyXP}
              className="cursor-pointer bg-gradient-to-r from-primary/10 to-amber-500/10 hover:from-primary/20 hover:to-amber-500/20"
              disabled={isClaiming}
            >
              <Sparkles className="h-4 w-4 mr-2 text-amber-500" />
              <div className="flex-1">
                <span className="font-medium">Claim Daily XP</span>
                <span className="text-xs text-muted-foreground ml-2">
                  +{xpReward} XP (Day {currentStreak})
                </span>
              </div>
              <Gift className="h-4 w-4 text-primary animate-pulse" />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => {
              const notificationData = notification.data as Record<string, unknown> | undefined;
              
              const handleNotificationClick = () => {
                markAsRead(notification.id);
                
                // Navigate based on notification type and data
                // For sale/order notifications, prioritize order_id over listing_id
                const notificationType = notification.type;
                const isOrderNotification = notificationType === 'sale' || 
                  notificationType === 'vault_shipping_required' || 
                  notificationType === 'order_update' ||
                  notificationType === 'order_confirmed';
                const isShippingNotification = notificationType === 'shipping_approval_required' ||
                  notificationType === 'shipping_approved';
                const isOfferAccepted = notificationType === 'offer_accepted';
                
                if (notificationData?.grading_order_id) {
                  navigate(`/grading/order/${notificationData.grading_order_id}`);
                } else if ((isOrderNotification || isShippingNotification) && notificationData?.order_id) {
                  // Order-related notifications should go to order page
                  navigate(`/order/${notificationData.order_id}`);
                } else if (notificationData?.order_id) {
                  navigate(`/order/${notificationData.order_id}`);
                } else if (isOfferAccepted && notificationData?.listing_id) {
                  // Offer accepted - take buyer to listing with checkout param
                  navigate(`/listing/${notificationData.listing_id}?checkout=true`);
                } else if (notificationData?.listing_id) {
                  navigate(`/listing/${notificationData.listing_id}`);
                }
              };
              
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex items-start gap-3 p-3 cursor-pointer ${
                    !notification.is_read ? 'bg-accent/50' : ''
                  } ${isActionRequired(notification.type) ? 'border-l-2 border-l-yellow-500' : ''}`}
                  onClick={handleNotificationClick}
                >
                  <div className="mt-0.5">
                    {getNotificationIcon(notification.type, notificationData)}
                  </div>
                  <div className="flex-1 min-w-0">
                    {isActionRequired(notification.type) && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 mb-1 text-yellow-600 border-yellow-500">
                        Action Required
                      </Badge>
                    )}
                    <p className="font-medium text-sm truncate">
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.body}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="w-2 h-2 bg-primary rounded-full mt-1" />
                  )}
                </DropdownMenuItem>
              );
            })
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
