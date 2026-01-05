-- Add INSERT policy for market_items to allow authenticated users to create new items
CREATE POLICY "Authenticated users can insert market items"
ON public.market_items
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add UPDATE policy for market_items to allow updates
CREATE POLICY "Authenticated users can update market items"
ON public.market_items
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);