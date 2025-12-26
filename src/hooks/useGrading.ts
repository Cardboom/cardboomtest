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
  final_grade: number | null;
  grade_label: string | null;
  corners_grade: number | null;
  edges_grade: number | null;
  surface_grade: number | null;
  centering_grade: number | null;
  overlay_coordinates: any | null;
  grading_notes: string | null;
  confidence: number | null;
  created_at: string;
  paid_at: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

export const GRADING_PRICE_USD = 20;

export const GRADING_CATEGORIES = [
  { id: 'pokemon', name: 'Pokémon', icon: '⚡' },
  { id: 'sports', name: 'Sports Cards', icon: '🏀' },
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
    backImageFile: File
  ): Promise<GradingOrder | null> => {
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

      // Create order
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
          price_usd: GRADING_PRICE_USD
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

  useEffect(() => {
    fetchAllOrders();
  }, [fetchAllOrders]);

  return {
    orders,
    isLoading,
    fetchAllOrders,
    updateStatus,
    refundOrder
  };
}
