-- =====================================================
-- CARDBOOM SEED DATA
-- Run this after all schema migrations
-- =====================================================

-- =====================================================
-- ACHIEVEMENTS
-- =====================================================
INSERT INTO public.achievements (key, name, description, icon, category, tier, xp_reward, requirement_type, requirement_value) VALUES
  ('first_purchase', 'First Purchase', 'Complete your first purchase', '🛒', 'trading', 'bronze', 50, 'purchase_count', 1),
  ('first_sale', 'First Sale', 'Complete your first sale', '💰', 'trading', 'bronze', 50, 'sale_count', 1),
  ('first_listing', 'First Listing', 'Create your first listing', '📝', 'trading', 'bronze', 25, 'listing_count', 1),
  ('collector_10', 'Budding Collector', 'Add 10 items to your portfolio', '📦', 'collection', 'bronze', 100, 'portfolio_count', 10),
  ('collector_50', 'Serious Collector', 'Add 50 items to your portfolio', '🗄️', 'collection', 'silver', 250, 'portfolio_count', 50),
  ('collector_100', 'Master Collector', 'Add 100 items to your portfolio', '🏛️', 'collection', 'gold', 500, 'portfolio_count', 100),
  ('trades_5', 'Trader', 'Complete 5 trades', '🤝', 'trading', 'bronze', 100, 'trade_count', 5),
  ('trades_25', 'Deal Maker', 'Complete 25 trades', '📊', 'trading', 'silver', 250, 'trade_count', 25),
  ('trades_100', 'Trading Legend', 'Complete 100 trades', '👑', 'trading', 'gold', 500, 'trade_count', 100),
  ('streak_7', 'Week Warrior', 'Log in 7 days in a row', '🔥', 'engagement', 'bronze', 100, 'login_streak', 7),
  ('streak_30', 'Monthly Master', 'Log in 30 days in a row', '⚡', 'engagement', 'silver', 300, 'login_streak', 30),
  ('streak_100', 'Dedicated Collector', 'Log in 100 days in a row', '💎', 'engagement', 'gold', 1000, 'login_streak', 100),
  ('first_review', 'First Review', 'Leave your first review', '⭐', 'community', 'bronze', 25, 'review_count', 1),
  ('reviews_10', 'Helpful Reviewer', 'Leave 10 reviews', '🌟', 'community', 'silver', 150, 'review_count', 10),
  ('first_referral', 'First Referral', 'Refer your first friend', '👋', 'community', 'bronze', 100, 'referral_count', 1),
  ('referrals_5', 'Community Builder', 'Refer 5 friends', '🏗️', 'community', 'silver', 300, 'referral_count', 5),
  ('watchlist_10', 'Market Watcher', 'Add 10 items to watchlist', '👀', 'engagement', 'bronze', 50, 'watchlist_count', 10),
  ('price_alert_hit', 'Alert Master', 'Have a price alert trigger', '🔔', 'engagement', 'bronze', 75, 'alert_triggered', 1),
  ('verified_seller', 'Verified Seller', 'Become a verified seller', '✅', 'seller', 'gold', 500, 'verified_seller', 1),
  ('first_follow', 'Social Butterfly', 'Follow your first user', '🦋', 'community', 'bronze', 25, 'follow_count', 1),
  ('follows_10', 'Network Builder', 'Follow 10 users', '🌐', 'community', 'silver', 100, 'follow_count', 10),
  ('follower_10', 'Rising Star', 'Get 10 followers', '⭐', 'community', 'silver', 150, 'follower_count', 10),
  ('follower_100', 'Influencer', 'Get 100 followers', '🌟', 'community', 'gold', 500, 'follower_count', 100),
  ('level_5', 'Apprentice', 'Reach level 5', '📈', 'progression', 'bronze', 100, 'level', 5),
  ('level_10', 'Expert', 'Reach level 10', '📊', 'progression', 'silver', 250, 'level', 10),
  ('level_25', 'Master', 'Reach level 25', '🏆', 'progression', 'gold', 500, 'level', 25),
  ('level_50', 'Legend', 'Reach level 50', '👑', 'progression', 'platinum', 1000, 'level', 50),
  ('first_discussion', 'Discussion Starter', 'Post your first comment in discussions', '💬', 'community', 'bronze', 50, 'discussion_count', 1),
  ('discussions_10', 'Active Discusser', 'Post 10 discussion comments', '🗣️', 'community', 'silver', 150, 'discussion_count', 10),
  ('first_bid', 'First Bid', 'Place your first bid on wanted board', '🎯', 'trading', 'bronze', 50, 'bid_count', 1)
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- PROFILE BACKGROUNDS
-- =====================================================
INSERT INTO public.profile_backgrounds (name, key, css_class, unlock_type, unlock_requirement) VALUES
  ('Default', 'default', 'bg-gradient-to-br from-background to-muted', 'free', NULL),
  ('Midnight Blue', 'midnight', 'bg-gradient-to-br from-blue-900 to-slate-900', 'free', NULL),
  ('Forest Green', 'forest', 'bg-gradient-to-br from-green-900 to-emerald-950', 'free', NULL),
  ('Sunset Orange', 'sunset', 'bg-gradient-to-br from-orange-600 to-red-800', 'level', 'level_5'),
  ('Royal Purple', 'royal', 'bg-gradient-to-br from-purple-900 to-indigo-950', 'level', 'level_10'),
  ('Golden Hour', 'golden', 'bg-gradient-to-br from-yellow-600 to-amber-800', 'achievement', 'trades_25'),
  ('Ocean Deep', 'ocean', 'bg-gradient-to-br from-cyan-800 to-blue-950', 'achievement', 'collector_50'),
  ('Fire Storm', 'fire', 'bg-gradient-to-br from-red-600 to-orange-700', 'achievement', 'streak_30'),
  ('Northern Lights', 'aurora', 'bg-gradient-to-br from-green-400 via-purple-500 to-blue-600', 'level', 'level_25'),
  ('Diamond', 'diamond', 'bg-gradient-to-br from-slate-200 via-slate-400 to-slate-600', 'achievement', 'trading_legend'),
  ('Holo Rainbow', 'holo', 'bg-gradient-to-r from-pink-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500', 'level', 'level_50'),
  ('Premium Gold', 'premium_gold', 'bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600', 'subscription', 'pro')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- REWARDS CATALOG
-- =====================================================
INSERT INTO public.rewards_catalog (name, description, type, xp_cost, value, is_active) VALUES
  ('$5 Voucher', 'Get $5 off your next purchase', 'voucher', 500, 5, true),
  ('$10 Voucher', 'Get $10 off your next purchase', 'voucher', 900, 10, true),
  ('$25 Voucher', 'Get $25 off your next purchase', 'voucher', 2000, 25, true),
  ('Free Standard Shipping', 'Free shipping on your next order', 'free_shipping', 300, 5, true),
  ('Free Express Shipping', 'Free express shipping on your next order', 'free_shipping', 600, 15, true),
  ('Early Access Pass', 'Get early access to new listings for 7 days', 'early_access', 1000, 7, true),
  ('Premium Early Access', 'Get early access to new listings for 30 days', 'early_access', 3500, 30, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- DATA ACCESS LEVELS
-- =====================================================
INSERT INTO public.data_access_levels (data_type, field_name, access_level, description) VALUES
  ('price', 'current_price', 'public', 'Current market price'),
  ('price', 'change_24h', 'public', '24-hour price change'),
  ('price', 'change_7d', 'free', '7-day price change'),
  ('price', 'change_30d', 'free', '30-day price change'),
  ('price', 'price_history', 'pro', 'Historical price data'),
  ('market', 'volume_24h', 'free', '24-hour trading volume'),
  ('market', 'liquidity', 'pro', 'Market liquidity indicators'),
  ('market', 'sales_count', 'pro', 'Recent sales count'),
  ('analytics', 'price_prediction', 'pro', 'AI price predictions'),
  ('analytics', 'market_sentiment', 'pro', 'Market sentiment analysis'),
  ('analytics', 'exit_velocity', 'pro', 'Time to sell metrics'),
  ('portfolio', 'heat_score', 'pro', 'Portfolio heat score')
ON CONFLICT (data_type, field_name) DO NOTHING;

-- =====================================================
-- PLATFORM SETTINGS
-- =====================================================
INSERT INTO public.platform_settings (key, value, description) VALUES
  ('buyer_fee_percent', '2.5', 'Buyer fee percentage'),
  ('seller_fee_percent', '5', 'Seller fee percentage'),
  ('min_listing_price', '1', 'Minimum listing price in USD'),
  ('max_listing_price', '100000', 'Maximum listing price in USD'),
  ('referral_reward', '5', 'Referral reward in USD'),
  ('referral_commission_percent', '1', 'Ongoing referral commission percentage'),
  ('card_mood_index', '"neutral"', 'Current market mood index'),
  ('maintenance_mode', 'false', 'Is the platform in maintenance mode')
ON CONFLICT (key) DO NOTHING;
