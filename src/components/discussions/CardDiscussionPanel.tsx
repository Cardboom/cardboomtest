import { useState } from 'react';
import { MessageSquare, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Lock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useCardDiscussion, useDiscussionComments, usePostComment, useUserEligibility } from '@/hooks/useDiscussions';
import { DiscussionComment } from './DiscussionComment';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CardDiscussionPanelProps {
  marketItemId: string;
  itemName: string;
  currentPrice: number;
}

export const CardDiscussionPanel = ({ marketItemId, itemName, currentPrice }: CardDiscussionPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [stance, setStance] = useState<'buy' | 'hold' | 'sell' | undefined>();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const { data: discussion, isLoading: loadingDiscussion } = useCardDiscussion(marketItemId);
  const { data: comments = [], isLoading: loadingComments } = useDiscussionComments(discussion?.id);
  const { data: eligibility } = useUserEligibility();
  const postMutation = usePostComment();

  const handlePost = () => {
    if (!discussion || !newComment.trim() || newComment.length < 10) return;
    
    postMutation.mutate({
      discussionId: discussion.id,
      content: newComment,
      stance: replyingTo ? undefined : stance,
      parentId: replyingTo || undefined,
      priceAtPost: currentPrice,
    }, {
      onSuccess: () => {
        setNewComment('');
        setStance(undefined);
        setReplyingTo(null);
      }
    });
  };

  // Calculate sentiment distribution
  const sentimentCounts = comments.reduce((acc, c) => {
    if (c.stance === 'buy') acc.buy++;
    else if (c.stance === 'sell') acc.sell++;
    else if (c.stance === 'hold') acc.hold++;
    return acc;
  }, { buy: 0, sell: 0, hold: 0 });

  const totalWithStance = sentimentCounts.buy + sentimentCounts.sell + sentimentCounts.hold;

  return (
    <div className="glass rounded-xl overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-foreground">Market Discussion</h3>
                <p className="text-sm text-muted-foreground">
                  {discussion?.comment_count || 0} comments · 
                  {totalWithStance > 0 && (
                    <span className="ml-1">
                      {Math.round((sentimentCounts.buy / totalWithStance) * 100)}% bullish
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Mini sentiment bar */}
              {totalWithStance > 0 && (
                <div className="hidden sm:flex items-center gap-1 h-2 w-24 rounded-full overflow-hidden bg-muted">
                  <div 
                    className="h-full bg-gain" 
                    style={{ width: `${(sentimentCounts.buy / totalWithStance) * 100}%` }} 
                  />
                  <div 
                    className="h-full bg-muted-foreground/30" 
                    style={{ width: `${(sentimentCounts.hold / totalWithStance) * 100}%` }} 
                  />
                  <div 
                    className="h-full bg-loss" 
                    style={{ width: `${(sentimentCounts.sell / totalWithStance) * 100}%` }} 
                  />
                </div>
              )}
              
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border/30">
            {/* Info banner */}
            <div className="p-3 bg-primary/5 border-b border-border/30 flex items-start gap-2">
              <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Share your analysis on {itemName}. Reactions are based on quality, not popularity.
                Comments are sorted by relevance and historical accuracy.
              </p>
            </div>

            {/* Comment input */}
            <div className="p-4 border-b border-border/30">
              {eligibility?.eligible ? (
                <div className="space-y-3">
                  {!replyingTo && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Your stance:</span>
                      <ToggleGroup 
                        type="single" 
                        value={stance} 
                        onValueChange={(v) => setStance(v as typeof stance)}
                        className="gap-1"
                      >
                        <ToggleGroupItem 
                          value="buy" 
                          size="sm"
                          className={cn(
                            "h-7 px-2 gap-1 text-xs",
                            stance === 'buy' && "bg-gain/20 text-gain border-gain/30"
                          )}
                        >
                          <TrendingUp className="w-3 h-3" />
                          Buy
                        </ToggleGroupItem>
                        <ToggleGroupItem 
                          value="hold" 
                          size="sm"
                          className={cn(
                            "h-7 px-2 gap-1 text-xs",
                            stance === 'hold' && "bg-muted text-foreground"
                          )}
                        >
                          <Minus className="w-3 h-3" />
                          Hold
                        </ToggleGroupItem>
                        <ToggleGroupItem 
                          value="sell" 
                          size="sm"
                          className={cn(
                            "h-7 px-2 gap-1 text-xs",
                            stance === 'sell' && "bg-loss/20 text-loss border-loss/30"
                          )}
                        >
                          <TrendingDown className="w-3 h-3" />
                          Sell
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                  )}
                  
                  {replyingTo && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Replying to comment...</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setReplyingTo(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                  
                  <Textarea
                    placeholder={replyingTo ? "Write your reply..." : "Share your analysis..."}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                  
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-xs",
                      newComment.length < 10 ? "text-muted-foreground" : "text-green-500"
                    )}>
                      {newComment.length}/10 min characters
                    </span>
                    <Button
                      size="sm"
                      onClick={handlePost}
                      disabled={newComment.length < 10 || postMutation.isPending}
                    >
                      {postMutation.isPending ? 'Posting...' : 'Post'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Commenting requires activity</p>
                    <p className="text-xs text-muted-foreground">
                      {eligibility?.reason === 'not_logged_in' 
                        ? 'Please sign in to participate'
                        : 'Build your account history by trading, listing, or tracking items'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Comments list */}
            <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
              {loadingComments ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-20 bg-muted/50 rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground">No comments yet</p>
                  <p className="text-sm text-muted-foreground/70">Be the first to share your analysis</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <DiscussionComment
                    key={comment.id}
                    comment={comment}
                    discussionId={discussion?.id || ''}
                    currentPrice={currentPrice}
                    onReply={(parentId) => setReplyingTo(parentId)}
                  />
                ))
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
