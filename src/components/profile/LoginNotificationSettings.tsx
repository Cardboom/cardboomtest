import { useState, useEffect } from 'react';
import { Bell, Monitor, Smartphone, MapPin, Clock, Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface LoginNotification {
  id: string;
  device_info: {
    browser?: string;
    os?: string;
    device_type?: string;
  };
  ip_address: string | null;
  location: string | null;
  is_new_device: boolean;
  created_at: string;
}

interface LoginNotificationSettingsProps {
  userId: string;
}

export const LoginNotificationSettings = ({ userId }: LoginNotificationSettingsProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState<LoginNotification[]>([]);
  const [notifyNewLogin, setNotifyNewLogin] = useState(true);
  const [notifyNewDevice, setNotifyNewDevice] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // Load preferences
      const { data: profile } = await supabase
        .from('profiles')
        .select('notify_new_login, notify_new_device')
        .eq('id', userId)
        .single();

      if (profile) {
        setNotifyNewLogin(profile.notify_new_login ?? true);
        setNotifyNewDevice(profile.notify_new_device ?? true);
      }

      // Load recent login notifications
      const { data: notifs } = await supabase
        .from('login_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (notifs) {
        setNotifications(notifs as LoginNotification[]);
      }

      setLoading(false);
    };

    if (open && userId) {
      loadData();
    }
  }, [open, userId]);

  const savePreferences = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        notify_new_login: notifyNewLogin,
        notify_new_device: notifyNewDevice,
      })
      .eq('id', userId);

    if (error) {
      toast.error('Failed to save preferences');
    } else {
      toast.success('Notification preferences saved');
    }
    setSaving(false);
  };

  const getDeviceIcon = (deviceInfo: LoginNotification['device_info']) => {
    const deviceType = deviceInfo?.device_type?.toLowerCase() || '';
    if (deviceType.includes('mobile') || deviceType.includes('phone')) {
      return <Smartphone className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  const getDeviceName = (notification: LoginNotification) => {
    const { browser, os } = notification.device_info || {};
    if (browser && os) {
      return `${browser} on ${os}`;
    }
    return 'Unknown Device';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Bell className="h-4 w-4" />
          Login Alerts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Login Notifications
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* Notification Preferences */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Notification Preferences</h3>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                <div className="space-y-0.5">
                  <Label htmlFor="notify-login" className="text-sm font-medium">
                    New login alerts
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Get notified when you log in from a new location
                  </p>
                </div>
                <Switch
                  id="notify-login"
                  checked={notifyNewLogin}
                  onCheckedChange={setNotifyNewLogin}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                <div className="space-y-0.5">
                  <Label htmlFor="notify-device" className="text-sm font-medium">
                    New device alerts
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Get notified when a new device accesses your account
                  </p>
                </div>
                <Switch
                  id="notify-device"
                  checked={notifyNewDevice}
                  onCheckedChange={setNotifyNewDevice}
                />
              </div>

              <Button
                onClick={savePreferences}
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Preferences'
                )}
              </Button>
            </div>

            {/* Recent Login History */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Recent Login Activity</h3>
              
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent login activity
                </p>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2 pr-4">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 rounded-lg border ${
                          notification.is_new_device 
                            ? 'border-amber-500/30 bg-amber-500/5' 
                            : 'border-border bg-secondary/20'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-1.5 rounded ${
                            notification.is_new_device ? 'bg-amber-500/20 text-amber-500' : 'bg-secondary text-muted-foreground'
                          }`}>
                            {getDeviceIcon(notification.device_info)}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-sm font-medium truncate">
                              {getDeviceName(notification)}
                              {notification.is_new_device && (
                                <span className="ml-2 text-xs text-amber-500">(New device)</span>
                              )}
                            </p>
                            {notification.location && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {notification.location}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
