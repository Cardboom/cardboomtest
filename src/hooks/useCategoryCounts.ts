import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CategoryCount {
  id: string;
  label: string;
  count: number;
}

// Normalize category names to handle variations
const normalizeCategory = (category: string): string => {
  const cat = category?.toLowerCase() || 'other';
  // Map variations to canonical names
  if (cat === 'onepiece') return 'one-piece';
  if (cat === 'videogames') return 'gaming';
  return cat;
};

// Fetch real category counts from the database (both market_items and listings)
export const useCategoryCounts = () => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Get counts from market_items grouped by category
        const { data: marketData, error: marketError } = await supabase
          .from('market_items')
          .select('category');

        if (marketError) throw marketError;

        // Also count active listings
        const { data: listingsData, error: listingsError } = await supabase
          .from('listings')
          .select('category')
          .eq('status', 'active');

        if (listingsError) throw listingsError;

        // Count items per category (combining both sources)
        const categoryCounts: Record<string, number> = {};
        let total = 0;
        
        // Count market items
        for (const item of marketData || []) {
          const cat = normalizeCategory(item.category);
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
          total++;
        }

        // Count listings (don't double count, just ensure categories show up)
        for (const item of listingsData || []) {
          const cat = normalizeCategory(item.category);
          if (!categoryCounts[cat]) {
            categoryCounts[cat] = 0;
          }
          // Add listings to count
          categoryCounts[cat]++;
          total++;
        }

        setCounts(categoryCounts);
        setTotalCount(total);
      } catch (error) {
        console.error('Error fetching category counts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, []);

  return { counts, totalCount, loading };
};
