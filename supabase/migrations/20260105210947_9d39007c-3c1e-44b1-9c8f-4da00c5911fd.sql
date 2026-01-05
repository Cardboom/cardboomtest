-- Add estimated value fields for raw and graded pricing
ALTER TABLE public.grading_orders 
ADD COLUMN IF NOT EXISTS estimated_value_raw numeric(10,2),
ADD COLUMN IF NOT EXISTS estimated_value_graded numeric(10,2),
ADD COLUMN IF NOT EXISTS value_increase_percent numeric(5,2);