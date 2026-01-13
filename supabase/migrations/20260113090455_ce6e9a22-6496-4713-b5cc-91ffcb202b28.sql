-- Allow anonymous users to view completed grading orders (for displaying CBGI grades on marketplace)
CREATE POLICY "Anyone can view completed grading orders"
ON public.grading_orders
FOR SELECT
USING (status = 'completed');

-- Drop the old policy if it exists and re-create with proper permissions
DROP POLICY IF EXISTS "Users can view own grading orders" ON public.grading_orders;

CREATE POLICY "Users can view own grading orders"
ON public.grading_orders
FOR SELECT
USING (auth.uid() = user_id);

-- Ensure grading_orders has RLS enabled
ALTER TABLE public.grading_orders ENABLE ROW LEVEL SECURITY;