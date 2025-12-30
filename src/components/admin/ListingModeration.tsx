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
  Flag, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Eye,
  EyeOff,
  Trash2,
  UserX,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { format } from 'date-fns';

const REPORT_TYPES: Record<string, { label: string; color: string }> = {
  fake: { label: 'Fake Item', color: 'bg-red-500/10 text-red-500' },
  counterfeit: { label: 'Counterfeit', color: 'bg-red-500/10 text-red-500' },
  misleading: { label: 'Misleading', color: 'bg-orange-500/10 text-orange-500' },
  prohibited: { label: 'Prohibited', color: 'bg-red-500/10 text-red-500' },
  duplicate: { label: 'Duplicate', color: 'bg-yellow-500/10 text-yellow-500' },
  spam: { label: 'Spam', color: 'bg-gray-500/10 text-gray-500' },
  inappropriate: { label: 'Inappropriate', color: 'bg-purple-500/10 text-purple-500' },
  other: { label: 'Other', color: 'bg-gray-500/10 text-gray-500' },
};

export const ListingModeration = () => {
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [actionReason, setActionReason] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  // Fetch listing reports
  const { data: reports, isLoading, refetch } = useQuery({
    queryKey: ['admin-listing-reports', activeTab],
    queryFn: async () => {
      let query = supabase
        .from('listing_reports')
        .select(`
          *,
          listing:listings(id, title, price, images, status, seller_id)
        `)
        .order('created_at', { ascending: false });

      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch reporter and seller profiles
      if (data && data.length > 0) {
        const reporterIds = data.map(r => r.reporter_id);
        const sellerIds = data.map(r => (r.listing as any)?.seller_id).filter(Boolean);
        const allUserIds = [...new Set([...reporterIds, ...sellerIds])];

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, email')
          .in('id', allUserIds);

        return data.map(r => ({
          ...r,
          reporter: profiles?.find(p => p.id === r.reporter_id),
          seller: profiles?.find(p => p.id === (r.listing as any)?.seller_id)
        }));
      }

      return data || [];
    }
  });

  // Approve listing (dismiss report)
  const dismissMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('listing_reports')
        .update({ 
          status: 'dismissed',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Report dismissed');
      queryClient.invalidateQueries({ queryKey: ['admin-listing-reports'] });
      setSelectedReport(null);
    },
    onError: (error) => {
      toast.error('Failed to dismiss: ' + error.message);
    }
  });

  // Hide listing
  const hideListingMutation = useMutation({
    mutationFn: async ({ reportId, listingId }: { reportId: string; listingId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update report
      await supabase
        .from('listing_reports')
        .update({ 
          status: 'action_taken',
          action_taken: 'listing_hidden',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      // Cancel the listing (hide equivalent)
      const { error } = await supabase
        .from('listings')
        .update({ status: 'cancelled' })
        .eq('id', listingId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Listing hidden');
      queryClient.invalidateQueries({ queryKey: ['admin-listing-reports'] });
      setSelectedReport(null);
    },
    onError: (error) => {
      toast.error('Failed to hide listing: ' + error.message);
    }
  });

  // Delete listing
  const deleteListingMutation = useMutation({
    mutationFn: async ({ reportId, listingId }: { reportId: string; listingId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update report
      await supabase
        .from('listing_reports')
        .update({ 
          status: 'action_taken',
          action_taken: 'listing_deleted',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      // Delete the listing
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Listing deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-listing-reports'] });
      setSelectedReport(null);
    },
    onError: (error) => {
      toast.error('Failed to delete listing: ' + error.message);
    }
  });

  // Suspend seller
  const suspendSellerMutation = useMutation({
    mutationFn: async ({ reportId, sellerId }: { reportId: string; sellerId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update report
      await supabase
        .from('listing_reports')
        .update({ 
          status: 'action_taken',
          action_taken: 'seller_suspended',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      // Suspend the seller (update profile account_status)
      const { error } = await supabase
        .from('profiles')
        .update({ account_status: 'suspended' })
        .eq('id', sellerId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Seller suspended');
      queryClient.invalidateQueries({ queryKey: ['admin-listing-reports'] });
      setSelectedReport(null);
    },
    onError: (error) => {
      toast.error('Failed to suspend seller: ' + error.message);
    }
  });

  const pendingCount = reports?.filter(r => r.status === 'pending').length || 0;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Flag className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Reports</p>
                <p className="text-2xl font-bold text-red-500">{pendingCount}</p>
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
                <p className="text-sm text-muted-foreground">Reviewed</p>
                <p className="text-2xl font-bold text-blue-500">
                  {reports?.filter(r => r.status === 'reviewed').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Action Taken</p>
                <p className="text-2xl font-bold text-orange-500">
                  {reports?.filter(r => r.status === 'action_taken').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-500/10">
                <CheckCircle className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dismissed</p>
                <p className="text-2xl font-bold text-gray-500">
                  {reports?.filter(r => r.status === 'dismissed').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Queue */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-red-500" />
              Listing Moderation
            </CardTitle>
            <CardDescription>Review reported listings and take action</CardDescription>
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
              <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
              <TabsTrigger value="action_taken">Action Taken</TabsTrigger>
              <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : reports?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No reports found
                </div>
              ) : (
                <div className="space-y-4">
                  {reports?.map((report) => {
                    const reportType = REPORT_TYPES[report.report_type] || REPORT_TYPES.other;
                    const listing = report.listing as any;
                    return (
                      <div
                        key={report.id}
                        className="flex items-start gap-4 p-4 rounded-lg border bg-background/50 hover:bg-background/80 transition-colors"
                      >
                        {/* Listing Image */}
                        <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                          {listing?.images?.[0] ? (
                            <img 
                              src={listing.images[0]} 
                              alt={listing.title} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium truncate">{listing?.title || 'Deleted Listing'}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatPrice(listing?.price || 0)} · Seller: {(report as any).seller?.display_name || 'Unknown'}
                              </p>
                            </div>
                            <Badge className={reportType.color}>{reportType.label}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Reported by {(report as any).reporter?.display_name || 'Unknown'} · {format(new Date(report.created_at), 'MMM dd, yyyy')}
                          </p>
                          {report.description && (
                            <p className="text-sm mt-2 line-clamp-2">{report.description}</p>
                          )}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedReport(report)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Review
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Review</DialogTitle>
            <DialogDescription>
              Review the reported listing and take appropriate action
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-6">
              {/* Listing Info */}
              <div className="flex gap-4">
                <div className="w-32 h-32 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  {(selectedReport.listing as any)?.images?.[0] ? (
                    <img 
                      src={(selectedReport.listing as any).images[0]} 
                      alt={(selectedReport.listing as any).title} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-lg">{(selectedReport.listing as any)?.title || 'Deleted Listing'}</p>
                  <p className="text-primary font-bold text-xl">{formatPrice((selectedReport.listing as any)?.price || 0)}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Seller: {selectedReport.seller?.display_name} ({selectedReport.seller?.email})
                  </p>
                  <Badge className={`mt-2 ${REPORT_TYPES[selectedReport.report_type]?.color || ''}`}>
                    {REPORT_TYPES[selectedReport.report_type]?.label || selectedReport.report_type}
                  </Badge>
                </div>
              </div>

              {/* Report Details */}
              <div className="space-y-2">
                <p className="font-medium">Report Details</p>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    Reported by {selectedReport.reporter?.display_name} on {format(new Date(selectedReport.created_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                  {selectedReport.description && (
                    <p className="mt-2">{selectedReport.description}</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {selectedReport.status === 'pending' && (
                <div className="space-y-4 pt-4 border-t">
                  <p className="font-medium">Take Action</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => dismissMutation.mutate(selectedReport.id)}
                      disabled={dismissMutation.isPending}
                      className="gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Dismiss Report
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => hideListingMutation.mutate({ 
                        reportId: selectedReport.id, 
                        listingId: (selectedReport.listing as any)?.id 
                      })}
                      disabled={hideListingMutation.isPending}
                      className="gap-2"
                    >
                      <EyeOff className="w-4 h-4" />
                      Hide Listing
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => deleteListingMutation.mutate({ 
                        reportId: selectedReport.id, 
                        listingId: (selectedReport.listing as any)?.id 
                      })}
                      disabled={deleteListingMutation.isPending}
                      className="gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Listing
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => suspendSellerMutation.mutate({ 
                        reportId: selectedReport.id, 
                        sellerId: (selectedReport.listing as any)?.seller_id 
                      })}
                      disabled={suspendSellerMutation.isPending}
                      className="gap-2"
                    >
                      <UserX className="w-4 h-4" />
                      Suspend Seller
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
