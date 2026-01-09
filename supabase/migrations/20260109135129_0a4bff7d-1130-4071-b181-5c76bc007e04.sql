-- Add verified seller flag to profiles (if not exists)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified_seller BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified_seller_at TIMESTAMP WITH TIME ZONE;

-- Create order_actions table to track all actions on an order
CREATE TABLE IF NOT EXISTS public.order_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  actor_id UUID,
  actor_type TEXT NOT NULL DEFAULT 'user',
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on order_actions
ALTER TABLE public.order_actions ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view own order actions" ON public.order_actions;
DROP POLICY IF EXISTS "Admins can view all order actions" ON public.order_actions;
DROP POLICY IF EXISTS "System can insert order actions" ON public.order_actions;

-- Policy: Users can view actions for their orders
CREATE POLICY "Users can view own order actions"
ON public.order_actions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = order_actions.order_id 
    AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
  )
);

-- Policy: Admins can view all order actions
CREATE POLICY "Admins can view all order actions"
ON public.order_actions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: System inserts (via service role)
CREATE POLICY "System can insert order actions"
ON public.order_actions FOR INSERT
WITH CHECK (true);

-- Add escrow_held_amount to orders for tracking
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS escrow_held_amount NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seller_is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS funds_released_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_order_actions_order_id ON public.order_actions(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_escrow_status ON public.orders(escrow_status);

-- Function to log order actions
CREATE OR REPLACE FUNCTION public.log_order_action(
  p_order_id UUID,
  p_action_type TEXT,
  p_actor_id UUID DEFAULT NULL,
  p_actor_type TEXT DEFAULT 'system',
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action_id UUID;
BEGIN
  INSERT INTO public.order_actions (order_id, action_type, actor_id, actor_type, details)
  VALUES (p_order_id, p_action_type, p_actor_id, p_actor_type, p_details)
  RETURNING id INTO v_action_id;
  
  RETURN v_action_id;
END;
$$;

-- Function to release escrow funds to seller
CREATE OR REPLACE FUNCTION public.release_escrow_funds(
  p_order_id UUID,
  p_released_by UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_seller_wallet RECORD;
  v_payout_amount NUMERIC;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  IF v_order.escrow_status = 'released' OR v_order.funds_released_at IS NOT NULL THEN
    RETURN TRUE;
  END IF;
  
  SELECT * INTO v_seller_wallet FROM public.wallets WHERE user_id = v_order.seller_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Seller wallet not found';
  END IF;
  
  v_payout_amount := COALESCE(v_order.seller_payout_in_seller_currency, v_order.price - v_order.seller_fee);
  
  UPDATE public.wallets
  SET balance = balance + v_payout_amount
  WHERE id = v_seller_wallet.id;
  
  INSERT INTO public.transactions (wallet_id, type, amount, fee, description, reference_id)
  VALUES (
    v_seller_wallet.id,
    'sale',
    v_payout_amount,
    v_order.seller_fee,
    'Sale completed - funds released from escrow',
    p_order_id
  );
  
  UPDATE public.orders
  SET 
    escrow_status = 'released',
    funds_released_at = now(),
    status = CASE WHEN status != 'completed' THEN 'completed' ELSE status END,
    payout_status = 'paid'
  WHERE id = p_order_id;
  
  PERFORM public.log_order_action(
    p_order_id,
    'funds_released',
    p_released_by,
    CASE WHEN p_released_by IS NULL THEN 'system' ELSE 'user' END,
    jsonb_build_object('amount', v_payout_amount)
  );
  
  RETURN TRUE;
END;
$$;

-- Function to refund buyer
CREATE OR REPLACE FUNCTION public.refund_order(
  p_order_id UUID,
  p_refunded_by UUID DEFAULT NULL,
  p_reason TEXT DEFAULT 'Order refunded'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_buyer_wallet RECORD;
  v_refund_amount NUMERIC;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  IF v_order.escrow_status = 'refunded' OR v_order.refunded_at IS NOT NULL THEN
    RETURN TRUE;
  END IF;
  
  SELECT * INTO v_buyer_wallet FROM public.wallets WHERE user_id = v_order.buyer_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Buyer wallet not found';
  END IF;
  
  v_refund_amount := COALESCE(v_order.escrow_held_amount, v_order.price + v_order.buyer_fee);
  
  UPDATE public.wallets
  SET balance = balance + v_refund_amount
  WHERE id = v_buyer_wallet.id;
  
  INSERT INTO public.transactions (wallet_id, type, amount, description, reference_id)
  VALUES (
    v_buyer_wallet.id,
    'refund',
    v_refund_amount,
    p_reason,
    p_order_id
  );
  
  UPDATE public.orders
  SET 
    escrow_status = 'refunded',
    refunded_at = now(),
    status = 'refunded'
  WHERE id = p_order_id;
  
  UPDATE public.listings
  SET status = 'active'
  WHERE id = v_order.listing_id;
  
  PERFORM public.log_order_action(
    p_order_id,
    'refunded',
    p_refunded_by,
    CASE WHEN p_refunded_by IS NULL THEN 'system' ELSE 'admin' END,
    jsonb_build_object('amount', v_refund_amount, 'reason', p_reason)
  );
  
  RETURN TRUE;
END;
$$;