-- Add source_listing_id to grading_orders to link to existing listings
ALTER TABLE public.grading_orders 
ADD COLUMN IF NOT EXISTS source_listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL;

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_grading_orders_source_listing ON public.grading_orders(source_listing_id) WHERE source_listing_id IS NOT NULL;

-- Add front_image_url and back_image_url columns to listings for grading
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS front_image_url TEXT,
ADD COLUMN IF NOT EXISTS back_image_url TEXT;

-- Add grading result columns to listings
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS cbgi_score NUMERIC,
ADD COLUMN IF NOT EXISTS cbgi_grade_label TEXT,
ADD COLUMN IF NOT EXISTS cbgi_completed_at TIMESTAMP WITH TIME ZONE;