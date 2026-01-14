-- Allow anonymous users to count profiles for "Active Traders" stat
CREATE POLICY "Anyone can count profiles for stats"
ON public.profiles
FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to count orders for "Cards Sold" stat
CREATE POLICY "Anyone can count orders for stats"
ON public.orders
FOR SELECT
TO anon
USING (true);