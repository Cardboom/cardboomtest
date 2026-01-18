import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DiscussionSubscription {
  id: string;
  user_id: string;
  discussion_id: string;
  notify_on_reply: boolean;
  notify_on_mention: boolean;
  created_at: string;
}

export const useDiscussionSubscriptions = (discussionId?: string) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<DiscussionSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!discussionId) {
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('discussion_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('discussion_id', discussionId)
        .maybeSingle();

      if (error) throw error;
      
      setSubscription(data);
      setIsSubscribed(!!data);
    } catch (err) {
      console.error('Error fetching subscription:', err);
    } finally {
      setLoading(false);
    }
  }, [discussionId]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const subscribe = async (options?: { notifyReply?: boolean; notifyMention?: boolean }) => {
    if (!discussionId) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in');
        return false;
      }

      const { data, error } = await supabase
        .from('discussion_subscriptions')
        .upsert({
          user_id: user.id,
          discussion_id: discussionId,
          notify_on_reply: options?.notifyReply ?? true,
          notify_on_mention: options?.notifyMention ?? true,
        }, { onConflict: 'user_id,discussion_id' })
        .select()
        .single();

      if (error) throw error;

      setSubscription(data);
      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error('Error subscribing:', err);
      toast.error('Failed to subscribe');
      return false;
    }
  };

  const unsubscribe = async () => {
    if (!discussionId) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('discussion_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('discussion_id', discussionId);

      if (error) throw error;

      setSubscription(null);
      setIsSubscribed(false);
      toast.success('Unsubscribed from thread');
      return true;
    } catch (err) {
      console.error('Error unsubscribing:', err);
      toast.error('Failed to unsubscribe');
      return false;
    }
  };

  const toggleSubscription = async () => {
    if (isSubscribed) {
      return unsubscribe();
    } else {
      return subscribe();
    }
  };

  // Auto-subscribe when user comments on a thread
  const autoSubscribe = async () => {
    if (!discussionId || isSubscribed) return;
    await subscribe();
  };

  return {
    isSubscribed,
    subscription,
    loading,
    subscribe,
    unsubscribe,
    toggleSubscription,
    autoSubscribe,
    refetch: fetchSubscription,
  };
};

// Hook to get all subscribers to notify for a discussion
export const useDiscussionSubscribers = () => {
  const getSubscribers = async (discussionId: string, excludeUserId?: string) => {
    try {
      let query = supabase
        .from('discussion_subscriptions')
        .select('user_id, notify_on_reply, notify_on_mention')
        .eq('discussion_id', discussionId)
        .eq('notify_on_reply', true);

      if (excludeUserId) {
        query = query.neq('user_id', excludeUserId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error getting subscribers:', err);
      return [];
    }
  };

  return { getSubscribers };
};
