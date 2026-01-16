-- Fix the award_points_on_order trigger to use correct column name
CREATE OR REPLACE FUNCTION award_points_on_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Award points when order is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Award to buyer (use 'price' not 'total_amount')
    PERFORM award_cardboom_points(
      NEW.buyer_id,
      NEW.price,
      'purchase',
      NEW.id,
      'Points earned from purchase'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Allow users to create escalations for their own orders
DROP POLICY IF EXISTS "System can insert escalations" ON public.order_escalations;
DROP POLICY IF EXISTS "Users can create escalations for their orders" ON public.order_escalations;

CREATE POLICY "Users can create escalations for their orders"
ON public.order_escalations
FOR INSERT
WITH CHECK (
  escalated_by = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_escalations.order_id
    AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
  )
);

-- Allow users to view their own escalations
DROP POLICY IF EXISTS "Users can view their own escalations" ON public.order_escalations;

CREATE POLICY "Users can view their own escalations"
ON public.order_escalations
FOR SELECT
USING (
  escalated_by = auth.uid()::text OR
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_escalations.order_id
    AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
  )
);