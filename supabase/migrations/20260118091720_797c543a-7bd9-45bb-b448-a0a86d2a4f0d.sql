-- =====================================================
-- Sample Listings System - Database Schema Updates
-- =====================================================

-- 1. Create sample_listing_batches table for tracking (before altering listings)
CREATE TABLE IF NOT EXISTS public.sample_listing_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  games text[] NOT NULL,
  listings_count integer NOT NULL DEFAULT 0,
  source_tag text NOT NULL,
  notes text NULL
);

-- Enable RLS on sample_listing_batches
ALTER TABLE public.sample_listing_batches ENABLE ROW LEVEL SECURITY;

-- Everyone can view sample batches (for display purposes)
CREATE POLICY "Anyone can view sample batches"
ON public.sample_listing_batches
FOR SELECT
USING (true);

-- 2. Add sample listing columns to listings table
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS sample_batch_id uuid REFERENCES public.sample_listing_batches(id),
ADD COLUMN IF NOT EXISTS source_tag text NULL,
ADD COLUMN IF NOT EXISTS canonical_card_key text NULL,
ADD COLUMN IF NOT EXISTS canonical_variant_key text NULL;

-- 3. Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_listings_canonical_card_key ON public.listings(canonical_card_key) WHERE canonical_card_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_is_sample_status ON public.listings(is_sample, status);
CREATE INDEX IF NOT EXISTS idx_listings_price ON public.listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_sample_batch_id ON public.listings(sample_batch_id) WHERE sample_batch_id IS NOT NULL;

-- 4. Update existing pricecharting listings to be marked as samples
UPDATE public.listings
SET 
  is_sample = true,
  source_tag = 'seed:pricecharting:v1'
WHERE source = 'pricecharting' AND is_sample = false;