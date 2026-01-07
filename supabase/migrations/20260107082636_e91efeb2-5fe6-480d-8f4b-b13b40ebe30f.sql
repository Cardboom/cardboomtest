-- Add grading_order_id to listings for tracking certification status
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS grading_order_id UUID REFERENCES public.grading_orders(id),
ADD COLUMN IF NOT EXISTS certification_status TEXT DEFAULT 'none' CHECK (certification_status IN ('none', 'pending', 'completed'));

-- Add listing_id to grading_orders so we can link back when grading completes
ALTER TABLE public.grading_orders 
ADD COLUMN IF NOT EXISTS listing_created_id UUID REFERENCES public.listings(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_listings_grading_order_id ON public.listings(grading_order_id) WHERE grading_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_grading_orders_listing_created_id ON public.grading_orders(listing_created_id) WHERE listing_created_id IS NOT NULL;