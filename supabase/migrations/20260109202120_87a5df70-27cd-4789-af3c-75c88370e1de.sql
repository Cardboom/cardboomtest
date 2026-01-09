
-- Drop the unique index and recreate as non-unique
DROP INDEX IF EXISTS idx_market_items_cvi_key;
CREATE INDEX idx_market_items_cvi_key ON market_items(cvi_key);
