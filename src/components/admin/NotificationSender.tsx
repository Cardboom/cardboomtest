import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Bell, 
  Send, 
  Plus, 
  Clock, 
  CheckCircle, 
  Users,
  RefreshCw,
  Calendar,
  Megaphone
} from 'lucide-react';
import { format } from 'date-fns';

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All Users', description: 'Send to everyone' },
  { value: 'pro_users', label: 'Pro Subscribers', description: 'Users with active Pro subscription' },
  { value: 'verified_sellers', label: 'Verified Sellers', description: 'Users with Verified Seller status' },
  { value: 'inactive_users', label: 'Inactive Users', description: 'Users who haven\'t been active in 30 days' },
  { value: 'new_users', label: 'New Users', description: 'Users who joined in the last 7 days' },
];

export const NotificationSender = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newNotification, setNewNotification] = useState({
    title: '',
    body: '',
    target_audience: 'all',
    scheduled_at: ''
  });

  // Fetch sent notifications
  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  // Get user counts for preview
  const { data: userCounts } = useQuery({
    queryKey: ['admin-user-counts'],
    queryFn: async () => {
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: proUsers } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('tier', 'pro')
        .gte('expires_at', new Date().toISOString());

      const { count: verifiedSellers } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('tier', 'verified_seller')
        .gte('expires_at', new Date().toISOString());

      return {
        all: totalUsers || 0,
        pro_users: proUsers || 0,
        verified_sellers: verifiedSellers || 0,
        inactive_users: Math.floor((totalUsers || 0) * 0.3), // Estimate
        new_users: Math.floor((totalUsers || 0) * 0.1) // Estimate
      };
    }
  });

  // Send notification
  const sendMutation = useMutation({
    mutationFn: async (sendNow: boolean) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Insert notification record
      const { data, error } = await supabase
        .from('admin_notifications')
        .insert({
          title: newNotification.title,
          body: newNotification.body,
          target_audience: newNotification.target_audience,
          scheduled_at: sendNow ? null : newNotification.scheduled_at || null,
          is_sent: sendNow,
          sent_at: sendNow ? new Date().toISOString() : null,
          sent_count: sendNow ? (userCounts?.[newNotification.target_audience as keyof typeof userCounts] || 0) : 0,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // If sending now, trigger the notification edge function
      if (sendNow) {
        await supabase.functions.invoke('send-notification', {
          body: {
            notificationId: data.id,
            title: newNotification.title,
            body: newNotification.body,
            targetAudience: newNotification.target_audience
          }
        });
      }

      return data;
    },
    onSuccess: (_, sendNow) => {
      toast.success(sendNow ? 'Notification sent!' : 'Notification scheduled');
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      setIsCreateOpen(false);
      setNewNotification({
        title: '',
        body: '',
        target_audience: 'all',
        scheduled_at: ''
      });
    },
    onError: (error) => {
      toast.error('Failed to send notification: ' + error.message);
    }
  });

  const sentCount = notifications?.filter(n => n.is_sent).length || 0;
  const scheduledCount = notifications?.filter(n => !n.is_sent && n.scheduled_at).length || 0;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sent</p>
                <p className="text-2xl font-bold">{sentCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold text-blue-500">{scheduledCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Users className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-emerald-500">{userCounts?.all || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Send className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Delivered</p>
                <p className="text-2xl font-bold text-purple-500">
                  {notifications?.reduce((sum, n) => sum + (n.sent_count || 0), 0) || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications Table */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              Push Notifications
            </CardTitle>
            <CardDescription>Send announcements to your users</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Notification
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Notification</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      placeholder="🎉 Big News!"
                      value={newNotification.title}
                      onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                      maxLength={50}
                    />
                    <p className="text-xs text-muted-foreground">{newNotification.title.length}/50 characters</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea
                      placeholder="Check out our new features..."
                      value={newNotification.body}
                      onChange={(e) => setNewNotification({ ...newNotification, body: e.target.value })}
                      rows={3}
                      maxLength={200}
                    />
                    <p className="text-xs text-muted-foreground">{newNotification.body.length}/200 characters</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Target Audience</Label>
                    <Select 
                      value={newNotification.target_audience} 
                      onValueChange={(v) => setNewNotification({ ...newNotification, target_audience: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AUDIENCE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center justify-between w-full">
                              <span>{option.label}</span>
                              <Badge variant="outline" className="ml-2">
                                ~{userCounts?.[option.value as keyof typeof userCounts] || 0}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {AUDIENCE_OPTIONS.find(o => o.value === newNotification.target_audience)?.description}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Schedule (Optional)</Label>
                    <Input
                      type="datetime-local"
                      value={newNotification.scheduled_at}
                      onChange={(e) => setNewNotification({ ...newNotification, scheduled_at: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Leave empty to send immediately</p>
                  </div>

                  {/* Preview */}
                  <div className="p-4 rounded-lg border bg-background/50">
                    <p className="text-sm text-muted-foreground mb-2">Preview</p>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{newNotification.title || 'Notification Title'}</p>
                        <p className="text-sm text-muted-foreground">{newNotification.body || 'Notification message...'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      className="flex-1" 
                      onClick={() => sendMutation.mutate(true)}
                      disabled={sendMutation.isPending || !newNotification.title || !newNotification.body}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send Now
                    </Button>
                    {newNotification.scheduled_at && (
                      <Button 
                        variant="outline"
                        className="flex-1" 
                        onClick={() => sendMutation.mutate(false)}
                        disabled={sendMutation.isPending || !newNotification.title || !newNotification.body}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule
                      </Button>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : notifications?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No notifications sent yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Sent To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications?.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{notification.title}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                            {notification.body}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">
                        {notification.target_audience.replace('_', ' ')}
                      </TableCell>
                      <TableCell>{notification.sent_count || 0}</TableCell>
                      <TableCell>
                        {notification.is_sent ? (
                          <Badge className="bg-emerald-500/10 text-emerald-500 gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Sent
                          </Badge>
                        ) : notification.scheduled_at ? (
                          <Badge className="bg-blue-500/10 text-blue-500 gap-1">
                            <Clock className="w-3 h-3" />
                            Scheduled
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-500/10 text-gray-500">Draft</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {notification.sent_at 
                          ? format(new Date(notification.sent_at), 'MMM dd, yyyy HH:mm')
                          : notification.scheduled_at
                          ? format(new Date(notification.scheduled_at), 'MMM dd, yyyy HH:mm')
                          : format(new Date(notification.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
