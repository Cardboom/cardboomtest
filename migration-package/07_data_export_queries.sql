-- =====================================================
-- CARDBOOM DATA EXPORT QUERIES
-- =====================================================
-- Run these in your CURRENT Supabase SQL Editor to export data
-- Then import into the NEW project

-- =====================================================
-- EXPORT MARKET ITEMS (Batch 1 of 8 - ~4500 each)
-- =====================================================
-- Copy results as CSV and import to new project

-- Batch 1
SELECT * FROM market_items ORDER BY id LIMIT 5000 OFFSET 0;

-- Batch 2
SELECT * FROM market_items ORDER BY id LIMIT 5000 OFFSET 5000;

-- Batch 3
SELECT * FROM market_items ORDER BY id LIMIT 5000 OFFSET 10000;

-- Batch 4
SELECT * FROM market_items ORDER BY id LIMIT 5000 OFFSET 15000;

-- Batch 5
SELECT * FROM market_items ORDER BY id LIMIT 5000 OFFSET 20000;

-- Batch 6
SELECT * FROM market_items ORDER BY id LIMIT 5000 OFFSET 25000;

-- Batch 7
SELECT * FROM market_items ORDER BY id LIMIT 5000 OFFSET 30000;

-- Batch 8
SELECT * FROM market_items ORDER BY id LIMIT 5000 OFFSET 35000;

-- =====================================================
-- EXPORT PRICE HISTORY
-- =====================================================
SELECT * FROM price_history ORDER BY recorded_at;

-- =====================================================
-- EXPORT LISTINGS
-- =====================================================
SELECT * FROM listings ORDER BY created_at;

-- =====================================================
-- EXPORT OTHER TABLES (run as needed)
-- =====================================================

-- Achievements (if not using seed data)
SELECT * FROM achievements ORDER BY created_at;

-- Profile backgrounds
SELECT * FROM profile_backgrounds ORDER BY id;

-- Reward tiers
SELECT * FROM reward_tiers ORDER BY min_referrals;

-- Market item grades
SELECT * FROM market_item_grades ORDER BY market_item_id;

-- Discussions
SELECT * FROM discussions ORDER BY created_at;

-- Discussion comments
SELECT * FROM discussion_comments ORDER BY created_at;
