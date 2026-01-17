import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type DiscussionType = 'card' | 'event' | 'strategy';
export type ReactionType = 'insightful' | 'outdated' | 'contradicted';

export interface Discussion {
  id: string;
  type: DiscussionType;
  title: string;
  description: string | null;
  market_item_id: string | null;
  event_type: string | null;
  price_at_creation: number | null;
  is_admin_created: boolean;
  is_active: boolean;
  comment_count: number;
  sentiment_score: number;
  created_at: string;
}

export interface DiscussionComment {
  id: string;
  discussion_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  stance: 'buy' | 'hold' | 'sell' | null;
  is_collapsed: boolean;
  collapse_reason: string | null;
  accuracy_score: number | null;
  relevance_score: number;
  insightful_count: number;
  outdated_count: number;
  contradicted_count: number;
  price_at_post: number | null;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    reputation_score: number | null;
    reputation_tier: string | null;
  };
  replies?: DiscussionComment[];
}

export function useCardDiscussion(marketItemId: string | undefined) {
  return useQuery({
    queryKey: ['card-discussion', marketItemId],
    queryFn: async () => {
      if (!marketItemId) return null;
      
      // Try to find existing discussion for this card
      const { data: existing } = await supabase
        .from('discussions')
        .select('*')
        .eq('market_item_id', marketItemId)
        .eq('type', 'card')
        .eq('is_active', true)
        .single();
      
      if (existing) return existing as Discussion;
      
      // Auto-create a card discussion if it doesn't exist
      const { data: marketItem } = await supabase
        .from('market_items')
        .select('name, current_price')
        .eq('id', marketItemId)
        .single();
      
      if (!marketItem) return null;
      
      const { data: newDiscussion, error } = await supabase
        .from('discussions')
        .insert({
          type: 'card',
          title: `Discussion: ${marketItem.name}`,
          market_item_id: marketItemId,
          price_at_creation: marketItem.current_price,
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating discussion:', error);
        return null;
      }
      
      return newDiscussion as Discussion;
    },
    enabled: !!marketItemId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDiscussionComments(discussionId: string | undefined) {
  return useQuery({
    queryKey: ['discussion-comments', discussionId],
    queryFn: async () => {
      if (!discussionId) return [];
      
      const { data, error } = await supabase
        .from('discussion_comments')
        .select('*')
        .eq('discussion_id', discussionId)
        .is('parent_id', null)
        .order('relevance_score', { ascending: false })
        .order('insightful_count', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error('Error fetching comments:', error);
        return [];
      }
      
      // Fetch profiles for all comment authors
      const userIds = [...new Set((data || []).map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, reputation_score, reputation_tier')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      // Fetch replies for each comment
      const commentsWithReplies = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: replies } = await supabase
            .from('discussion_comments')
            .select('*')
            .eq('parent_id', comment.id)
            .order('created_at', { ascending: true })
            .limit(10);
          
          // Get profiles for reply authors
          const replyUserIds = [...new Set((replies || []).map(r => r.user_id))];
          const { data: replyProfiles } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url, reputation_score, reputation_tier')
            .in('id', replyUserIds);
          
          const replyProfileMap = new Map(replyProfiles?.map(p => [p.id, p]) || []);
          
          return {
            ...comment,
            profile: profileMap.get(comment.user_id),
            replies: (replies || []).map(r => ({
              ...r,
              profile: replyProfileMap.get(r.user_id),
            })),
          };
        })
      );
      
      return commentsWithReplies as DiscussionComment[];
    },
    enabled: !!discussionId,
    staleTime: 30 * 1000,
  });
}

export function usePostComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      discussionId,
      content,
      stance,
      parentId,
      priceAtPost,
    }: {
      discussionId: string;
      content: string;
      stance?: 'buy' | 'hold' | 'sell';
      parentId?: string;
      priceAtPost?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in to comment');
      
      const { data, error } = await supabase
        .from('discussion_comments')
        .insert({
          discussion_id: discussionId,
          user_id: user.id,
          content,
          stance,
          parent_id: parentId,
          price_at_post: priceAtPost,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['discussion-comments', variables.discussionId] });
      queryClient.invalidateQueries({ queryKey: ['card-discussion'] });
      toast.success('Comment posted');
    },
    onError: (error: Error) => {
      console.error('Comment error:', error);
      if (error.message.includes('length')) {
        toast.error('Comment must be at least 10 characters');
      } else {
        toast.error('Failed to post comment');
      }
    },
  });
}

export function useReactToComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      commentId,
      reactionType,
      discussionId,
    }: {
      commentId: string;
      reactionType: ReactionType;
      discussionId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in to react');
      
      // Check if user already reacted
      const { data: existing } = await supabase
        .from('discussion_reactions')
        .select('id, reaction_type')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .single();
      
      if (existing) {
        if (existing.reaction_type === reactionType) {
          // Remove reaction
          await supabase
            .from('discussion_reactions')
            .delete()
            .eq('id', existing.id);
          return { removed: true };
        } else {
          // Update reaction
          await supabase
            .from('discussion_reactions')
            .delete()
            .eq('id', existing.id);
        }
      }
      
      // Add new reaction
      const { error } = await supabase
        .from('discussion_reactions')
        .insert({
          comment_id: commentId,
          user_id: user.id,
          reaction_type: reactionType,
        });
      
      if (error) throw error;
      return { added: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['discussion-comments', variables.discussionId] });
    },
  });
}

export function useUserEligibility() {
  return useQuery({
    queryKey: ['user-discussion-eligibility'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { eligible: false, reason: 'not_logged_in' };
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at, reputation_score')
        .eq('id', user.id)
        .single();
      
      if (!profile) return { eligible: false, reason: 'no_profile' };
      
      const accountAge = Date.now() - new Date(profile.created_at).getTime();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      
      if (accountAge > sevenDays) {
        return { eligible: true, reason: 'account_age' };
      }
      
      if (profile.reputation_score && profile.reputation_score > 0) {
        return { eligible: true, reason: 'reputation' };
      }
      
      // Check for activity
      const [orders, listings, portfolio] = await Promise.all([
        supabase.from('orders').select('id').or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`).limit(1),
        supabase.from('listings').select('id').eq('seller_id', user.id).limit(1),
        supabase.from('portfolio_items').select('id').eq('user_id', user.id).limit(1),
      ]);
      
      if (orders.data?.length || listings.data?.length || portfolio.data?.length) {
        return { eligible: true, reason: 'activity' };
      }
      
      return { eligible: false, reason: 'no_activity' };
    },
    staleTime: 5 * 60 * 1000,
  });
}
