-- Add grading speed tier to grading_orders
ALTER TABLE grading_orders 
ADD COLUMN IF NOT EXISTS speed_tier text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS estimated_days_min integer DEFAULT 4,
ADD COLUMN IF NOT EXISTS estimated_days_max integer DEFAULT 7,
ADD COLUMN IF NOT EXISTS estimated_completion_at timestamp with time zone;

-- Add boost columns to listings
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS boost_tier text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS boost_expires_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS boost_purchased_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS boost_price_paid numeric DEFAULT NULL;

-- Create simple index for boosts (no predicate with now())
CREATE INDEX IF NOT EXISTS idx_listings_boost_expires ON listings(boost_expires_at) WHERE boost_tier IS NOT NULL;

-- Comment the speed tiers
COMMENT ON COLUMN grading_orders.speed_tier IS 'standard = 4-7 days ($10), express = 3-5 days ($15), priority = 1-2 days ($25)';