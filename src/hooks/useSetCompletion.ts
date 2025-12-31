import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CardSet {
  id: string;
  name: string;
  category: string;
  series: string | null;
  total_cards: number;
  release_date: string | null;
  image_url: string | null;
}

interface SetCompletion {
  id: string;
  user_id: string;
  set_id: string;
  owned_cards: string[];
  completion_percent: number;
  card_sets?: CardSet;
}

export const useSetCompletion = (userId?: string) => {
  const queryClient = useQueryClient();

  // Fetch all available card sets
  const { data: cardSets, isLoading: setsLoading } = useQuery({
    queryKey: ['card-sets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('card_sets')
        .select('*')
        .order('category', { ascending: true })
        .order('release_date', { ascending: false });
      
      if (error) throw error;
      return data as CardSet[];
    },
  });

  // Fetch user's set completion progress
  const { data: userProgress, isLoading: progressLoading } = useQuery({
    queryKey: ['set-completion', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('set_completion')
        .select(`
          *,
          card_sets (*)
        `)
        .eq('user_id', userId);
      
      if (error) throw error;
      return data as SetCompletion[];
    },
    enabled: !!userId,
  });

  // Add card to set
  const addCardToSet = useMutation({
    mutationFn: async ({ setId, cardNumber }: { setId: string; cardNumber: string }) => {
      if (!userId) throw new Error('Not authenticated');

      // Check if progress exists
      const { data: existing } = await supabase
        .from('set_completion')
        .select('*')
        .eq('user_id', userId)
        .eq('set_id', setId)
        .maybeSingle();

      const cardSet = cardSets?.find(s => s.id === setId);
      const totalCards = cardSet?.total_cards || 1;

      if (existing) {
        const currentCards = Array.isArray(existing.owned_cards) ? existing.owned_cards : [];
        if (currentCards.includes(cardNumber)) {
          throw new Error('Card already in collection');
        }
        const newCards = [...currentCards, cardNumber];
        const percent = (newCards.length / totalCards) * 100;

        const { error } = await supabase
          .from('set_completion')
          .update({ 
            owned_cards: newCards,
            completion_percent: percent,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const percent = (1 / totalCards) * 100;
        const { error } = await supabase
          .from('set_completion')
          .insert({
            user_id: userId,
            set_id: setId,
            owned_cards: [cardNumber],
            completion_percent: percent,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['set-completion', userId] });
      toast.success('Card added to collection!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Remove card from set
  const removeCardFromSet = useMutation({
    mutationFn: async ({ setId, cardNumber }: { setId: string; cardNumber: string }) => {
      if (!userId) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('set_completion')
        .select('*')
        .eq('user_id', userId)
        .eq('set_id', setId)
        .maybeSingle();

      if (!existing) throw new Error('Set not in progress');

      const cardSet = cardSets?.find(s => s.id === setId);
      const totalCards = cardSet?.total_cards || 1;
      const currentCards = Array.isArray(existing.owned_cards) ? existing.owned_cards : [];
      const newCards = currentCards.filter((c: string) => c !== cardNumber);
      const percent = newCards.length > 0 ? (newCards.length / totalCards) * 100 : 0;

      if (newCards.length === 0) {
        const { error } = await supabase
          .from('set_completion')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('set_completion')
          .update({ 
            owned_cards: newCards,
            completion_percent: percent,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['set-completion', userId] });
      toast.success('Card removed from collection');
    },
  });

  // Get completion for a specific set
  const getSetProgress = (setId: string) => {
    return userProgress?.find(p => p.set_id === setId);
  };

  return {
    cardSets,
    userProgress,
    isLoading: setsLoading || progressLoading,
    addCardToSet,
    removeCardFromSet,
    getSetProgress,
  };
};
