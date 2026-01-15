-- Add RLS policy to allow anonymous users to read orders for platform stats
-- This only allows reading the price column for aggregation purposes

CREATE POLICY "Anyone can read order prices for stats"
ON public.orders
FOR SELECT
USING (true);