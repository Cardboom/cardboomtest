-- Add missing columns for Ximilar visualization URLs
ALTER TABLE grading_orders ADD COLUMN IF NOT EXISTS overlay_url TEXT;
ALTER TABLE grading_orders ADD COLUMN IF NOT EXISTS exact_url TEXT;