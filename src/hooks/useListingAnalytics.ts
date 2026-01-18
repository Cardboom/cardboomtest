import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ListingAnalytics {
  listing_id: string;
  view_date: string;
  view_count: number;
  unique_viewers: number;
  offer_count: number;
  watchlist_adds: number;
}

interface ListingHealthAnalysis {
  totalViews: number;
  totalOffers: number;
  totalWatchlistAdds: number;
  viewToOfferRatio: number;
  healthStatus: 'hot' | 'warm' | 'cold' | 'stale';
  suggestions: string[];
  daysSinceListing: number;
}

export const useListingAnalytics = (listingId?: string) => {
  const [analytics, setAnalytics] = useState<ListingAnalytics[]>([]);
  const [healthAnalysis, setHealthAnalysis] = useState<ListingHealthAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    if (!listingId) {
      setLoading(false);
      return;
    }

    try {
      // Get analytics data
      const { data, error } = await supabase
        .from('listing_analytics')
        .select('*')
        .eq('listing_id', listingId)
        .order('view_date', { ascending: false })
        .limit(30);

      if (error) throw error;
      setAnalytics((data || []) as ListingAnalytics[]);

      // Get listing creation date
      const { data: listing } = await supabase
        .from('listings')
        .select('created_at, price')
        .eq('id', listingId)
        .single();

      // Calculate health analysis
      const analyticsData = (data || []) as ListingAnalytics[];
      if (analyticsData.length > 0 && listing) {
        const totalViews = analyticsData.reduce((sum, d) => sum + (d.view_count || 0), 0);
        const totalOffers = analyticsData.reduce((sum, d) => sum + (d.offer_count || 0), 0);
        const totalWatchlistAdds = analyticsData.reduce((sum, d) => sum + (d.watchlist_adds || 0), 0);
        const viewToOfferRatio = totalViews > 0 ? totalOffers / totalViews : 0;
        
        const createdAt = new Date(listing.created_at);
        const now = new Date();
        const daysSinceListing = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

        // Determine health status
        let healthStatus: ListingHealthAnalysis['healthStatus'] = 'warm';
        const suggestions: string[] = [];

        if (totalViews > 50 && totalOffers > 3) {
          healthStatus = 'hot';
        } else if (totalViews > 20 && totalOffers > 0) {
          healthStatus = 'warm';
        } else if (daysSinceListing > 14 && totalOffers === 0) {
          healthStatus = 'stale';
        } else if (totalViews < 10 && daysSinceListing > 7) {
          healthStatus = 'cold';
        }

        // Generate suggestions
        if (totalViews > 30 && totalOffers === 0) {
          suggestions.push('High views but no offers - consider lowering your price');
        }
        if (totalViews < 10 && daysSinceListing > 7) {
          suggestions.push('Low visibility - try improving your listing title and photos');
        }
        if (daysSinceListing > 30 && healthStatus !== 'hot') {
          suggestions.push('Listing has been active for over 30 days - consider refreshing it');
        }
        if (totalWatchlistAdds > 5 && totalOffers === 0) {
          suggestions.push('People are watching but not offering - price may be too high');
        }

        setHealthAnalysis({
          totalViews,
          totalOffers,
          totalWatchlistAdds,
          viewToOfferRatio,
          healthStatus,
          suggestions,
          daysSinceListing,
        });
      }
    } catch (err) {
      console.error('Error fetching listing analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Record a view
  const recordView = async () => {
    if (!listingId) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Try to get existing record
      const { data: existing } = await supabase
        .from('listing_analytics')
        .select('view_count')
        .eq('listing_id', listingId)
        .eq('view_date', today)
        .maybeSingle();

      if (existing) {
        // Update existing
        await supabase
          .from('listing_analytics')
          .update({ view_count: (existing.view_count || 0) + 1 })
          .eq('listing_id', listingId)
          .eq('view_date', today);
      } else {
        // Insert new
        await supabase
          .from('listing_analytics')
          .insert({
            listing_id: listingId,
            view_date: today,
            view_count: 1,
            unique_viewers: 1,
            offer_count: 0,
            watchlist_adds: 0,
          });
      }
    } catch (err) {
      console.error('Error recording view:', err);
    }
  };

  // Record an offer
  const recordOffer = async () => {
    if (!listingId) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Try to get existing record
      const { data: existing } = await supabase
        .from('listing_analytics')
        .select('offer_count')
        .eq('listing_id', listingId)
        .eq('view_date', today)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('listing_analytics')
          .update({ offer_count: (existing.offer_count || 0) + 1 })
          .eq('listing_id', listingId)
          .eq('view_date', today);
      } else {
        await supabase
          .from('listing_analytics')
          .insert({
            listing_id: listingId,
            view_date: today,
            view_count: 0,
            unique_viewers: 0,
            offer_count: 1,
            watchlist_adds: 0,
          });
      }
    } catch (err) {
      console.error('Error recording offer:', err);
    }
  };

  return {
    analytics,
    healthAnalysis,
    loading,
    recordView,
    recordOffer,
    refetch: fetchAnalytics,
  };
};
