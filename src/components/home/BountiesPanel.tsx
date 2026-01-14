import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Target, Gift, Clock, ChevronRight, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface Bounty {
  id: string;
  title: string;
  description: string;
  bounty_type: string;
  target_count: number;
  reward_gems: number;
  period_type: string;
  ends_at: string;
  icon: string;
  is_featured: boolean;
  max_claims: number;
  total_claimed: number;
  claimed_by_user_id: string | null;
  claimed_by_name?: string;
}

interface BountyProgress {
  bounty_id: string;
  current_count: number;
  is_completed: boolean;
  reward_claimed: boolean;
}

interface BountiesPanelProps {
  userId: string;
}

export const BountiesPanel = ({ userId }: BountiesPanelProps) => {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [progress, setProgress] = useState<Record<string, BountyProgress>>({});
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBounties();
  }, [userId]);

  const fetchBounties = async () => {
    try {
      // Fetch active bounties
      const { data: bountiesData, error: bountiesError } = await supabase
        .from('bounties')
        .select('*')
        .eq('is_active', true)
        .gt('ends_at', new Date().toISOString())
        .order('is_featured', { ascending: false })
        .order('ends_at', { ascending: true })
        .limit(6);

      if (bountiesError) throw bountiesError;
      
      // Fetch claimer names for exhausted bounties
      const claimerIds = (bountiesData || [])
        .filter(b => b.claimed_by_user_id)
        .map(b => b.claimed_by_user_id);
      
      let claimerNames: Record<string, string> = {};
      if (claimerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', claimerIds);
        
        profiles?.forEach(p => {
          claimerNames[p.id] = p.display_name || 'User';
        });
      }
      
      // Map claimer name to bounty
      const bountiesWithClaimer = (bountiesData || []).map(b => ({
        ...b,
        claimed_by_name: b.claimed_by_user_id ? claimerNames[b.claimed_by_user_id] : null
      }));
      setBounties(bountiesWithClaimer);

      // Fetch user progress
      if (bountiesData && bountiesData.length > 0) {
        const { data: progressData } = await supabase
          .from('bounty_progress')
          .select('bounty_id, current_count, is_completed, reward_claimed')
          .eq('user_id', userId)
          .in('bounty_id', bountiesData.map(b => b.id));

        const progressMap: Record<string, BountyProgress> = {};
        progressData?.forEach(p => {
          progressMap[p.bounty_id] = p;
        });
        setProgress(progressMap);
      }
    } catch (error) {
      console.error('Error fetching bounties:', error);
    } finally {
      setLoading(false);
    }
  };

  const claimReward = async (bountyId: string) => {
    setClaiming(bountyId);
    try {
      const { data, error } = await supabase.rpc('claim_bounty_reward', {
        p_bounty_id: bountyId,
        p_user_id: userId
      });

      if (error) throw error;

      const result = data as { success?: boolean; gems_awarded?: number; error?: string } | null;
      
      if (result?.success) {
        toast.success(`🎉 Claimed ${((result.gems_awarded || 0) / 100).toFixed(0)} gems!`);
        fetchBounties();
        
        // Dispatch event to refresh gems balance in header
        window.dispatchEvent(new CustomEvent('gems-balance-updated'));
      } else {
        toast.error(result?.error || 'Failed to claim reward');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to claim reward');
    } finally {
      setClaiming(null);
    }
  };

  const formatTimeLeft = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'grading_count': return 'Grade cards';
      case 'referral_grading': return 'Referral gradings';
      case 'referral_sales': return 'Referral sales';
      case 'sale_count': return 'Sell cards';
      case 'sale_commission': return 'Commission cashback';
      case 'listing_count': return 'List cards';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="h-[140px] md:h-[180px] rounded-[18px] bg-card/50 animate-pulse" />
    );
  }

  if (bounties.length === 0) {
    return (
      <div 
        className={cn(
          "relative overflow-hidden rounded-[18px]",
          "bg-gradient-to-br from-[#0a0f1a] via-[#0d1321] to-[#101820]",
          "border border-white/5",
          "h-[140px] md:h-[180px]",
          "shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_40px_rgba(0,0,0,0.3)]"
        )}
        style={{ backdropFilter: 'blur(22px)' }}
      >
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary via-primary/50 to-transparent" />
        <div className="absolute top-2 left-3 flex items-center gap-1.5">
          <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
            <Target className="w-3 h-3 text-primary" />
          </div>
          <span className="font-sans text-[11px] md:text-xs text-primary uppercase tracking-widest font-bold">
            BOOM CHALLENGES
          </span>
        </div>
        <div className="h-full flex flex-col items-center justify-center text-center pt-4">
          <Target className="w-8 h-8 text-gray-600 mb-2" />
          <p className="text-xs text-gray-500 font-medium">No active challenges</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-[18px]",
        "bg-gradient-to-br from-[#0a0f1a] via-[#0d1321] to-[#101820]",
        "border border-white/5",
        "h-[140px] md:h-[180px]",
        "shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_40px_rgba(0,0,0,0.3)]"
      )}
      style={{ backdropFilter: 'blur(22px)' }}
    >
      {/* Noise texture */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Accent line - Tiffany brand color */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary via-primary/50 to-transparent" />

      {/* Header with explanation - Tiffany branding */}
      <div className="absolute top-2 left-3 right-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
            <Target className="w-2.5 h-2.5 text-primary" />
          </div>
          <span className="font-sans text-[10px] md:text-[11px] text-primary uppercase tracking-widest font-bold">
            BOOM CHALLENGES
          </span>
        </div>
        <span className="hidden md:inline text-[9px] text-gray-500 font-sans font-medium">
          First come, first served!
        </span>
      </div>


      {/* Bounties horizontal scroll */}
      <div className="absolute inset-x-0 top-10 bottom-2 px-3">
        <ScrollArea className="h-full w-full">
          <div className="flex gap-2 pb-2">
            {bounties.slice(0, 6).map((bounty) => {
              const prog = progress[bounty.id];
              const currentCount = prog?.current_count || 0;
              const percentage = Math.min((currentCount / bounty.target_count) * 100, 100);
              const isCompleted = prog?.is_completed;
              const isClaimed = prog?.reward_claimed;
              const maxClaims = bounty.max_claims || 1;
              const totalClaimed = bounty.total_claimed || 0;
              const isGloballyExhausted = totalClaimed >= maxClaims && !isClaimed;

              return (
                <div
                  key={bounty.id}
                  className={cn(
                    "flex-shrink-0 w-[140px] md:w-[160px] rounded-lg p-2 flex flex-col justify-between",
                    "bg-white/[0.03] border border-white/5",
                    "hover:bg-white/[0.05] transition-colors",
                    bounty.is_featured && "border-amber-500/30 bg-amber-500/5",
                    isGloballyExhausted && "opacity-50"
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-base">{bounty.icon}</span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-2 h-2 text-gray-500" />
                        <span className="text-[8px] text-gray-500 font-sans font-medium">
                          {formatTimeLeft(bounty.ends_at)}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] md:text-xs text-white/80 leading-tight line-clamp-2 font-sans font-bold">
                      {bounty.title}
                    </p>
                  </div>

                  <div className="mt-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] md:text-[10px] text-gray-500 font-sans font-medium">
                        {currentCount}/{bounty.target_count}
                      </span>
                      <span className="text-[10px] md:text-[11px] text-amber-400 font-bold font-sans">
                        ${(bounty.reward_gems / 100).toFixed(0)}
                      </span>
                    </div>
                    
                    {isGloballyExhausted ? (
                      <div className="w-full h-5 flex flex-col items-center justify-center text-[8px] text-gray-500 font-sans">
                        <div className="flex items-center gap-1 font-bold">
                          <Check className="w-2.5 h-2.5" />
                          TAKEN
                        </div>
                        {bounty.claimed_by_name && (
                          <span className="text-[7px] text-gray-600 truncate max-w-full">
                            by {bounty.claimed_by_name}
                          </span>
                        )}
                      </div>
                    ) : isCompleted && !isClaimed ? (
                      <Button
                        size="sm"
                        onClick={() => claimReward(bounty.id)}
                        disabled={claiming === bounty.id}
                        className="w-full h-5 text-[8px] bg-amber-500 hover:bg-amber-600 text-black font-bold"
                      >
                        {claiming === bounty.id ? (
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        ) : (
                          <>
                            <Gift className="w-2.5 h-2.5 mr-1" />
                            CLAIM
                          </>
                        )}
                      </Button>
                    ) : isClaimed ? (
                      <div className="w-full h-5 flex items-center justify-center gap-1 text-[9px] text-emerald-400 font-sans font-bold">
                        <Check className="w-2.5 h-2.5" />
                        CLAIMED
                      </div>
                    ) : (
                      <Progress value={percentage} className="h-1.5" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
};