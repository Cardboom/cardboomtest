import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Search, CheckCircle, XCircle, Trophy, User, Clock, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface PendingCoach {
  id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  guru_expertise: string[] | null;
  custom_guru: string | null;
  created_at: string;
  is_verified_coach: boolean;
  coach_verified_at: string | null;
}

export const CoachVerificationQueue = () => {
  const [coaches, setCoaches] = useState<PendingCoach[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPendingCoaches = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, bio, avatar_url, guru_expertise, custom_guru, created_at, is_verified_coach, coach_verified_at')
        .eq('custom_guru', 'gaming_coach_pending')
        .eq('is_verified_coach', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoaches((data || []) as PendingCoach[]);
    } catch (error) {
      console.error('Error fetching pending coaches:', error);
      toast.error('Failed to load pending coaches');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingCoaches();
  }, []);

  const handleApprove = async (coachId: string) => {
    setProcessingId(coachId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update profile to verified coach
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          is_verified_coach: true,
          custom_guru: 'gaming_coach',
          coach_verified_at: new Date().toISOString(),
          coach_verified_by: user.id,
        })
        .eq('id', coachId);

      if (profileError) throw profileError;

      // Activate all cancelled coaching listings for this user
      const { error: listingsError } = await supabase
        .from('listings')
        .update({ status: 'active' })
        .eq('seller_id', coachId)
        .eq('category', 'coaching')
        .eq('status', 'cancelled');

      if (listingsError) throw listingsError;

      // Send notification to the coach
      await supabase.from('notifications').insert({
        user_id: coachId,
        type: 'system',
        title: 'Coach Application Approved! 🎉',
        body: 'Congratulations! Your coaching profile has been verified. Your coaching services are now live on the marketplace.',
      });

      toast.success('Coach approved successfully');
      fetchPendingCoaches();
    } catch (error: any) {
      console.error('Error approving coach:', error);
      toast.error(error.message || 'Failed to approve coach');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (coachId: string) => {
    setProcessingId(coachId);
    try {
      // Reset the profile to non-coach status
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          custom_guru: null,
          guru_expertise: null,
          is_verified_coach: false,
        })
        .eq('id', coachId);

      if (profileError) throw profileError;

      // Delete all cancelled coaching listings
      const { error: listingsError } = await supabase
        .from('listings')
        .delete()
        .eq('seller_id', coachId)
        .eq('category', 'coaching')
        .eq('status', 'cancelled');

      if (listingsError) throw listingsError;

      // Send notification to the user
      await supabase.from('notifications').insert({
        user_id: coachId,
        type: 'system',
        title: 'Coach Application Update',
        body: 'Your coaching application was not approved at this time. Please ensure you meet our requirements and try again.',
      });

      toast.success('Coach application rejected');
      fetchPendingCoaches();
    } catch (error: any) {
      console.error('Error rejecting coach:', error);
      toast.error(error.message || 'Failed to reject application');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredCoaches = coaches.filter(coach =>
    coach.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coach.bio?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-gold" />
            Coach Verification Queue
          </h2>
          <p className="text-muted-foreground">
            Review and approve gaming coach applications
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPendingCoaches}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search coaches..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredCoaches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No pending coach applications</p>
            <p className="text-sm text-muted-foreground">All caught up!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredCoaches.map((coach) => (
            <Card key={coach.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={coach.avatar_url || ''} />
                    <AvatarFallback>
                      <User className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg truncate">
                        {coach.display_name || 'Unnamed Coach'}
                      </h3>
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                        Pending Review
                      </Badge>
                    </div>
                    
                    {coach.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {coach.bio}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {coach.guru_expertise?.map((game) => (
                        <Badge key={game} variant="secondary" className="capitalize">
                          {game}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Applied {format(new Date(coach.created_at), 'MMM d, yyyy')}
                      </span>
                      <span className="font-mono text-[10px]">{coach.id.slice(0, 8)}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(coach.id)}
                      disabled={processingId === coach.id}
                      className="text-destructive hover:text-destructive"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(coach.id)}
                      disabled={processingId === coach.id}
                      className="bg-gain hover:bg-gain/90"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
