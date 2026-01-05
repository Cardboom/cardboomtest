-- Add card indexing fields to market_items for CardBoom Card Indexer
-- These fields enable deterministic card identification via cvi_key

ALTER TABLE public.market_items
ADD COLUMN IF NOT EXISTS set_code text,
ADD COLUMN IF NOT EXISTS card_number text,
ADD COLUMN IF NOT EXISTS language text DEFAULT 'English',
ADD COLUMN IF NOT EXISTS cvi_key text,
ADD COLUMN IF NOT EXISTS card_type text,
ADD COLUMN IF NOT EXISTS ai_confidence numeric,
ADD COLUMN IF NOT EXISTS ai_indexed_at timestamp with time zone;

-- Create unique index on cvi_key for upsert operations
CREATE UNIQUE INDEX IF NOT EXISTS idx_market_items_cvi_key ON public.market_items(cvi_key) WHERE cvi_key IS NOT NULL;

-- Also add market_item_id to listings table for proper linking
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS market_item_id uuid REFERENCES public.market_items(id),
ADD COLUMN IF NOT EXISTS set_name text,
ADD COLUMN IF NOT EXISTS set_code text,
ADD COLUMN IF NOT EXISTS card_number text,
ADD COLUMN IF NOT EXISTS rarity text,
ADD COLUMN IF NOT EXISTS language text DEFAULT 'English',
ADD COLUMN IF NOT EXISTS cvi_key text,
ADD COLUMN IF NOT EXISTS ai_confidence numeric;

-- Add fields to grading_orders for card identification
ALTER TABLE public.grading_orders
ADD COLUMN IF NOT EXISTS card_name text,
ADD COLUMN IF NOT EXISTS set_name text,
ADD COLUMN IF NOT EXISTS set_code text,
ADD COLUMN IF NOT EXISTS card_number text,
ADD COLUMN IF NOT EXISTS rarity text,
ADD COLUMN IF NOT EXISTS language text DEFAULT 'English',
ADD COLUMN IF NOT EXISTS cvi_key text,
ADD COLUMN IF NOT EXISTS market_item_id uuid REFERENCES public.market_items(id),
ADD COLUMN IF NOT EXISTS ai_confidence numeric;