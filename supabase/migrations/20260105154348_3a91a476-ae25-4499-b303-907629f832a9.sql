-- Add ximilar_final_grade to store original Ximilar grade (before 5% adjustment)
-- The existing final_grade will store the CardBoom adjusted grade (5% below Ximilar)
ALTER TABLE public.grading_orders 
ADD COLUMN IF NOT EXISTS ximilar_final_grade numeric,
ADD COLUMN IF NOT EXISTS ximilar_corners_grade numeric,
ADD COLUMN IF NOT EXISTS ximilar_edges_grade numeric,
ADD COLUMN IF NOT EXISTS ximilar_surface_grade numeric,
ADD COLUMN IF NOT EXISTS ximilar_centering_grade numeric;

-- Add comments for clarity
COMMENT ON COLUMN public.grading_orders.ximilar_final_grade IS 'Original grade from Ximilar API';
COMMENT ON COLUMN public.grading_orders.final_grade IS 'CardBoom adjusted grade (5% below Ximilar for disciplined indexing)';