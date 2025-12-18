-- =====================================================
-- ACHIEVEMENTS DATA EXPORT
-- Run this in your NEW Supabase SQL Editor
-- =====================================================

INSERT INTO achievements (id, key, name, description, icon, requirement_type, requirement_value, xp_reward, tier, category, is_active, created_at) VALUES
('2dbf79d3-3c12-49b8-9360-2e416ffbb541', 'diamond_hands_30', 'Diamond Hands (30 Days)', 'Held a card for 30 days', '💎', 'hold_days', 30, 50, 'bronze', 'holding', true, '2025-12-16 15:06:49.859156+00'),
('bd5d8478-8baa-40df-bc1b-b0881dfd0ee6', 'diamond_hands_90', 'Diamond Hands (90 Days)', 'Held a card for 90 days', '💎', 'hold_days', 90, 100, 'silver', 'holding', true, '2025-12-16 15:06:49.859156+00'),
('8e70c99c-5b87-4d90-9977-bd74ce0fe89e', 'diamond_hands_180', 'Diamond Hands (180 Days)', 'Held a card for 180 days', '💎', 'hold_days', 180, 200, 'gold', 'holding', true, '2025-12-16 15:06:49.859156+00'),
('af6bdc5d-efdf-47d4-8093-81dc13b5a4cb', 'diamond_hands_365', 'Diamond Hands (1 Year)', 'Held a card for 365 days', '💎', 'hold_days', 365, 500, 'platinum', 'holding', true, '2025-12-16 15:06:49.859156+00'),
('d7778cba-72e4-426f-b0f9-9dfcbc13780f', 'first_flip', 'First Flip', 'Sold your first card for profit', '🔄', 'profitable_sales', 1, 25, 'bronze', 'trading', true, '2025-12-16 15:06:49.859156+00'),
('56237311-91b6-4dee-9e24-691d768f7108', 'savvy_trader', 'Savvy Trader', 'Flipped 10 cards profitably', '📈', 'profitable_sales', 10, 150, 'silver', 'trading', true, '2025-12-16 15:06:49.859156+00'),
('fdd47827-9716-47e2-8ab3-035aab4424de', 'master_flipper', 'Master Flipper', 'Flipped 50 cards profitably', '🚀', 'profitable_sales', 50, 400, 'gold', 'trading', true, '2025-12-16 15:06:49.859156+00'),
('012146b2-dc1e-4478-ae64-424473783ff3', 'whale_trader', 'Whale Trader', 'Traded over $10,000 in volume', '🐋', 'trade_volume', 10000, 1000, 'platinum', 'trading', true, '2025-12-16 15:06:49.859156+00'),
('7c74c78f-0738-463e-b756-593f7be695ce', 'top_viewer_week', 'Top 1% Viewer', 'Top 1% most active viewer this week', '👁️', 'top_viewer_percent', 1, 100, 'gold', 'engagement', true, '2025-12-16 15:06:49.859156+00'),
('0904ddeb-9f43-48f4-90b6-13e5ebf9c677', 'market_watcher', 'Market Watcher', 'Viewed 100 different cards', '🔍', 'cards_viewed', 100, 30, 'bronze', 'engagement', true, '2025-12-16 15:06:49.859156+00'),
('7be89868-659a-4de9-a476-a6f5cf0ecf70', 'devoted_collector', 'Devoted Collector', 'Visited the platform 30 days in a row', '🔥', 'login_streak', 30, 300, 'gold', 'engagement', true, '2025-12-16 15:06:49.859156+00'),
('c36dd897-130b-4fd3-8de0-f685abc42b3c', 'starter_collector', 'Starter Collector', 'Added 10 cards to portfolio', '📦', 'portfolio_count', 10, 25, 'bronze', 'collection', true, '2025-12-16 15:06:49.859156+00'),
('d8ce1a9c-61a0-49fb-99a2-109220cb64be', 'serious_collector', 'Serious Collector', 'Added 50 cards to portfolio', '📦', 'portfolio_count', 50, 100, 'silver', 'collection', true, '2025-12-16 15:06:49.859156+00'),
('b58dca36-ce43-4dc6-ab21-4cb11ece0e32', 'elite_collector', 'Elite Collector', 'Added 100 cards to portfolio', '📦', 'portfolio_count', 100, 250, 'gold', 'collection', true, '2025-12-16 15:06:49.859156+00'),
('c9e2ff57-e247-4bf2-a0a5-3a73f2709ddd', 'community_member', 'Community Member', 'Made your first review', '⭐', 'reviews_given', 1, 20, 'bronze', 'social', true, '2025-12-16 15:06:49.859156+00'),
('16b708c5-010d-49fa-acc4-5c46f1f76c3d', 'trusted_reviewer', 'Trusted Reviewer', 'Given 10 reviews', '⭐', 'reviews_given', 10, 75, 'silver', 'social', true, '2025-12-16 15:06:49.859156+00'),
('7f32ac6f-ce33-486d-be48-28a5ca6c4d8d', 'influencer', 'Influencer', 'Gained 50 followers', '👥', 'followers_count', 50, 200, 'gold', 'social', true, '2025-12-16 15:06:49.859156+00'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'first_purchase', 'First Purchase', 'Made your first purchase', '🛒', 'purchases', 1, 50, 'bronze', 'trading', true, '2025-12-16 15:06:49.859156+00'),
('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'big_spender', 'Big Spender', 'Spent over $1,000', '💰', 'spend_amount', 1000, 200, 'silver', 'trading', true, '2025-12-16 15:06:49.859156+00'),
('c3d4e5f6-a7b8-9012-cdef-345678901234', 'whale_buyer', 'Whale Buyer', 'Spent over $10,000', '🐋', 'spend_amount', 10000, 500, 'gold', 'trading', true, '2025-12-16 15:06:49.859156+00'),
('d4e5f6a7-b8c9-0123-defa-456789012345', 'first_sale', 'First Sale', 'Made your first sale', '💵', 'sales', 1, 50, 'bronze', 'trading', true, '2025-12-16 15:06:49.859156+00'),
('e5f6a7b8-c9d0-1234-efab-567890123456', 'active_seller', 'Active Seller', 'Made 10 sales', '📊', 'sales', 10, 150, 'silver', 'trading', true, '2025-12-16 15:06:49.859156+00'),
('f6a7b8c9-d0e1-2345-fabc-678901234567', 'power_seller', 'Power Seller', 'Made 50 sales', '⚡', 'sales', 50, 400, 'gold', 'trading', true, '2025-12-16 15:06:49.859156+00'),
('a7b8c9d0-e1f2-3456-abcd-789012345678', 'verified_seller', 'Verified Seller', 'Completed seller verification', '✅', 'verification', 1, 100, 'silver', 'trust', true, '2025-12-16 15:06:49.859156+00'),
('b8c9d0e1-f2a3-4567-bcde-890123456789', 'first_watchlist', 'First Watchlist', 'Added first item to watchlist', '👁️', 'watchlist_items', 1, 10, 'bronze', 'engagement', true, '2025-12-16 15:06:49.859156+00'),
('c9d0e1f2-a3b4-5678-cdef-901234567890', 'avid_watcher', 'Avid Watcher', 'Watching 25 items', '🔭', 'watchlist_items', 25, 50, 'silver', 'engagement', true, '2025-12-16 15:06:49.859156+00'),
('d0e1f2a3-b4c5-6789-defa-012345678901', 'streak_7', 'Week Warrior', 'Logged in 7 days in a row', '🔥', 'login_streak', 7, 50, 'bronze', 'engagement', true, '2025-12-16 15:06:49.859156+00'),
('e1f2a3b4-c5d6-7890-efab-123456789012', 'streak_30', 'Monthly Master', 'Logged in 30 days in a row', '🔥', 'login_streak', 30, 200, 'silver', 'engagement', true, '2025-12-16 15:06:49.859156+00'),
('f2a3b4c5-d6e7-8901-fabc-234567890123', 'streak_100', 'Centurion', 'Logged in 100 days in a row', '🏆', 'login_streak', 100, 500, 'gold', 'engagement', true, '2025-12-16 15:06:49.859156+00'),
('a3b4c5d6-e7f8-9012-abcd-345678901234', 'referral_1', 'First Referral', 'Referred your first friend', '🤝', 'referrals', 1, 100, 'bronze', 'social', true, '2025-12-16 15:06:49.859156+00'),
('b4c5d6e7-f8a9-0123-bcde-456789012345', 'referral_5', 'Networking Pro', 'Referred 5 friends', '🌐', 'referrals', 5, 300, 'silver', 'social', true, '2025-12-16 15:06:49.859156+00'),
('c5d6e7f8-a9b0-1234-cdef-567890123456', 'referral_10', 'Ambassador', 'Referred 10 friends', '🏅', 'referrals', 10, 750, 'gold', 'social', true, '2025-12-16 15:06:49.859156+00')
ON CONFLICT (id) DO NOTHING;
