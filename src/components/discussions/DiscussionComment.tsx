import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Lightbulb, Clock, AlertTriangle, MessageSquare, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DiscussionComment as CommentType, useReactToComment, ReactionType } from '@/hooks/useDiscussions';
import { Badge } from '@/components/ui/badge';

interface DiscussionCommentProps {
  comment: CommentType;
  discussionId: string;
  currentPrice?: number;
  onReply?: (parentId: string) => void;
  isReply?: boolean;
}

export const DiscussionComment = ({ 
  comment, 
  discussionId, 
  currentPrice,
  onReply,
  isReply = false 
}: DiscussionCommentProps) => {
  const [showReplies, setShowReplies] = useState(false);
  const reactMutation = useReactToComment();

  const handleReact = (type: ReactionType) => {
    reactMutation.mutate({
      commentId: comment.id,
      reactionType: type,
      discussionId,
    });
  };

  // Calculate if prediction aged well
  const priceChange = comment.price_at_post && currentPrice 
    ? ((currentPrice - comment.price_at_post) / comment.price_at_post) * 100
    : null;

  const predictionAgedWell = comment.stance && priceChange !== null && (
    (comment.stance === 'buy' && priceChange > 5) ||
    (comment.stance === 'sell' && priceChange < -5) ||
    (comment.stance === 'hold' && Math.abs(priceChange) < 10)
  );

  const stanceIcons = {
    buy: <TrendingUp className="w-3 h-3" />,
    sell: <TrendingDown className="w-3 h-3" />,
    hold: <Minus className="w-3 h-3" />,
  };

  const stanceColors = {
    buy: 'bg-gain/20 text-gain border-gain/30',
    sell: 'bg-loss/20 text-loss border-loss/30',
    hold: 'bg-muted text-muted-foreground border-border',
  };

  const tierColors: Record<string, string> = {
    diamond: 'text-cyan-400',
    platinum: 'text-purple-400',
    gold: 'text-amber-400',
    silver: 'text-slate-300',
    bronze: 'text-orange-400',
  };

  if (comment.is_collapsed) {
    return (
      <div className="p-3 rounded-lg bg-muted/30 border border-border/30 opacity-60">
        <p className="text-xs text-muted-foreground italic">
          Comment collapsed: {comment.collapse_reason === 'contradicted_by_market' 
            ? 'Contradicted by market data' 
            : comment.collapse_reason}
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-lg border",
      isReply ? "bg-secondary/20 border-border/20 ml-8" : "bg-secondary/30 border-border/30"
    )}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            {comment.profile?.avatar_url ? (
              <img 
                src={comment.profile.avatar_url} 
                alt="" 
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {comment.profile?.display_name || 'Anonymous'}
                </span>
                {comment.profile?.reputation_tier && (
                  <span className={cn(
                    "text-xs capitalize",
                    tierColors[comment.profile.reputation_tier] || 'text-muted-foreground'
                  )}>
                    {comment.profile.reputation_tier}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>

          {/* Stance badge */}
          {comment.stance && (
            <Badge variant="outline" className={cn(
              "flex items-center gap-1 text-xs",
              stanceColors[comment.stance]
            )}>
              {stanceIcons[comment.stance]}
              <span className="uppercase">{comment.stance}</span>
            </Badge>
          )}
        </div>

        {/* Content */}
        <p className="text-sm text-foreground leading-relaxed mb-3">
          {comment.content}
        </p>

        {/* Prediction outcome */}
        {priceChange !== null && comment.stance && (
          <div className={cn(
            "text-xs px-2 py-1 rounded mb-3 inline-flex items-center gap-1",
            predictionAgedWell 
              ? "bg-gain/10 text-gain" 
              : Math.abs(priceChange) > 5 
                ? "bg-loss/10 text-loss"
                : "bg-muted text-muted-foreground"
          )}>
            {predictionAgedWell ? '✓ This take aged well' : 
              Math.abs(priceChange) > 5 ? '⚠ Market moved differently' : 
              'Market stable since post'}
            <span className="opacity-70">
              ({priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}%)
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 text-xs gap-1",
              comment.insightful_count > 0 && "text-primary"
            )}
            onClick={() => handleReact('insightful')}
          >
            <Lightbulb className="w-3 h-3" />
            Insightful
            {comment.insightful_count > 0 && (
              <span className="text-primary font-medium">{comment.insightful_count}</span>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 text-xs gap-1",
              comment.outdated_count > 0 && "text-amber-500"
            )}
            onClick={() => handleReact('outdated')}
          >
            <Clock className="w-3 h-3" />
            Outdated
            {comment.outdated_count > 0 && (
              <span className="text-amber-500 font-medium">{comment.outdated_count}</span>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 text-xs gap-1",
              comment.contradicted_count > 0 && "text-loss"
            )}
            onClick={() => handleReact('contradicted')}
          >
            <AlertTriangle className="w-3 h-3" />
            Contradicted
            {comment.contradicted_count > 0 && (
              <span className="text-loss font-medium">{comment.contradicted_count}</span>
            )}
          </Button>

          {!isReply && onReply && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => onReply(comment.id)}
            >
              <MessageSquare className="w-3 h-3" />
              Reply
            </Button>
          )}
        </div>
      </div>

      {/* Replies */}
      {!isReply && comment.replies && comment.replies.length > 0 && (
        <div className="border-t border-border/30">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-8 text-xs text-muted-foreground"
            onClick={() => setShowReplies(!showReplies)}
          >
            {showReplies ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
            {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
          </Button>
          
          {showReplies && (
            <div className="p-3 space-y-2">
              {comment.replies.map((reply) => (
                <DiscussionComment
                  key={reply.id}
                  comment={reply}
                  discussionId={discussionId}
                  currentPrice={currentPrice}
                  isReply
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
