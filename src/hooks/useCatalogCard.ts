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
  // New detailed fields
  effect_text: string | null;
  color: string | null;
  card_type: string | null;
  cost: number | null;
  power: number | null;
  counter: number | null;
  attribute: string | null;
  subtypes: string[] | null;
}

export interface PriceSnapshot {
  median_usd: number | null;
  median_try: number | null;
  liquidity_count: number;
  confidence: number;
  snapshot_date: string;
}

export interface ResolvedPrice {
  has_price: boolean;
  price_usd: number | null;
  price_source: string;
  liquidity_count: number;
  confidence: number;
  last_updated: string | null;
  min_listing_price: number | null;
  listing_count: number;
}

export interface CatalogListing {
  listing_id: string;
  title: string;
  price: number;
  image_url: string | null;
  condition: string | null;
  status: string;
  seller_id: string;
  seller_name: string | null;
  seller_avatar: string | null;
  market_item_id: string;
  mapping_confidence: number;
  is_sample?: boolean;
  category?: string;
  seller_country_code?: string | null;
  seller_total_sales?: number;
  seller_is_verified?: boolean;
  seller_subscription_tier?: string | null;
  // CBGI grading fields
  cbgi_score?: number | null;
  cbgi_grade_label?: string | null;
  cbgi_completed_at?: string | null;
  // External grading
  external_grade?: string | null;
  external_grading_company?: string | null;
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

// Use the resolved price function that checks all sources
export const useCatalogCardPrice = (catalogCardId: string | undefined) => {
  return useQuery({
    queryKey: ['catalog-card-price', catalogCardId],
    queryFn: async () => {
      if (!catalogCardId) return null;
      
      // Call the database function that resolves price from all sources
      const { data, error } = await supabase
        .rpc('get_catalog_card_resolved_price', { p_catalog_card_id: catalogCardId });
      
      if (error) {
        console.error('Error fetching resolved price:', error);
        // Fallback to snapshot
        const { data: snapshot } = await supabase
          .from('card_price_snapshots')
          .select('*')
          .eq('catalog_card_id', catalogCardId)
          .order('snapshot_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (snapshot) {
          return {
            has_price: !!snapshot.median_usd,
            price_usd: snapshot.median_usd,
            price_source: 'snapshot',
            liquidity_count: snapshot.liquidity_count || 0,
            confidence: snapshot.confidence || 0,
            last_updated: snapshot.snapshot_date,
          } as ResolvedPrice;
        }
        return null;
      }
      
      // RPC returns array, get first result
      const result = Array.isArray(data) ? data[0] : data;
      return result as ResolvedPrice | null;
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

// Use the database function that resolves listings via catalog_card_map
export const useCatalogCardListings = (catalogCardId: string | undefined) => {
  return useQuery({
    queryKey: ['catalog-card-listings', catalogCardId],
    queryFn: async () => {
      if (!catalogCardId) return [];
      
      // Call the database function that resolves listings via mapping table
      const { data, error } = await supabase
        .rpc('get_catalog_card_listings', { p_catalog_card_id: catalogCardId });
      
      if (error) {
        console.error('Error fetching catalog listings via RPC:', error);
        
        // Fallback: try direct query via catalog_card_listings junction table
        const { data: fallbackData, error: fallbackError } = await supabase
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
        
        if (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          return [];
        }
        
        // Transform fallback data
        return (fallbackData || []).map((item: any) => ({
          listing_id: item.listing_id,
          title: item.listings?.title,
          price: item.listings?.price,
          image_url: item.listings?.image_url,
          condition: item.listings?.condition,
          status: item.listings?.status,
          seller_id: item.listings?.seller_id,
          seller_name: item.listings?.profiles?.display_name,
          seller_avatar: item.listings?.profiles?.avatar_url,
          market_item_id: null,
          mapping_confidence: item.match_confidence || 1.0,
        }));
      }
      
      return (data || []) as CatalogListing[];
    },
    enabled: !!catalogCardId,
  });
};

// Hook to get mapping count for a catalog card (for debugging)
export const useCatalogCardMappings = (catalogCardId: string | undefined) => {
  return useQuery({
    queryKey: ['catalog-card-mappings', catalogCardId],
    queryFn: async () => {
      if (!catalogCardId) return { count: 0, mappings: [] };
      
      const { data, error, count } = await supabase
        .from('catalog_card_map')
        .select('market_item_id, canonical_key, confidence', { count: 'exact' })
        .eq('catalog_card_id', catalogCardId);
      
      if (error) {
        console.error('Error fetching mappings:', error);
        return { count: 0, mappings: [] };
      }
      
      return { count: count || 0, mappings: data || [] };
    },
    enabled: !!catalogCardId,
  });
};
