-- Add is_open_to_offers to listings for offer-only listings
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS is_open_to_offers boolean DEFAULT false;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_listings_open_to_offers ON public.listings(is_open_to_offers) WHERE is_open_to_offers = true;

-- Comment
COMMENT ON COLUMN public.listings.is_open_to_offers IS 'If true, listing has no fixed price and accepts offers only';