import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Mail, Send, FileText, Clock, CheckCircle, XCircle, RefreshCw, Eye } from "lucide-react";
import { format } from "date-fns";

export function EmailManager() {
  const queryClient = useQueryClient();
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [testEmail, setTestEmail] = useState("");

  // Fetch email templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('template_key');
      if (error) throw error;
      return data;
    },
  });

  // Fetch email logs
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['email-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Fetch email stats
  const { data: stats } = useQuery({
    queryKey: ['email-stats'],
    queryFn: async () => {
      const { data: sentToday } = await supabase
        .from('email_logs')
        .select('id', { count: 'exact' })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      
      const { data: failed } = await supabase
        .from('email_logs')
        .select('id', { count: 'exact' })
        .eq('status', 'failed');

      const { data: total } = await supabase
        .from('email_logs')
        .select('id', { count: 'exact' });

      return {
        sentToday: sentToday?.length || 0,
        failed: failed?.length || 0,
        total: total?.length || 0,
      };
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (template: any) => {
      const { error } = await supabase
        .from('email_templates')
        .update({
          subject: template.subject,
          html_content: template.html_content,
          is_active: template.is_active,
        })
        .eq('id', template.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success("Template updated");
      setEditingTemplate(null);
    },
    onError: (error: any) => {
      toast.error("Failed to update template: " + error.message);
    },
  });

  // Send test email mutation
  const sendTestMutation = useMutation({
    mutationFn: async ({ templateKey, email }: { templateKey: string; email: string }) => {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          template_key: templateKey,
          variables: {
            name: 'Test User',
            item_name: 'Test Card',
            price: '$99.99',
            new_price: '$109.99',
            old_price: '$99.99',
            order_id: 'TEST-123',
            item_url: 'https://cardboom.com',
            order_url: 'https://cardboom.com',
            site_url: 'https://cardboom.com',
            digest_content: '<p>Sample digest content</p>',
          },
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Test email sent!");
      queryClient.invalidateQueries({ queryKey: ['email-logs'] });
    },
    onError: (error: any) => {
      toast.error("Failed to send test email: " + error.message);
    },
  });

  // Trigger weekly digest mutation
  const triggerDigestMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('send-weekly-digest');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Weekly digest sent to ${data?.sent || 0} users`);
      queryClient.invalidateQueries({ queryKey: ['email-logs'] });
    },
    onError: (error: any) => {
      toast.error("Failed to trigger digest: " + error.message);
    },
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sent Today</p>
                <p className="text-2xl font-bold">{stats?.sentToday || 0}</p>
              </div>
              <Mail className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sent</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
              <Send className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-500">{stats?.failed || 0}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Templates</p>
                <p className="text-2xl font-bold">{templates?.length || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
          <TabsTrigger value="logs">Email Logs</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>Manage transactional email templates</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates?.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.template_key}</TableCell>
                      <TableCell>{template.subject}</TableCell>
                      <TableCell>
                        <Badge variant={template.is_active ? "default" : "secondary"}>
                          {template.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingTemplate({ ...template })}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Edit Template: {template.template_key}</DialogTitle>
                              </DialogHeader>
                              {editingTemplate && (
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-sm font-medium">Subject</label>
                                    <Input
                                      value={editingTemplate.subject}
                                      onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">HTML Content</label>
                                    <Textarea
                                      value={editingTemplate.html_content}
                                      onChange={(e) => setEditingTemplate({ ...editingTemplate, html_content: e.target.value })}
                                      rows={15}
                                      className="font-mono text-xs"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={editingTemplate.is_active}
                                      onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, is_active: checked })}
                                    />
                                    <span className="text-sm">Active</span>
                                  </div>
                                  <Button
                                    onClick={() => updateTemplateMutation.mutate(editingTemplate)}
                                    disabled={updateTemplateMutation.isPending}
                                  >
                                    Save Changes
                                  </Button>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Send className="h-4 w-4 mr-1" />
                                Test
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Send Test Email</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Input
                                  placeholder="recipient@example.com"
                                  value={testEmail}
                                  onChange={(e) => setTestEmail(e.target.value)}
                                />
                                <Button
                                  onClick={() => sendTestMutation.mutate({ templateKey: template.template_key, email: testEmail })}
                                  disabled={sendTestMutation.isPending || !testEmail}
                                >
                                  Send Test
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Email Logs</CardTitle>
              <CardDescription>Recent email activity</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{log.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.template_key}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{log.subject}</TableCell>
                      <TableCell>
                        {log.status === 'sent' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Email Actions</CardTitle>
              <CardDescription>Trigger email campaigns and jobs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border/50 rounded-lg">
                <div>
                  <h4 className="font-medium">Weekly Digest</h4>
                  <p className="text-sm text-muted-foreground">Send market digest to all subscribed users</p>
                </div>
                <Button
                  onClick={() => triggerDigestMutation.mutate()}
                  disabled={triggerDigestMutation.isPending}
                >
                  {triggerDigestMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
