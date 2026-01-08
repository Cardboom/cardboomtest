import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface UserHoldingItem {
  id: string;
  type: 'listing' | 'vault' | 'card_instance';
  title: string;
  imageUrl: string | null;
  category: string;
  condition: string;
  grade: string | null;
  gradingCompany: string | null;
  currentValue: number;
  status: string;
  createdAt: string;
  // Original references
  listingId?: string;
  cardInstanceId?: string;
  vaultItemId?: string;
}

interface UseUserHoldingsResult {
  holdings: UserHoldingItem[];
  listings: UserHoldingItem[];
  vaultItems: UserHoldingItem[];
  cardInstances: UserHoldingItem[];
  isLoading: boolean;
  refetch: () => void;
  totalValue: number;
  totalCount: number;
}

export const useUserHoldings = (userId: string | undefined): UseUserHoldingsResult => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['user-holdings', userId],
    queryFn: async () => {
      if (!userId) return { listings: [], vaultItems: [], cardInstances: [] };

      // Fetch active listings
      const { data: listingsData } = await supabase
        .from('listings')
        .select('id, title, image_url, category, condition, certification_status, price, status, created_at')
        .eq('seller_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      // Fetch vault items
      const { data: vaultData } = await supabase
        .from('vault_items')
        .select('id, title, image_url, category, condition, estimated_value, status, created_at')
        .eq('owner_id', userId)
        .in('status', ['stored', 'received'])
        .order('created_at', { ascending: false });

      // Fetch card instances (canonical inventory)
      const { data: instancesData } = await supabase
        .from('card_instances')
        .select('id, title, image_url, category, condition, grade, grading_company, current_value, status, location, created_at')
        .eq('owner_user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Transform listings
      const listings: UserHoldingItem[] = (listingsData || []).map((item) => ({
        id: `listing-${item.id}`,
        type: 'listing' as const,
        title: item.title,
        imageUrl: item.image_url,
        category: item.category || 'pokemon',
        condition: item.condition || 'near_mint',
        grade: item.certification_status,
        gradingCompany: null,
        currentValue: item.price || 0,
        status: item.status,
        createdAt: item.created_at,
        listingId: item.id,
      }));

      // Transform vault items
      const vaultItems: UserHoldingItem[] = (vaultData || []).map((item) => ({
        id: `vault-${item.id}`,
        type: 'vault' as const,
        title: item.title,
        imageUrl: item.image_url,
        category: item.category || 'pokemon',
        condition: item.condition || 'near_mint',
        grade: null,
        gradingCompany: null,
        currentValue: item.estimated_value || 0,
        status: item.status,
        createdAt: item.created_at,
        vaultItemId: item.id,
      }));

      // Transform card instances
      const cardInstances: UserHoldingItem[] = (instancesData || []).map((item) => ({
        id: `instance-${item.id}`,
        type: 'card_instance' as const,
        title: item.title,
        imageUrl: item.image_url,
        category: item.category || 'pokemon',
        condition: item.condition || 'near_mint',
        grade: item.grade,
        gradingCompany: item.grading_company,
        currentValue: item.current_value || 0,
        status: `${item.status} (${item.location})`,
        createdAt: item.created_at,
        cardInstanceId: item.id,
      }));

      return { listings, vaultItems, cardInstances };
    },
    enabled: !!userId,
    staleTime: 30000,
  });

  const listings = data?.listings || [];
  const vaultItems = data?.vaultItems || [];
  const cardInstances = data?.cardInstances || [];
  
  // Combine all holdings, avoiding duplicates where card_instances already represent vault/listing items
  const holdings = [...listings, ...vaultItems, ...cardInstances];
  
  const totalValue = holdings.reduce((sum, item) => sum + item.currentValue, 0);
  const totalCount = holdings.length;

  return {
    holdings,
    listings,
    vaultItems,
    cardInstances,
    isLoading,
    refetch,
    totalValue,
    totalCount,
  };
};
