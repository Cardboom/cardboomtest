
-- Step 1: Add new pricing columns
ALTER TABLE market_items
  ADD COLUMN IF NOT EXISTS price_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verified_price NUMERIC,
  ADD COLUMN IF NOT EXISTS verified_source TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS listing_median_price NUMERIC,
  ADD COLUMN IF NOT EXISTS listing_sample_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS variant TEXT DEFAULT 'regular';

-- Step 2: Make current_price nullable (cleanest approach)
ALTER TABLE market_items
  ALTER COLUMN current_price DROP NOT NULL,
  ALTER COLUMN current_price DROP DEFAULT;

-- Step 3: Create index on cvi_key for fast lookups
CREATE INDEX IF NOT EXISTS idx_market_items_cvi_key ON market_items(cvi_key);

-- Step 4: Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_market_items_category_price_status ON market_items(category, price_status);

-- Step 5: Add check constraint for valid price_status values
ALTER TABLE market_items
  ADD CONSTRAINT chk_price_status 
  CHECK (price_status IN ('verified', 'estimated', 'listing_only', 'pending', 'insufficient_data'));
