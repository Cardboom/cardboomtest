import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Target, Gift, Clock, ChevronRight, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
      setBounties(bountiesData || []);

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
        p_bounty_id: bountyId
      });

      if (error) throw error;

      const result = data as { success?: boolean; gems_awarded?: number; error?: string } | null;
      
      if (result?.success) {
        toast.success(`🎉 Claimed ${((result.gems_awarded || 0) / 100).toFixed(0)} gems!`);
        fetchBounties();
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
      <div className="h-[100px] md:h-[140px] rounded-[18px] bg-[#0a0f1a] animate-pulse" />
    );
  }

  if (bounties.length === 0) return null;

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

      {/* Accent line */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-500 via-amber-500/50 to-transparent" />

      {/* Header with explanation */}
      <div className="absolute top-2 left-3 flex items-center gap-3 z-10">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center">
            <Target className="w-3 h-3 text-amber-400" />
          </div>
          <span className="font-mono text-[9px] text-amber-400 uppercase tracking-widest font-bold">
            BOOM CHALLENGES
          </span>
        </div>
        <span className="hidden md:inline text-[8px] text-gray-500 font-mono">
          Complete tasks, earn gems. First come, first served!
        </span>
      </div>

      {/* View all button */}
      <button
        onClick={() => navigate('/rewards')}
        className="absolute top-2 right-3 flex items-center gap-0.5 text-[8px] text-gray-500 hover:text-gray-300 transition-colors font-mono"
      >
        ALL <ChevronRight className="w-2.5 h-2.5" />
      </button>

      {/* Bounties grid - full width */}
      <div className="absolute inset-x-0 top-10 bottom-2 px-3 overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 h-full">
          {bounties.slice(0, 6).map((bounty) => {
            const prog = progress[bounty.id];
            const currentCount = prog?.current_count || 0;
            const percentage = Math.min((currentCount / bounty.target_count) * 100, 100);
            const isCompleted = prog?.is_completed;
            const isClaimed = prog?.reward_claimed;

            return (
              <div
                key={bounty.id}
                className={cn(
                  "rounded-lg p-2 flex flex-col justify-between",
                  "bg-white/[0.03] border border-white/5",
                  "hover:bg-white/[0.05] transition-colors",
                  bounty.is_featured && "border-amber-500/30 bg-amber-500/5"
                )}
              >
                <div>
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-base">{bounty.icon}</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-2 h-2 text-gray-500" />
                      <span className="text-[7px] text-gray-500 font-mono">
                        {formatTimeLeft(bounty.ends_at)}
                      </span>
                    </div>
                  </div>
                  <p className="text-[9px] text-white/80 leading-tight line-clamp-2 font-mono">
                    {bounty.title}
                  </p>
                </div>

                <div className="mt-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[7px] text-gray-500 font-mono">
                      {currentCount}/{bounty.target_count}
                    </span>
                    <span className="text-[8px] text-amber-400 font-bold font-mono">
                      ${(bounty.reward_gems / 100).toFixed(0)}
                    </span>
                  </div>
                  
                  {isCompleted && !isClaimed ? (
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
                    <div className="w-full h-5 flex items-center justify-center gap-1 text-[8px] text-emerald-400 font-mono">
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
      </div>
    </div>
  );
};