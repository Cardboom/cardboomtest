-- Add unique constraint on external_id for market_items to enable upsert
CREATE UNIQUE INDEX IF NOT EXISTS market_items_external_id_unique 
ON public.market_items (external_id) 
WHERE external_id IS NOT NULL;