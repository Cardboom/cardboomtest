-- Allow anonymous users to count profiles for "Active Traders" stat on homepage
CREATE POLICY "Anyone can count profiles for homepage stats"
ON public.profiles
FOR SELECT
TO anon
USING (true);