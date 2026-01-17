import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CatalogCard {
  id: string;
  game: string;
  canonical_key: string;
  set_code: string | null;
  set_name: string | null;
  card_number: string | null;
  variant: string | null;
  finish: string | null;
  rarity: string | null;
  image_url: string | null;
  name: string;
}

export interface PriceSnapshot {
  median_usd: number | null;
  median_try: number | null;
  liquidity_count: number;
  confidence: number;
  snapshot_date: string;
}

export const useCatalogCard = (canonicalKey: string | undefined) => {
  return useQuery({
    queryKey: ['catalog-card', canonicalKey],
    queryFn: async () => {
      if (!canonicalKey) return null;
      
      const { data, error } = await supabase
        .from('catalog_cards')
        .select('*')
        .eq('canonical_key', canonicalKey)
        .maybeSingle();
      
      if (error) throw error;
      return data as CatalogCard | null;
    },
    enabled: !!canonicalKey,
  });
};

export const useCatalogCardPrice = (catalogCardId: string | undefined) => {
  return useQuery({
    queryKey: ['catalog-card-price', catalogCardId],
    queryFn: async () => {
      if (!catalogCardId) return null;
      
      const { data, error } = await supabase
        .from('card_price_snapshots')
        .select('*')
        .eq('catalog_card_id', catalogCardId)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as PriceSnapshot | null;
    },
    enabled: !!catalogCardId,
  });
};

export const useCatalogPriceHistory = (catalogCardId: string | undefined, days = 30) => {
  return useQuery({
    queryKey: ['catalog-price-history', catalogCardId, days],
    queryFn: async () => {
      if (!catalogCardId) return [];
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('card_price_snapshots')
        .select('snapshot_date, median_usd, liquidity_count, confidence')
        .eq('catalog_card_id', catalogCardId)
        .gte('snapshot_date', startDate.toISOString().split('T')[0])
        .order('snapshot_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!catalogCardId,
  });
};

export const useCatalogCardListings = (catalogCardId: string | undefined) => {
  return useQuery({
    queryKey: ['catalog-card-listings', catalogCardId],
    queryFn: async () => {
      if (!catalogCardId) return [];
      
      const { data, error } = await supabase
        .from('catalog_card_listings')
        .select(`
          listing_id,
          match_confidence,
          listings!inner (
            id, title, price, image_url, condition, status, seller_id,
            profiles!listings_seller_id_fkey (display_name, avatar_url)
          )
        `)
        .eq('catalog_card_id', catalogCardId)
        .eq('listings.status', 'active');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!catalogCardId,
  });
};
