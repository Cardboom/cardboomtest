import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
  admin_response?: string;
  profiles?: { display_name: string | null; email: string | null };
}

// Mock data since we don't have a support_tickets table yet
const mockTickets: SupportTicket[] = [
  {
    id: '1',
    user_id: 'user1',
    subject: 'Cannot withdraw funds',
    message: 'I have been trying to withdraw my balance for 3 days but it keeps failing.',
    status: 'open',
    priority: 'high',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    profiles: { display_name: 'Ahmet Y.', email: 'ahmet@example.com' }
  },
  {
    id: '2',
    user_id: 'user2',
    subject: 'Card condition dispute',
    message: 'The card I received was listed as Near Mint but has visible scratches.',
    status: 'in_progress',
    priority: 'medium',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    admin_response: 'We are reviewing the photos you sent.',
    profiles: { display_name: 'Mehmet K.', email: 'mehmet@example.com' }
  },
  {
    id: '3',
    user_id: 'user3',
    subject: 'How to verify my account?',
    message: 'I uploaded my ID but the verification is still pending after 5 days.',
    status: 'resolved',
    priority: 'low',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    admin_response: 'Your account has been verified. Thank you for your patience.',
    profiles: { display_name: 'Zeynep A.', email: 'zeynep@example.com' }
  },
];

export const SupportTickets = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>(mockTickets);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [response, setResponse] = useState('');

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
    
    // Update mock data
    setTickets(prev => prev.map(t => 
      t.id === selectedTicket.id 
        ? { ...t, admin_response: response, status: 'in_progress' as const, updated_at: new Date().toISOString() }
        : t
    ));
    toast.success('Response sent successfully');
    setResponse('');
    setSelectedTicket(null);
  };

  const handleUpdateStatus = (ticketId: string, newStatus: string) => {
    setTickets(prev => prev.map(t => 
      t.id === ticketId 
        ? { ...t, status: newStatus as any, updated_at: new Date().toISOString() }
        : t
    ));
    toast.success('Status updated');
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
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.map((ticket) => (
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
                  <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                  <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                  <TableCell className="text-muted-foreground">{timeAgo(ticket.created_at)}</TableCell>
                  <TableCell className="text-center">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => setSelectedTicket(ticket)}>
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
                          </div>
                          <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm font-medium mb-1">From: {ticket.profiles?.display_name} ({ticket.profiles?.email})</p>
                            <p className="text-muted-foreground">{ticket.message}</p>
                          </div>
                          {ticket.admin_response && (
                            <div className="p-4 bg-primary/10 rounded-lg border-l-4 border-primary">
                              <p className="text-sm font-medium mb-1">Admin Response:</p>
                              <p className="text-muted-foreground">{ticket.admin_response}</p>
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
                              <Button onClick={handleRespond} disabled={!response}>Send Response</Button>
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};