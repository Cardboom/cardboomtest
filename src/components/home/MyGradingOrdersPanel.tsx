import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Award, ChevronRight, Clock, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface GradingOrder {
  id: string;
  card_name: string | null;
  category: string;
  status: string;
  cbgi_score_0_100: number | null;
  grade_label: string | null;
  front_image_url: string | null;
  created_at: string;
  estimated_completion_at: string | null;
}

interface MyGradingOrdersPanelProps {
  userId: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pending', color: 'text-amber-400', icon: Clock },
  queued: { label: 'Queued', color: 'text-blue-400', icon: Clock },
  processing: { label: 'Processing', color: 'text-cyan-400', icon: Loader2 },
  in_review: { label: 'In Review', color: 'text-purple-400', icon: Loader2 },
  completed: { label: 'Completed', color: 'text-emerald-400', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'text-red-400', icon: AlertCircle },
};

export const MyGradingOrdersPanel = ({ userId }: MyGradingOrdersPanelProps) => {
  const [orders, setOrders] = useState<GradingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, [userId]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('grading_orders')
        .select('id, card_name, category, status, cbgi_score_0_100, grade_label, front_image_url, created_at, estimated_completion_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching grading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatScore = (score: number | null) => {
    if (!score) return null;
    const normalized = score > 10 ? score / 10 : score;
    return normalized.toFixed(1);
  };

  if (loading) {
    return (
      <div className="h-[140px] md:h-[180px] rounded-[18px] bg-card/50 animate-pulse" />
    );
  }

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-[18px]",
        "bg-[#f5f5f7] dark:bg-gradient-to-br dark:from-[#0a0f1a] dark:via-[#0d1321] dark:to-[#101820]",
        "border border-black/[0.04] dark:border-white/5",
        "h-[140px] md:h-[180px]",
        "shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_40px_rgba(0,0,0,0.3)]"
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
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary via-primary/50 to-transparent" />

      {/* Header */}
      <div className="absolute top-2 left-3 right-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
            <Award className="w-2.5 h-2.5 text-primary" />
          </div>
          <span className="font-sans text-[10px] md:text-[11px] text-primary uppercase tracking-widest font-bold">
            MY GRADINGS
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/grading')}
            className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[9px] font-bold hover:bg-primary/30 transition-colors"
          >
            Grade Now
          </button>
          <button
            onClick={() => navigate('/grading/orders')}
            className="flex items-center gap-0.5 text-[9px] text-gray-500 hover:text-gray-300 transition-colors font-sans font-bold"
          >
            ALL <ChevronRight className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* Orders list */}
      <div className="absolute inset-x-0 top-10 bottom-2 px-3">
        {orders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <Award className="w-8 h-8 text-gray-600 mb-2" />
            <p className="text-xs text-gray-500 font-medium">No grading orders yet</p>
            <button
              onClick={() => navigate('/grading')}
              className="mt-2 text-[10px] text-primary hover:underline font-bold"
            >
              Grade your first card →
            </button>
          </div>
        ) : (
          <ScrollArea className="h-full w-full">
            <div className="flex gap-2 pb-2">
              {orders.map((order) => {
                const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                const StatusIcon = config.icon;
                const score = formatScore(order.cbgi_score_0_100);

                return (
                  <div
                    key={order.id}
                    onClick={() => navigate(`/grading/orders/${order.id}`)}
                    className={cn(
                      "flex-shrink-0 w-[120px] md:w-[140px] rounded-lg p-2 cursor-pointer",
                      "bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/5",
                      "hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors"
                    )}
                  >
                    {/* Card image */}
                    <div className="w-full h-14 md:h-16 rounded-md overflow-hidden bg-black/30 mb-1.5">
                      {order.front_image_url ? (
                        <img 
                          src={order.front_image_url} 
                          alt={order.card_name || 'Card'} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Award className="w-5 h-5 text-gray-600" />
                        </div>
                      )}
                    </div>

                    {/* Card name */}
                    <p className="text-[10px] md:text-[11px] text-foreground/80 font-bold truncate mb-1">
                      {order.card_name || 'Card'}
                    </p>

                    {/* Status / Score */}
                    {order.status === 'completed' && score ? (
                      <Badge className="bg-primary/20 text-primary text-[9px] font-bold gap-1 w-full justify-center">
                        <Award className="w-2.5 h-2.5" />
                        CB {score}
                      </Badge>
                    ) : (
                      <div className={cn("flex items-center gap-1 text-[9px]", config.color)}>
                        <StatusIcon className={cn("w-2.5 h-2.5", order.status === 'processing' || order.status === 'in_review' ? 'animate-spin' : '')} />
                        <span className="font-bold">{config.label}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </div>
    </div>
  );
};
