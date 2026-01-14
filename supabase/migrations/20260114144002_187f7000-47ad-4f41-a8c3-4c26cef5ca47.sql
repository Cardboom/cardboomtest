-- Add Enterprise-exclusive storefront features
ALTER TABLE public.creator_storefronts 
ADD COLUMN IF NOT EXISTS accent_color text,
ADD COLUMN IF NOT EXISTS custom_css text,
ADD COLUMN IF NOT EXISTS show_trust_badge boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS featured_listing_ids uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS announcement_text text,
ADD COLUMN IF NOT EXISTS announcement_active boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS store_type text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS verified_seller_since timestamp with time zone,
ADD COLUMN IF NOT EXISTS priority_placement boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS analytics_enabled boolean DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.creator_storefronts.store_type IS 'standard, pro, enterprise';
COMMENT ON COLUMN public.creator_storefronts.priority_placement IS 'Enterprise feature for featured placement in search';
COMMENT ON COLUMN public.creator_storefronts.custom_css IS 'Enterprise feature for custom styling';