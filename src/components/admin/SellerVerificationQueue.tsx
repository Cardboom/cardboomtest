import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  ShieldCheck, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  FileText,
  User,
  Building,
  Eye,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-500', icon: <Clock className="w-4 h-4" /> },
  in_review: { label: 'In Review', color: 'bg-blue-500/10 text-blue-500', icon: <Eye className="w-4 h-4" /> },
  approved: { label: 'Approved', color: 'bg-emerald-500/10 text-emerald-500', icon: <CheckCircle className="w-4 h-4" /> },
  rejected: { label: 'Rejected', color: 'bg-red-500/10 text-red-500', icon: <XCircle className="w-4 h-4" /> },
  more_info_needed: { label: 'More Info Needed', color: 'bg-orange-500/10 text-orange-500', icon: <AlertTriangle className="w-4 h-4" /> },
};

export const SellerVerificationQueue = () => {
  const queryClient = useQueryClient();
  const [selectedVerification, setSelectedVerification] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  // Fetch verifications from both tables
  const { data: verifications, isLoading, refetch } = useQuery({
    queryKey: ['admin-seller-verifications', activeTab],
    queryFn: async () => {
      // Fetch from seller_verifications (KYC documents)
      let kycQuery = supabase
        .from('seller_verifications')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (activeTab !== 'all') {
        kycQuery = kycQuery.eq('status', activeTab);
      }

      const { data: kycData, error: kycError } = await kycQuery;
      if (kycError) throw kycError;

      // Fetch from verified_sellers (simple applications)
      const simpleQueryBase = supabase
        .from('verified_sellers')
        .select('*')
        .order('created_at', { ascending: false });

      // Build query based on active tab - handle enum type
      const { data: simpleData, error: simpleError } = activeTab !== 'all' 
        ? await simpleQueryBase.eq('verification_status', activeTab as 'pending' | 'approved' | 'rejected')
        : await simpleQueryBase;

      if (simpleError) console.warn('verified_sellers query error:', simpleError);

      // Combine and normalize both sources
      const combinedData: any[] = [];

      // Add KYC verifications
      (kycData || []).forEach(v => {
        combinedData.push({
          ...v,
          source: 'kyc',
          display_status: v.status
        });
      });

      // Add simple verifications (convert status field name)
      (simpleData || []).forEach(v => {
        combinedData.push({
          id: v.id,
          user_id: v.user_id,
          business_name: v.business_name,
          status: v.verification_status,
          created_at: v.created_at,
          submitted_at: v.created_at,
          source: 'simple',
          display_status: v.verification_status,
          business_address: v.business_address
        });
      });

      // Sort by submission date
      combinedData.sort((a, b) => new Date(b.submitted_at || b.created_at).getTime() - new Date(a.submitted_at || a.created_at).getTime());

      // Fetch profile info for all users
      if (combinedData.length > 0) {
        const userIds = [...new Set(combinedData.map(v => v.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, email, avatar_url, created_at')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        return combinedData.map(v => ({
          ...v,
          profile: profileMap.get(v.user_id) || null
        }));
      }

      return combinedData.map(v => ({ ...v, profile: null }));
    }
  });

  // Approve verification
  const approveMutation = useMutation({
    mutationFn: async (verificationId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('seller_verifications')
        .update({ 
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes
        })
        .eq('id', verificationId);

      if (error) throw error;

      // Update user subscription to verified_seller tier
      const verification = verifications?.find(v => v.id === verificationId);
      if (verification) {
        // Create or update subscription to verified_seller tier
        await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: verification.user_id,
            tier: 'verified_seller',
            started_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            price_monthly: 30
          }, { onConflict: 'user_id' });
      }
    },
    onSuccess: () => {
      toast.success('Seller verification approved');
      queryClient.invalidateQueries({ queryKey: ['admin-seller-verifications'] });
      setSelectedVerification(null);
      setAdminNotes('');
    },
    onError: (error) => {
      toast.error('Failed to approve: ' + error.message);
    }
  });

  // Reject verification
  const rejectMutation = useMutation({
    mutationFn: async (verificationId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('seller_verifications')
        .update({ 
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
          admin_notes: adminNotes
        })
        .eq('id', verificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Seller verification rejected');
      queryClient.invalidateQueries({ queryKey: ['admin-seller-verifications'] });
      setSelectedVerification(null);
      setRejectionReason('');
      setAdminNotes('');
    },
    onError: (error) => {
      toast.error('Failed to reject: ' + error.message);
    }
  });

  // Request more info
  const requestInfoMutation = useMutation({
    mutationFn: async (verificationId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('seller_verifications')
        .update({ 
          status: 'more_info_needed',
          reviewed_by: user?.id,
          admin_notes: adminNotes
        })
        .eq('id', verificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Requested additional information');
      queryClient.invalidateQueries({ queryKey: ['admin-seller-verifications'] });
      setSelectedVerification(null);
      setAdminNotes('');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    }
  });

  const pendingCount = verifications?.filter(v => v.status === 'pending').length || 0;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-500">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Eye className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Review</p>
                <p className="text-2xl font-bold text-blue-500">
                  {verifications?.filter(v => v.status === 'in_review').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-emerald-500">
                  {verifications?.filter(v => v.status === 'approved').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold text-red-500">
                  {verifications?.filter(v => v.status === 'rejected').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verification Queue */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Seller Verification Queue
            </CardTitle>
            <CardDescription>Review and approve seller KYC applications</CardDescription>
          </div>
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending" className="gap-2">
                Pending {pendingCount > 0 && <Badge variant="destructive" className="ml-1">{pendingCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="in_review">In Review</TabsTrigger>
              <TabsTrigger value="more_info_needed">More Info Needed</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : verifications?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No verifications found
                </div>
              ) : (
                <div className="space-y-4">
                  {verifications?.map((verification) => {
                    const status = STATUS_CONFIG[verification.status] || STATUS_CONFIG.pending;
                    return (
                      <div
                        key={verification.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-background/50 hover:bg-background/80 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            {verification.business_type === 'individual' ? (
                              <User className="w-6 h-6 text-primary" />
                            ) : (
                              <Building className="w-6 h-6 text-primary" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{verification.profile?.display_name || 'Unknown User'}</p>
                            <p className="text-sm text-muted-foreground">
                              {verification.business_name || verification.business_type}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Submitted: {format(new Date(verification.submitted_at), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={`gap-1 ${status.color}`}>
                            {status.icon}
                            {status.label}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedVerification(verification)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Review
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Verification Detail Dialog */}
      <Dialog open={!!selectedVerification} onOpenChange={() => setSelectedVerification(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verification Review</DialogTitle>
            <DialogDescription>
              Review seller verification documents and make a decision
            </DialogDescription>
          </DialogHeader>

          {selectedVerification && (
            <div className="space-y-6">
              {/* Applicant Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Applicant</p>
                  <p className="font-medium">{(selectedVerification as any).profile?.display_name || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">{(selectedVerification as any).profile?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Business Type</p>
                  <p className="font-medium capitalize">{selectedVerification.business_type}</p>
                  {selectedVerification.business_name && (
                    <p className="text-sm text-muted-foreground">{selectedVerification.business_name}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Age</p>
                  <p className="font-medium">
                    {selectedVerification.profile?.created_at 
                      ? format(new Date(selectedVerification.profile.created_at), 'MMM dd, yyyy')
                      : 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="font-medium">
                    {format(new Date(selectedVerification.submitted_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-3">
                <p className="font-medium">Documents</p>
                <div className="grid grid-cols-2 gap-3">
                  {selectedVerification.id_document_url && (
                    <a 
                      href={selectedVerification.id_document_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <FileText className="w-5 h-5 text-primary" />
                      <span>ID Document</span>
                    </a>
                  )}
                  {selectedVerification.business_document_url && (
                    <a 
                      href={selectedVerification.business_document_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <FileText className="w-5 h-5 text-primary" />
                      <span>Business Document</span>
                    </a>
                  )}
                  {selectedVerification.selfie_url && (
                    <a 
                      href={selectedVerification.selfie_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <FileText className="w-5 h-5 text-primary" />
                      <span>Selfie</span>
                    </a>
                  )}
                  {selectedVerification.address_proof_url && (
                    <a 
                      href={selectedVerification.address_proof_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <FileText className="w-5 h-5 text-primary" />
                      <span>Address Proof</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Admin Notes */}
              <div className="space-y-2">
                <p className="font-medium">Admin Notes</p>
                <Textarea
                  placeholder="Add notes for internal reference..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>

              {/* Rejection Reason (only show if rejecting) */}
              {selectedVerification.status !== 'approved' && (
                <div className="space-y-2">
                  <p className="font-medium text-red-500">Rejection Reason (required for rejection)</p>
                  <Textarea
                    placeholder="Explain why the verification is being rejected..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
              )}

              {/* Action Buttons */}
              {selectedVerification.status !== 'approved' && selectedVerification.status !== 'rejected' && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    className="flex-1"
                    onClick={() => approveMutation.mutate(selectedVerification.id)}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => requestInfoMutation.mutate(selectedVerification.id)}
                    disabled={requestInfoMutation.isPending}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Request More Info
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => rejectMutation.mutate(selectedVerification.id)}
                    disabled={rejectMutation.isPending || !rejectionReason}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
