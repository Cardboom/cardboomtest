import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, MessageCircle, Search, Clock, CheckCircle, AlertCircle, XCircle, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  category: string | null;
  created_at: string;
  updated_at: string;
  admin_response: string | null;
  assigned_to: string | null;
  resolved_at: string | null;
  profiles?: { display_name: string | null; email: string | null };
}

export const SupportTickets = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [response, setResponse] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch tickets from database
  const { data: tickets = [], isLoading, refetch } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: async () => {
      // Fetch tickets first
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (ticketsError) throw ticketsError;
      
      // Fetch profiles separately
      const userIds = [...new Set(ticketsData?.map(t => t.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .in('id', userIds);
      
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      
      return (ticketsData || []).map(ticket => ({
        ...ticket,
        profiles: profilesMap.get(ticket.user_id) || null
      })) as SupportTicket[];
    }
  });

  // Update ticket mutation
  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SupportTicket> }) => {
      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    }
  });

  const stats = {
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    total: tickets.length,
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ticket.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Open</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500"><AlertCircle className="w-3 h-3 mr-1" />In Progress</Badge>;
      case 'resolved':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Resolved</Badge>;
      case 'closed':
        return <Badge className="bg-gray-500"><XCircle className="w-3 h-3 mr-1" />Closed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const handleRespond = async () => {
    if (!selectedTicket || !response) return;
    
    try {
      await updateTicketMutation.mutateAsync({
        id: selectedTicket.id,
        updates: {
          admin_response: response,
          status: 'in_progress'
        }
      });
      toast.success('Response sent successfully');
      setResponse('');
      setDialogOpen(false);
      setSelectedTicket(null);
    } catch (error) {
      toast.error('Failed to send response');
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    try {
      const updates: Partial<SupportTicket> = { status: newStatus };
      if (newStatus === 'resolved') {
        updates.resolved_at = new Date().toISOString();
      }
      await updateTicketMutation.mutateAsync({ id: ticketId, updates });
      toast.success('Status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const timeAgo = (dateString: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Open</p>
                <p className="text-2xl font-bold text-yellow-500">{stats.open}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <AlertCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-blue-500">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold text-green-500">{stats.resolved}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No tickets found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{ticket.profiles?.display_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{ticket.profiles?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{ticket.message}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{ticket.category || 'General'}</Badge>
                    </TableCell>
                    <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell className="text-muted-foreground">{timeAgo(ticket.created_at)}</TableCell>
                    <TableCell className="text-center">
                      <Dialog open={dialogOpen && selectedTicket?.id === ticket.id} onOpenChange={(open) => {
                        setDialogOpen(open);
                        if (!open) setSelectedTicket(null);
                      }}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => {
                            setSelectedTicket(ticket);
                            setDialogOpen(true);
                          }}>
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>{ticket.subject}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="flex gap-2">
                              {getPriorityBadge(ticket.priority)}
                              {getStatusBadge(ticket.status)}
                              {ticket.category && <Badge variant="outline">{ticket.category}</Badge>}
                            </div>
                            <div className="p-4 bg-muted/50 rounded-lg">
                              <p className="text-sm font-medium mb-1">From: {ticket.profiles?.display_name} ({ticket.profiles?.email})</p>
                              <p className="text-muted-foreground whitespace-pre-wrap">{ticket.message}</p>
                            </div>
                            {ticket.admin_response && (
                              <div className="p-4 bg-primary/10 rounded-lg border-l-4 border-primary">
                                <p className="text-sm font-medium mb-1">Admin Response:</p>
                                <p className="text-muted-foreground whitespace-pre-wrap">{ticket.admin_response}</p>
                              </div>
                            )}
                            <div className="space-y-2">
                              <Textarea
                                placeholder="Write your response..."
                                value={response}
                                onChange={(e) => setResponse(e.target.value)}
                                rows={4}
                              />
                              <div className="flex gap-2">
                                <Button onClick={handleRespond} disabled={!response || updateTicketMutation.isPending}>
                                  {updateTicketMutation.isPending ? 'Sending...' : 'Send Response'}
                                </Button>
                                <Select value={ticket.status} onValueChange={(v) => handleUpdateStatus(ticket.id, v)}>
                                  <SelectTrigger className="w-[150px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="resolved">Resolved</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
