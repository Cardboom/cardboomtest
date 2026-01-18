import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Users, 
  RefreshCw, 
  Check,
  X,
  Eye,
  DollarSign,
  Percent,
  Clock,
  TrendingUp,
  UserCheck,
  UserX,
  Wallet
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useCurrency } from '@/contexts/CurrencyContext';

interface CreatorApplication {
  id: string;
  creator_name: string;
  email: string;
  platform: string;
  handle: string;
  follower_count: string | null;
  categories: string[];
  bio: string | null;
  portfolio_url: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

interface CreatorProfile {
  id: string;
  user_id: string;
  creator_name: string;
  bio: string | null;
  platform: string;
  is_approved: boolean | null;
  is_verified: boolean | null;
  revenue_share_percent: number | null;
  total_earnings_cents: number | null;
  pending_earnings_cents: number | null;
  approved_at: string | null;
  created_at: string;
  profile?: {
    display_name: string | null;
    email: string | null;
  };
}

interface CreatorEarning {
  id: string;
  creator_id: string;
  source_type: string;
  gross_revenue_cents: number;
  platform_fee_cents: number;
  creator_share_percent: number;
  creator_earnings_cents: number;
  status: string;
  created_at: string;
}

export function CreatorManagement() {
  const [applications, setApplications] = useState<CreatorApplication[]>([]);
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [earnings, setEarnings] = useState<CreatorEarning[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<CreatorApplication | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<CreatorProfile | null>(null);
  const [revenueShareInput, setRevenueShareInput] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { formatPrice } = useCurrency();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch only pending applications (approved/rejected ones are processed)
      const { data: appsData, error: appsError } = await supabase
        .from('creator_applications')
        .select('*')
        .in('status', ['pending', 'waitlisted'])
        .order('created_at', { ascending: false });

      if (appsError) throw appsError;
      setApplications(appsData || []);

      // Fetch creator profiles with user info
      const { data: creatorsData, error: creatorsError } = await supabase
        .from('creator_profiles')
        .select(`
          id,
          user_id,
          creator_name,
          bio,
          platform,
          is_approved,
          is_verified,
          revenue_share_percent,
          total_earnings_cents,
          pending_earnings_cents,
          approved_at,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (creatorsError) throw creatorsError;
      
      // Fetch profile data separately to avoid join issues
      const creatorUserIds = (creatorsData || []).map(c => c.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .in('id', creatorUserIds);
      
      const profileMap = new Map((profilesData || []).map(p => [p.id, p]));
      
      const creatorsWithProfiles = (creatorsData || []).map(creator => ({
        ...creator,
        profile: profileMap.get(creator.user_id) || null
      }));
      
      setCreators(creatorsWithProfiles as CreatorProfile[]);

      // Fetch recent earnings
      const { data: earningsData } = await supabase
        .from('creator_earnings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      setEarnings((earningsData || []) as CreatorEarning[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch creator data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApproveApplication = async (app: CreatorApplication, approved: boolean) => {
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('creator_applications')
        .update({ 
          status: approved ? 'approved' : 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          notes: adminNotes || null
        })
        .eq('id', app.id);

      if (error) throw error;

      toast.success(approved ? 'Application approved!' : 'Application rejected');
      setSelectedApplication(null);
      setAdminNotes('');
      fetchData();
    } catch (error: any) {
      console.error('Error updating application:', error);
      toast.error(error.message || 'Failed to update application');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveCreator = async (creator: CreatorProfile) => {
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const sharePercent = parseFloat(revenueShareInput) || 0;

      if (sharePercent < 0 || sharePercent > 100) {
        toast.error('Revenue share must be between 0 and 100%');
        return;
      }

      const { error } = await supabase
        .from('creator_profiles')
        .update({ 
          is_approved: true,
          revenue_share_percent: sharePercent,
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .eq('id', creator.id);

      if (error) throw error;

      toast.success(`Creator approved with ${sharePercent}% revenue share!`);
      setSelectedCreator(null);
      setRevenueShareInput('');
      fetchData();
    } catch (error: any) {
      console.error('Error approving creator:', error);
      toast.error(error.message || 'Failed to approve creator');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateRevenueShare = async (creator: CreatorProfile) => {
    setIsProcessing(true);
    try {
      const sharePercent = parseFloat(revenueShareInput);

      if (isNaN(sharePercent) || sharePercent < 0 || sharePercent > 100) {
        toast.error('Revenue share must be between 0 and 100%');
        return;
      }

      const { error } = await supabase
        .from('creator_profiles')
        .update({ revenue_share_percent: sharePercent })
        .eq('id', creator.id);

      if (error) throw error;

      toast.success(`Revenue share updated to ${sharePercent}%`);
      setSelectedCreator(null);
      setRevenueShareInput('');
      fetchData();
    } catch (error: any) {
      console.error('Error updating revenue share:', error);
      toast.error(error.message || 'Failed to update revenue share');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevokeApproval = async (creator: CreatorProfile) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('creator_profiles')
        .update({ 
          is_approved: false,
          revenue_share_percent: 0
        })
        .eq('id', creator.id);

      if (error) throw error;

      toast.success('Creator approval revoked');
      setSelectedCreator(null);
      fetchData();
    } catch (error: any) {
      console.error('Error revoking approval:', error);
      toast.error(error.message || 'Failed to revoke approval');
    } finally {
      setIsProcessing(false);
    }
  };

  // Stats
  const pendingApps = applications.filter(a => a.status === 'pending');
  const approvedCreators = creators.filter(c => c.is_approved);
  const totalEarningsPaid = earnings.reduce((sum, e) => sum + (e.creator_earnings_cents || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-gain/10 text-gain">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'waitlisted':
        return <Badge variant="outline">Waitlisted</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Creator Management
          </h2>
          <p className="text-muted-foreground">Manage creator applications, approvals, and revenue share</p>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchData}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Apps</p>
                <p className="text-2xl font-bold">{pendingApps.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gain/10">
                <UserCheck className="w-5 h-5 text-gain" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved Creators</p>
                <p className="text-2xl font-bold">{approvedCreators.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Creators</p>
                <p className="text-2xl font-bold">{creators.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <DollarSign className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Earnings Paid</p>
                <p className="text-xl font-bold">{formatPrice(totalEarningsPaid / 100)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="applications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="applications" className="gap-2">
            <Clock className="w-4 h-4" />
            Applications ({applications.length})
          </TabsTrigger>
          <TabsTrigger value="creators" className="gap-2">
            <Users className="w-4 h-4" />
            Creators ({creators.length})
          </TabsTrigger>
          <TabsTrigger value="earnings" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Earnings Log
          </TabsTrigger>
        </TabsList>

        {/* Applications Tab */}
        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle>Creator Applications</CardTitle>
              <CardDescription>Review and approve creator applications</CardDescription>
            </CardHeader>
            <CardContent>
              {applications.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No applications yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Creator</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Followers</TableHead>
                      <TableHead>Categories</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{app.creator_name}</p>
                            <p className="text-xs text-muted-foreground">{app.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{app.platform}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">@{app.handle}</p>
                        </TableCell>
                        <TableCell>{app.follower_count || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {app.categories?.slice(0, 2).map((cat, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{cat}</Badge>
                            ))}
                            {app.categories?.length > 2 && (
                              <Badge variant="secondary" className="text-xs">+{app.categories.length - 2}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(app.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedApplication(app)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Creators Tab */}
        <TabsContent value="creators">
          <Card>
            <CardHeader>
              <CardTitle>Creator Profiles</CardTitle>
              <CardDescription>Manage approved creators and their revenue share</CardDescription>
            </CardHeader>
            <CardContent>
              {creators.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No creators yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Creator</TableHead>
                      <TableHead>User Account</TableHead>
                      <TableHead>Revenue Share</TableHead>
                      <TableHead>Total Earnings</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creators.map((creator) => (
                      <TableRow key={creator.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{creator.creator_name}</p>
                            <p className="text-xs text-muted-foreground">{creator.platform}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{creator.profile?.display_name || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">{creator.profile?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {creator.is_approved ? (
                            <Badge className="bg-primary/10 text-primary font-mono">
                              {creator.revenue_share_percent || 0}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatPrice((creator.total_earnings_cents || 0) / 100)}
                        </TableCell>
                        <TableCell>
                          {creator.is_approved ? (
                            <Badge className="bg-gain/10 text-gain">Approved</Badge>
                          ) : (
                            <Badge variant="outline">Pending Approval</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedCreator(creator);
                              setRevenueShareInput(String(creator.revenue_share_percent || 0));
                            }}
                          >
                            <Percent className="w-4 h-4 mr-1" />
                            {creator.is_approved ? 'Edit' : 'Approve'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Earnings Tab */}
        <TabsContent value="earnings">
          <Card>
            <CardHeader>
              <CardTitle>Earnings Log</CardTitle>
              <CardDescription>Track all creator revenue share payouts</CardDescription>
            </CardHeader>
            <CardContent>
              {earnings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No earnings yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Gross Revenue</TableHead>
                      <TableHead>Platform Fee</TableHead>
                      <TableHead>Share %</TableHead>
                      <TableHead>Creator Earnings</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {earnings.map((earning) => (
                      <TableRow key={earning.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(earning.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{earning.source_type}</Badge>
                        </TableCell>
                        <TableCell>{formatPrice(earning.gross_revenue_cents / 100)}</TableCell>
                        <TableCell>{formatPrice(earning.platform_fee_cents / 100)}</TableCell>
                        <TableCell className="font-mono">{earning.creator_share_percent}%</TableCell>
                        <TableCell className="font-medium text-gain">
                          +{formatPrice(earning.creator_earnings_cents / 100)}
                        </TableCell>
                        <TableCell>
                          <Badge className={earning.status === 'credited' ? 'bg-gain/10 text-gain' : ''}>
                            {earning.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Application Review Dialog */}
      <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Application</DialogTitle>
            <DialogDescription>
              {selectedApplication?.creator_name} - {selectedApplication?.platform}
            </DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p>{selectedApplication.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Handle</Label>
                  <p>@{selectedApplication.handle}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Followers</Label>
                  <p>{selectedApplication.follower_count || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p>{getStatusBadge(selectedApplication.status)}</p>
                </div>
              </div>
              {selectedApplication.bio && (
                <div>
                  <Label className="text-muted-foreground">Bio</Label>
                  <p className="text-sm">{selectedApplication.bio}</p>
                </div>
              )}
              {selectedApplication.portfolio_url && (
                <div>
                  <Label className="text-muted-foreground">Portfolio</Label>
                  <a href={selectedApplication.portfolio_url} target="_blank" rel="noopener noreferrer" 
                     className="text-sm text-primary hover:underline">
                    {selectedApplication.portfolio_url}
                  </a>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Categories</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedApplication.categories?.map((cat, i) => (
                    <Badge key={i} variant="secondary">{cat}</Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea
                  placeholder="Add notes about this application..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedApplication(null)}>Cancel</Button>
            {selectedApplication?.status === 'pending' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => handleApproveApplication(selectedApplication, false)}
                  disabled={isProcessing}
                >
                  <X className="w-4 h-4 mr-1" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleApproveApplication(selectedApplication, true)}
                  disabled={isProcessing}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Creator Approval/Edit Dialog */}
      <Dialog open={!!selectedCreator} onOpenChange={() => setSelectedCreator(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedCreator?.is_approved ? 'Edit Creator' : 'Approve Creator'}
            </DialogTitle>
            <DialogDescription>
              {selectedCreator?.creator_name}
            </DialogDescription>
          </DialogHeader>
          {selectedCreator && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Revenue Share Percentage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    placeholder="10"
                    value={revenueShareInput}
                    onChange={(e) => setRevenueShareInput(e.target.value)}
                    className="max-w-[120px]"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  The creator will earn this percentage of platform fees from their referred users' purchases
                </p>
              </div>
              {selectedCreator.is_approved && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Earnings</span>
                    <span className="font-medium">{formatPrice((selectedCreator.total_earnings_cents || 0) / 100)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Approved Since</span>
                    <span>{selectedCreator.approved_at ? formatDistanceToNow(new Date(selectedCreator.approved_at), { addSuffix: true }) : 'N/A'}</span>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedCreator(null)}>Cancel</Button>
            {selectedCreator?.is_approved ? (
              <>
                <Button
                  variant="destructive"
                  onClick={() => handleRevokeApproval(selectedCreator)}
                  disabled={isProcessing}
                >
                  <UserX className="w-4 h-4 mr-1" />
                  Revoke
                </Button>
                <Button
                  onClick={() => handleUpdateRevenueShare(selectedCreator)}
                  disabled={isProcessing}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Update
                </Button>
              </>
            ) : (
              <Button
                onClick={() => handleApproveCreator(selectedCreator)}
                disabled={isProcessing || !revenueShareInput}
              >
                <UserCheck className="w-4 h-4 mr-1" />
                Approve & Set Revenue Share
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
