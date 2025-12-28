-- Add market_item_id column to price_history for direct linking
ALTER TABLE public.price_history 
ADD COLUMN IF NOT EXISTS market_item_id uuid REFERENCES public.market_items(id);

-- Add volume and sample_count for data quality tracking
ALTER TABLE public.price_history 
ADD COLUMN IF NOT EXISTS volume integer DEFAULT 0;

ALTER TABLE public.price_history 
ADD COLUMN IF NOT EXISTS sample_count integer DEFAULT 1;

-- Create index for faster lookups by market_item_id
CREATE INDEX IF NOT EXISTS idx_price_history_market_item_id 
ON public.price_history(market_item_id);

-- Create index for faster date range queries
CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at 
ON public.price_history(recorded_at DESC);

-- Create composite index for efficient item+date queries
CREATE INDEX IF NOT EXISTS idx_price_history_item_date 
ON public.price_history(market_item_id, recorded_at DESC);

-- Enable RLS
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Anyone can read price history (public data)
DROP POLICY IF EXISTS "Anyone can view price history" ON public.price_history;
CREATE POLICY "Anyone can view price history" 
ON public.price_history FOR SELECT 
USING (true);

-- System can insert price history records
DROP POLICY IF EXISTS "System can insert price history" ON public.price_history;
CREATE POLICY "System can insert price history" 
ON public.price_history FOR INSERT 
WITH CHECK (true);