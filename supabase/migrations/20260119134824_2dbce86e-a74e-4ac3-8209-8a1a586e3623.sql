-- Add admin policy to view all orders
CREATE POLICY "Admins can view all orders"
  ON public.orders
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin policy to update all orders (for dispute resolution, status changes, etc.)
CREATE POLICY "Admins can update all orders"
  ON public.orders
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));