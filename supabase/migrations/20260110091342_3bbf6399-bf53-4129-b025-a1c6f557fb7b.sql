-- Add field to control when results become visible to the user
ALTER TABLE public.grading_orders 
ADD COLUMN IF NOT EXISTS results_visible_at timestamp with time zone;

-- Add index for querying visible results
CREATE INDEX IF NOT EXISTS idx_grading_orders_results_visible 
ON public.grading_orders(results_visible_at) 
WHERE results_visible_at IS NOT NULL;