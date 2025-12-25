import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Send, CornerDownRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useReelComments, ReelComment } from '@/hooks/useReels';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface CommentsDrawerProps {
  reelId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CommentsDrawer({ reelId, isOpen, onClose }: CommentsDrawerProps) {
  const { t } = useLanguage();
  const { comments, loading, addComment, likeComment, deleteComment } = useReelComments(reelId);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user
  useState(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    const success = await addComment(newComment.trim(), replyingTo || undefined);
    if (success) {
      setNewComment('');
      setReplyingTo(null);
    }
    setSubmitting(false);
  };

  const formatTime = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: false });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl max-h-[70vh] flex flex-col"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b">
              <h3 className="text-lg font-bold">{t.reels?.comments || 'Comments'}</h3>
              <span className="text-sm text-muted-foreground">{comments.length}</span>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Comments list */}
            <ScrollArea className="flex-1 px-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-muted-foreground">{t.reels?.noComments || 'No comments yet'}</p>
                  <p className="text-sm text-muted-foreground/70">{t.reels?.beFirst || 'Be the first to comment!'}</p>
                </div>
              ) : (
                <div className="py-4 space-y-4">
                  {comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      currentUserId={currentUserId}
                      onLike={likeComment}
                      onReply={(id) => setReplyingTo(id)}
                      onDelete={deleteComment}
                      formatTime={formatTime}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Reply indicator */}
            <AnimatePresence>
              {replyingTo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 py-2 bg-muted/50 border-t flex items-center justify-between"
                >
                  <span className="text-sm text-muted-foreground">
                    {t.reels?.replyingTo || 'Replying to comment'}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>
                    {t.common?.cancel || 'Cancel'}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t flex items-center gap-3">
              <Input
                placeholder={t.reels?.addComment || 'Add a comment...'}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1"
                disabled={submitting}
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!newComment.trim() || submitting}
                className="shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface CommentItemProps {
  comment: ReelComment;
  currentUserId: string | null;
  onLike: (id: string) => void;
  onReply: (id: string) => void;
  onDelete: (id: string) => void;
  formatTime: (date: string) => string;
  isReply?: boolean;
}

function CommentItem({ comment, currentUserId, onLike, onReply, onDelete, formatTime, isReply }: CommentItemProps) {
  const { t } = useLanguage();

  return (
    <div className={cn("flex gap-3", isReply && "ml-10")}>
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarImage src={comment.user?.avatar_url || undefined} />
        <AvatarFallback className="text-xs">
          {comment.user?.username?.[0]?.toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">@{comment.user?.username || 'user'}</span>
          <span className="text-xs text-muted-foreground">{formatTime(comment.created_at)}</span>
          {comment.is_pinned && (
            <span className="text-xs text-primary font-medium">{t.reels?.pinned || 'Pinned'}</span>
          )}
        </div>
        
        <p className="text-sm mt-1 break-words">{comment.content}</p>
        
        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={() => onLike(comment.id)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Heart 
              className={cn(
                "w-4 h-4",
                comment.is_liked && "text-red-500 fill-red-500"
              )} 
            />
            {comment.like_count > 0 && comment.like_count}
          </button>
          
          {!isReply && (
            <button
              onClick={() => onReply(comment.id)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <CornerDownRight className="w-4 h-4" />
              {t.reels?.reply || 'Reply'}
            </button>
          )}

          {currentUserId === comment.user_id && (
            <button
              onClick={() => onDelete(comment.id)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                onLike={onLike}
                onReply={onReply}
                onDelete={onDelete}
                formatTime={formatTime}
                isReply
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
