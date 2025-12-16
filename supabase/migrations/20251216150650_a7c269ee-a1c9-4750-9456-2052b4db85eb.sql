-- Create achievements catalog table
CREATE TABLE public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT '🏆',
  category text NOT NULL DEFAULT 'general',
  tier text NOT NULL DEFAULT 'bronze',
  xp_reward integer NOT NULL DEFAULT 50,
  requirement_type text NOT NULL,
  requirement_value integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user achievements table
CREATE TABLE public.user_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at timestamp with time zone NOT NULL DEFAULT now(),
  progress integer NOT NULL DEFAULT 0,
  UNIQUE(user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Achievements catalog policies - anyone can view
CREATE POLICY "Anyone can view achievements" ON public.achievements
  FOR SELECT USING (is_active = true);

-- User achievements policies
CREATE POLICY "Anyone can view user achievements" ON public.user_achievements
  FOR SELECT USING (true);

CREATE POLICY "System can insert user achievements" ON public.user_achievements
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update user achievements" ON public.user_achievements
  FOR UPDATE USING (true);

-- Insert default achievements
INSERT INTO public.achievements (key, name, description, icon, category, tier, xp_reward, requirement_type, requirement_value) VALUES
-- Holding achievements
('diamond_hands_30', 'Diamond Hands (30 Days)', 'Held a card for 30 days', '💎', 'holding', 'bronze', 50, 'hold_days', 30),
('diamond_hands_90', 'Diamond Hands (90 Days)', 'Held a card for 90 days', '💎', 'holding', 'silver', 100, 'hold_days', 90),
('diamond_hands_180', 'Diamond Hands (180 Days)', 'Held a card for 180 days', '💎', 'holding', 'gold', 200, 'hold_days', 180),
('diamond_hands_365', 'Diamond Hands (1 Year)', 'Held a card for 365 days', '💎', 'holding', 'platinum', 500, 'hold_days', 365),

-- Trading achievements
('first_flip', 'First Flip', 'Sold your first card for profit', '🔄', 'trading', 'bronze', 25, 'profitable_sales', 1),
('savvy_trader', 'Savvy Trader', 'Flipped 10 cards profitably', '📈', 'trading', 'silver', 150, 'profitable_sales', 10),
('master_flipper', 'Master Flipper', 'Flipped 50 cards profitably', '🚀', 'trading', 'gold', 400, 'profitable_sales', 50),
('whale_trader', 'Whale Trader', 'Traded over $10,000 in volume', '🐋', 'trading', 'platinum', 1000, 'trade_volume', 10000),

-- Engagement achievements
('top_viewer_week', 'Top 1% Viewer', 'Top 1% most active viewer this week', '👁️', 'engagement', 'gold', 100, 'top_viewer_percent', 1),
('market_watcher', 'Market Watcher', 'Viewed 100 different cards', '🔍', 'engagement', 'bronze', 30, 'cards_viewed', 100),
('devoted_collector', 'Devoted Collector', 'Visited the platform 30 days in a row', '🔥', 'engagement', 'gold', 300, 'login_streak', 30),

-- Collection achievements
('starter_collector', 'Starter Collector', 'Added 10 cards to portfolio', '📦', 'collection', 'bronze', 25, 'portfolio_count', 10),
('serious_collector', 'Serious Collector', 'Added 50 cards to portfolio', '📦', 'collection', 'silver', 100, 'portfolio_count', 50),
('elite_collector', 'Elite Collector', 'Added 100 cards to portfolio', '📦', 'collection', 'gold', 250, 'portfolio_count', 100),

-- Social achievements
('community_member', 'Community Member', 'Made your first review', '⭐', 'social', 'bronze', 20, 'reviews_given', 1),
('trusted_reviewer', 'Trusted Reviewer', 'Given 10 reviews', '⭐', 'social', 'silver', 75, 'reviews_given', 10),
('influencer', 'Influencer', 'Gained 50 followers', '👥', 'social', 'gold', 200, 'followers_count', 50),

-- Special achievements
('beta_tester', 'Beta Tester', 'Joined during the beta period', '🧪', 'special', 'platinum', 500, 'special', 0),
('verified_seller', 'Verified Seller', 'Became a verified seller', '✅', 'special', 'gold', 200, 'special', 0),
('first_sale', 'First Sale', 'Made your first sale', '🎉', 'special', 'bronze', 50, 'sales_count', 1),
('first_purchase', 'First Purchase', 'Made your first purchase', '🛒', 'special', 'bronze', 50, 'purchases_count', 1);