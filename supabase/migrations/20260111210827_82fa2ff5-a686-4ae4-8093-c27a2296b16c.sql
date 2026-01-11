-- Make category nullable with a default value for grading orders
-- Category is no longer needed as grading works for all TCG types

ALTER TABLE public.grading_orders 
ALTER COLUMN category SET DEFAULT 'tcg',
ALTER COLUMN category DROP NOT NULL;

-- Update existing records that have 'pokemon' hardcoded to 'tcg'
UPDATE public.grading_orders 
SET category = 'tcg' 
WHERE category = 'pokemon';