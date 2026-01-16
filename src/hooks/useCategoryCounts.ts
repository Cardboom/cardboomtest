import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CategoryCount {
  id: string;
  label: string;
  count: number;
}

// Fetch real category counts from the database
export const useCategoryCounts = () => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Get counts from market_items grouped by category
        const { data, error } = await supabase
          .from('market_items')
          .select('category');

        if (error) throw error;

        // Count items per category
        const categoryCounts: Record<string, number> = {};
        let total = 0;
        
        for (const item of data || []) {
          const cat = item.category?.toLowerCase() || 'other';
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
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
