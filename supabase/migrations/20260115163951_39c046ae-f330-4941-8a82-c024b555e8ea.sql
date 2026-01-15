-- Add policy for anonymous users to view active listings for stats
CREATE POLICY "Anon can view active listings for stats"
ON public.listings
FOR SELECT
TO anon
USING (status = 'active');