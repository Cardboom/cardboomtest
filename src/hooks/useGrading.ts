import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type GradingOrderStatus = 'pending_payment' | 'queued' | 'in_review' | 'completed' | 'failed' | 'refunded';

export interface GradingOrder {
  id: string;
  user_id: string;
  idempotency_key: string;
  category: string;
  status: GradingOrderStatus;
  front_image_url: string | null;
  back_image_url: string | null;
  price_usd: number;
  external_request_id: string | null;
  // CardBoom Grading Index (CBGI) fields
  cbgi_json: any | null;
  cbgi_score_0_100: number | null;
  estimated_psa_range: string | null;
  cbgi_confidence: 'low' | 'medium' | 'high' | null;
  cbgi_risk_flags: string[] | null;
  eye_appeal_grade: number | null;
  // Standard grades (for backwards compatibility)
  final_grade: number | null;
  grade_label: string | null;
  corners_grade: number | null;
  edges_grade: number | null;
  surface_grade: number | null;
  centering_grade: number | null;
  // Original Ximilar grades for reference (legacy)
  ximilar_final_grade: number | null;
  ximilar_corners_grade: number | null;
  ximilar_edges_grade: number | null;
  ximilar_surface_grade: number | null;
  ximilar_centering_grade: number | null;
  overlay_coordinates: any | null;
  grading_notes: string | null;
  confidence: number | null;
  created_at: string;
  paid_at: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  updated_at: string;
  // Card metadata from AI scan
  card_name: string | null;
  set_name: string | null;
  set_code: string | null;
  card_number: string | null;
  rarity: string | null;
  language: string | null;
  cvi_key: string | null;
  market_item_id: string | null;
  ai_confidence: number | null;
  // Pricing fields
  price_low: number | null;
  price_mid: number | null;
  price_high: number | null;
  price_source: string | null;
  comps_json: any | null;
  error_message: string | null;
  // Estimated value fields
  estimated_value_raw: number | null;
  estimated_value_graded: number | null;
  value_increase_percent: number | null;
  // Speed tier and auto-list fields
  speed_tier: 'standard' | 'express' | 'priority' | null;
  estimated_days_min: number | null;
  estimated_days_max: number | null;
  estimated_completion_at: string | null;
  auto_list_enabled: boolean | null;
  auto_list_price: number | null;
  listing_created_id: string | null;
}

export const GRADING_PRICE_USD = 10; // Base price (standard tier)

export const GRADING_SPEED_TIERS = {
  standard: { price: 10, daysMin: 4, daysMax: 7 },
  express: { price: 15, daysMin: 3, daysMax: 5 },
  priority: { price: 25, daysMin: 1, daysMax: 2 },
};

export const GRADING_CATEGORIES = [
  { id: 'pokemon', name: 'Pokémon', icon: '⚡' },
  { id: 'sports', name: 'Sports Cards', icon: '🏀' },
  { id: 'fifa-panini', name: 'FIFA Panini', icon: '⚽' },
  { id: 'yugioh', name: 'Yu-Gi-Oh!', icon: '🎴' },
  { id: 'magic', name: 'Magic: The Gathering', icon: '🧙' },
  { id: 'one-piece', name: 'One Piece', icon: '🏴‍☠️' },
  { id: 'lorcana', name: 'Disney Lorcana', icon: '✨' },
  { id: 'other', name: 'Other TCG', icon: '🃏' },
];

export function useGrading() {
  const [orders, setOrders] = useState<GradingOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setOrders([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('grading_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      // Cast the data to handle the enum type
      setOrders((data || []) as GradingOrder[]);
    } catch (err: any) {
      console.error('Error fetching grading orders:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const createOrder = async (
    category: string,
    frontImageFile: File,
    backImageFile: File,
    speedTier: 'standard' | 'express' | 'priority' = 'standard',
    autoListEnabled: boolean = false,
    autoListPrice: number | null = null,
    batchInfo?: { isBatchDiscounted: boolean; batchSize: number; batchDiscountPercent: number }
  ): Promise<GradingOrder | null> => {
    const tierConfig = GRADING_SPEED_TIERS[speedTier];
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Please sign in to continue', variant: 'destructive' });
        return null;
      }

      const idempotencyKey = `${user.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const orderId = crypto.randomUUID();

      // Upload images
      const frontPath = `${user.id}/${orderId}/front.jpg`;
      const backPath = `${user.id}/${orderId}/back.jpg`;

      const [frontUpload, backUpload] = await Promise.all([
        supabase.storage.from('grading-images').upload(frontPath, frontImageFile, {
          contentType: frontImageFile.type,
          upsert: true
        }),
        supabase.storage.from('grading-images').upload(backPath, backImageFile, {
          contentType: backImageFile.type,
          upsert: true
        })
      ]);

      if (frontUpload.error) throw frontUpload.error;
      if (backUpload.error) throw backUpload.error;

      // Get public URLs
      const { data: { publicUrl: frontUrl } } = supabase.storage
        .from('grading-images')
        .getPublicUrl(frontPath);
      const { data: { publicUrl: backUrl } } = supabase.storage
        .from('grading-images')
        .getPublicUrl(backPath);

      // Create order with speed tier, auto-list settings, and batch info
      const { data: order, error: createError } = await supabase
        .from('grading_orders')
        .insert({
          id: orderId,
          user_id: user.id,
          idempotency_key: idempotencyKey,
          category,
          status: 'pending_payment',
          front_image_url: frontUrl,
          back_image_url: backUrl,
          price_usd: tierConfig.price,
          speed_tier: speedTier,
          estimated_days_min: tierConfig.daysMin,
          estimated_days_max: tierConfig.daysMax,
          auto_list_enabled: autoListEnabled,
          auto_list_price: autoListPrice,
          // Batch discount fields - batch orders don't count toward Boom Challenges
          is_batch_discounted: batchInfo?.isBatchDiscounted || false,
          batch_size: batchInfo?.batchSize || 1,
          batch_discount_percent: batchInfo?.batchDiscountPercent || 0,
        })
        .select()
        .single();

      if (createError) throw createError;

      await fetchOrders();
      return order as GradingOrder;
    } catch (err: any) {
      console.error('Error creating grading order:', err);
      toast({ title: 'Failed to create order', description: err.message, variant: 'destructive' });
    return null;
    }
  };

  // Create order from an existing listing
  const createOrderFromListing = async (
    listingId: string,
    frontImageFile: File | null,
    backImageFile: File | null,
    existingFrontUrl: string | null,
    existingBackUrl: string | null,
    speedTier: 'standard' | 'express' | 'priority' = 'standard'
  ): Promise<GradingOrder | null> => {
    const tierConfig = GRADING_SPEED_TIERS[speedTier];
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Please sign in to continue', variant: 'destructive' });
        return null;
      }

      // Fetch listing details
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .eq('seller_id', user.id)
        .single();

      if (listingError || !listing) {
        toast({ title: 'Listing not found', variant: 'destructive' });
        return null;
      }

      // CRITICAL: Require back image for grading
      const finalBackUrl = existingBackUrl || (backImageFile ? 'pending-upload' : null);
      if (!finalBackUrl) {
        toast({ title: 'Back image required', description: 'Please upload the back of the card for accurate grading', variant: 'destructive' });
        return null;
      }

      const idempotencyKey = `${user.id}-listing-${listingId}-${Date.now()}`;
      const orderId = crypto.randomUUID();

      let frontUrl = existingFrontUrl;
      let backUrl = existingBackUrl;

      // Upload new images if provided
      if (frontImageFile) {
        const frontPath = `${user.id}/${orderId}/front.jpg`;
        const { error: frontUploadError } = await supabase.storage
          .from('grading-images')
          .upload(frontPath, frontImageFile, { contentType: frontImageFile.type, upsert: true });
        if (frontUploadError) throw frontUploadError;
        frontUrl = supabase.storage.from('grading-images').getPublicUrl(frontPath).data.publicUrl;
        
        // Also update listing's front_image_url
        await supabase.from('listings').update({ front_image_url: frontUrl }).eq('id', listingId);
      }

      if (backImageFile) {
        const backPath = `${user.id}/${orderId}/back.jpg`;
        const { error: backUploadError } = await supabase.storage
          .from('grading-images')
          .upload(backPath, backImageFile, { contentType: backImageFile.type, upsert: true });
        if (backUploadError) throw backUploadError;
        backUrl = supabase.storage.from('grading-images').getPublicUrl(backPath).data.publicUrl;
        
        // Also update listing's back_image_url
        await supabase.from('listings').update({ back_image_url: backUrl }).eq('id', listingId);
      }

      // Create order linked to listing
      const { data: order, error: createError } = await supabase
        .from('grading_orders')
        .insert({
          id: orderId,
          user_id: user.id,
          idempotency_key: idempotencyKey,
          category: listing.category,
          status: 'pending_payment',
          front_image_url: frontUrl,
          back_image_url: backUrl,
          price_usd: tierConfig.price,
          speed_tier: speedTier,
          estimated_days_min: tierConfig.daysMin,
          estimated_days_max: tierConfig.daysMax,
          source_listing_id: listingId,
          card_name: listing.title,
          set_name: listing.set_name,
          card_number: listing.card_number,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Update listing with grading order reference
      await supabase.from('listings').update({ grading_order_id: orderId }).eq('id', listingId);

      await fetchOrders();
      return order as GradingOrder;
    } catch (err: any) {
      console.error('Error creating grading order from listing:', err);
      toast({ title: 'Failed to create order', description: err.message, variant: 'destructive' });
      return null;
    }
  };

  const submitAndPay = async (orderId: string, idempotencyKey: string): Promise<boolean> => {
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('grading-submit', {
        body: { orderId, idempotencyKey }
      });

      if (invokeError) throw invokeError;

      if (data.error) {
        toast({ 
          title: 'Payment failed', 
          description: data.error,
          variant: 'destructive' 
        });
        return false;
      }

      await fetchOrders();
      toast({ 
        title: 'Payment successful!', 
        description: 'Your card is now being graded. Results typically arrive within 1-5 days.' 
      });
      return true;
    } catch (err: any) {
      console.error('Error submitting grading order:', err);
      toast({ title: 'Submission failed', description: err.message, variant: 'destructive' });
      return false;
    }
  };

  const getOrder = useCallback(async (orderId: string): Promise<GradingOrder | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('grading_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;
      return data as GradingOrder;
    } catch (err: any) {
      console.error('Error fetching order:', err);
      return null;
    }
  }, []);

  return {
    orders,
    isLoading,
    error,
    fetchOrders,
    createOrder,
    createOrderFromListing,
    submitAndPay,
    getOrder
  };
}

export function useGradingAdmin() {
  const [orders, setOrders] = useState<(GradingOrder & { profiles?: { display_name: string; email: string } })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchAllOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('grading-admin', {
        body: { action: 'list' }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setOrders(data.orders || []);
    } catch (err: any) {
      console.error('Error fetching admin orders:', err);
      toast({ title: 'Failed to load orders', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const updateStatus = async (orderId: string, status: GradingOrderStatus) => {
    try {
      const { data, error } = await supabase.functions.invoke('grading-admin', {
        body: { action: 'update_status', orderId, status }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({ title: 'Status updated' });
      await fetchAllOrders();
      return true;
    } catch (err: any) {
      toast({ title: 'Failed to update status', description: err.message, variant: 'destructive' });
      return false;
    }
  };

  const refundOrder = async (orderId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('grading-admin', {
        body: { action: 'refund', orderId }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({ title: 'Order refunded successfully' });
      await fetchAllOrders();
      return true;
    } catch (err: any) {
      toast({ title: 'Failed to refund', description: err.message, variant: 'destructive' });
      return false;
    }
  };

  const regradeOrders = async (orderIds: string[]) => {
    try {
      const { data, error } = await supabase.functions.invoke('grading-regrade', {
        body: { orderIds }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({ 
        title: 'Regrade complete', 
        description: `${data.successCount}/${data.totalCount} orders regraded successfully` 
      });
      await fetchAllOrders();
      return data;
    } catch (err: any) {
      toast({ title: 'Failed to regrade', description: err.message, variant: 'destructive' });
      return null;
    }
  };

  useEffect(() => {
    fetchAllOrders();
  }, [fetchAllOrders]);

  return {
    orders,
    isLoading,
    fetchAllOrders,
    updateStatus,
    refundOrder,
    regradeOrders
  };
}
