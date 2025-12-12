-- Add source column to listings to track where they came from
ALTER TABLE public.listings 
ADD COLUMN source text DEFAULT 'user' NOT NULL,
ADD COLUMN external_id text,
ADD COLUMN external_price numeric;

-- Add unique constraint to prevent duplicate external listings
CREATE UNIQUE INDEX idx_listings_external_source ON public.listings (source, external_id) WHERE external_id IS NOT NULL;

-- Create a platform seller account for auto-generated listings
-- This will be used as seller_id for automated listings