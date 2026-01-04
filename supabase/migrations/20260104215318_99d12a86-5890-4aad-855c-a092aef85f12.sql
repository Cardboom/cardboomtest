-- Add graded price columns to market_items for quick access
ALTER TABLE public.market_items 
ADD COLUMN IF NOT EXISTS psa10_price DECIMAL(12,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS psa9_price DECIMAL(12,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS raw_price DECIMAL(12,2) DEFAULT NULL;

-- Create index for graded price queries
CREATE INDEX IF NOT EXISTS idx_market_items_psa10_price ON public.market_items(psa10_price) WHERE psa10_price IS NOT NULL;

-- Add composite unique constraint if not exists on market_item_grades
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'market_item_grades_market_item_id_grade_key'
  ) THEN
    ALTER TABLE public.market_item_grades 
    ADD CONSTRAINT market_item_grades_market_item_id_grade_key 
    UNIQUE (market_item_id, grade);
  END IF;
EXCEPTION WHEN others THEN
  NULL; -- Ignore if already exists
END $$;