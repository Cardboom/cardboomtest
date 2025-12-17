
-- Portfolio Heat Scores - daily psychological engagement metric
CREATE TABLE public.portfolio_heat_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  price_movement_score INTEGER DEFAULT 0,
  views_score INTEGER DEFAULT 0,
  liquidity_score INTEGER DEFAULT 0,
  calculated_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, calculated_at)
);

-- Shadow Wishlist - silently tracked items
CREATE TABLE public.shadow_wishlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  market_item_id UUID REFERENCES public.market_items(id) ON DELETE CASCADE,
  view_duration_seconds INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 1,
  search_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, market_item_id)
);

-- User Generated Market Signals (UGMS)
CREATE TABLE public.user_market_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  market_item_id UUID REFERENCES public.market_items(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('price_fair', 'would_buy')),
  signal_value TEXT NOT NULL CHECK (signal_value IN ('high', 'fair', 'low', 'yes', 'maybe', 'no')),
  price_at_signal NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Auto-Relist Settings per listing
CREATE TABLE public.auto_relist_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE UNIQUE,
  seller_id UUID NOT NULL,
  enabled BOOLEAN DEFAULT false,
  price_ladder_enabled BOOLEAN DEFAULT false,
  price_reduction_percent NUMERIC DEFAULT 2 CHECK (price_reduction_percent >= 1 AND price_reduction_percent <= 10),
  reduction_interval_hours INTEGER DEFAULT 48,
  min_price NUMERIC,
  original_price NUMERIC NOT NULL,
  current_suggested_price NUMERIC,
  last_reduction_at TIMESTAMP WITH TIME ZONE,
  days_until_suggest INTEGER DEFAULT 7,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Reference Listings (Synthetic Liquidity)
CREATE TABLE public.reference_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  market_item_id UUID REFERENCES public.market_items(id) ON DELETE CASCADE,
  reference_price NUMERIC NOT NULL,
  price_source TEXT NOT NULL DEFAULT 'aggregated',
  confidence_level TEXT DEFAULT 'medium' CHECK (confidence_level IN ('low', 'medium', 'high')),
  sample_size INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Reputation Events tracking
CREATE TABLE public.reputation_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('trade_completed', 'accurate_listing', 'dispute_won', 'dispute_lost', 'fast_shipping', 'positive_review', 'negative_review', 'inactivity_decay')),
  points_change INTEGER NOT NULL,
  reference_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add reputation and activation fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS reputation_tier TEXT DEFAULT 'bronze' CHECK (reputation_tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
ADD COLUMN IF NOT EXISTS first_deposit_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS first_deposit_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS activation_unlocked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_trial_expires_at TIMESTAMP WITH TIME ZONE;

-- Add exit velocity fields to market_items
ALTER TABLE public.market_items
ADD COLUMN IF NOT EXISTS avg_days_to_sell NUMERIC,
ADD COLUMN IF NOT EXISTS sale_probability NUMERIC CHECK (sale_probability >= 0 AND sale_probability <= 100),
ADD COLUMN IF NOT EXISTS volume_trend TEXT DEFAULT 'stable' CHECK (volume_trend IN ('rising', 'stable', 'falling'));

-- Enable RLS
ALTER TABLE public.portfolio_heat_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shadow_wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_market_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_relist_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reputation_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own heat scores" ON public.portfolio_heat_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage heat scores" ON public.portfolio_heat_scores FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view own shadow wishlist" ON public.shadow_wishlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage shadow wishlists" ON public.shadow_wishlists FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can submit market signals" ON public.user_market_signals FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view signals" ON public.user_market_signals FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sellers can manage own relist settings" ON public.auto_relist_settings FOR ALL USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Users can view own relist settings" ON public.auto_relist_settings FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Anyone can view reference listings" ON public.reference_listings FOR SELECT USING (is_active = true);
CREATE POLICY "System can manage reference listings" ON public.reference_listings FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view own reputation" ON public.reputation_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert reputation events" ON public.reputation_events FOR INSERT WITH CHECK (true);

-- Function to calculate portfolio heat score
CREATE OR REPLACE FUNCTION public.calculate_portfolio_heat(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price_score INTEGER := 0;
  v_views_score INTEGER := 0;
  v_liquidity_score INTEGER := 0;
  v_total_score INTEGER := 0;
BEGIN
  -- Price movement score (0-40 points)
  SELECT COALESCE(
    LEAST(40, SUM(
      CASE 
        WHEN ABS(mi.change_24h) > 10 THEN 15
        WHEN ABS(mi.change_24h) > 5 THEN 10
        WHEN ABS(mi.change_24h) > 2 THEN 5
        ELSE 2
      END
    )), 0)
  INTO v_price_score
  FROM portfolio_items pi
  JOIN market_items mi ON pi.market_item_id = mi.id
  WHERE pi.user_id = p_user_id;

  -- Views score based on listing views (0-30 points)
  SELECT COALESCE(
    LEAST(30, SUM(
      CASE 
        WHEN mi.views_24h > 50 THEN 15
        WHEN mi.views_24h > 20 THEN 10
        WHEN mi.views_24h > 5 THEN 5
        ELSE 1
      END
    )), 0)
  INTO v_views_score
  FROM portfolio_items pi
  JOIN market_items mi ON pi.market_item_id = mi.id
  WHERE pi.user_id = p_user_id;

  -- Liquidity score (0-30 points)
  SELECT COALESCE(
    LEAST(30, SUM(
      CASE mi.liquidity
        WHEN 'high' THEN 10
        WHEN 'medium' THEN 6
        ELSE 2
      END
    )), 0)
  INTO v_liquidity_score
  FROM portfolio_items pi
  JOIN market_items mi ON pi.market_item_id = mi.id
  WHERE pi.user_id = p_user_id;

  v_total_score := LEAST(100, v_price_score + v_views_score + v_liquidity_score);

  -- Upsert the score
  INSERT INTO portfolio_heat_scores (user_id, score, price_movement_score, views_score, liquidity_score, calculated_at)
  VALUES (p_user_id, v_total_score, v_price_score, v_views_score, v_liquidity_score, CURRENT_DATE)
  ON CONFLICT (user_id, calculated_at) 
  DO UPDATE SET 
    score = EXCLUDED.score,
    price_movement_score = EXCLUDED.price_movement_score,
    views_score = EXCLUDED.views_score,
    liquidity_score = EXCLUDED.liquidity_score;

  RETURN v_total_score;
END;
$$;

-- Function to update reputation
CREATE OR REPLACE FUNCTION public.update_reputation(p_user_id UUID, p_event_type TEXT, p_points INTEGER, p_reference_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_score INTEGER;
  v_new_tier TEXT;
BEGIN
  -- Insert event
  INSERT INTO reputation_events (user_id, event_type, points_change, reference_id)
  VALUES (p_user_id, p_event_type, p_points, p_reference_id);

  -- Update profile
  UPDATE profiles 
  SET reputation_score = GREATEST(0, LEAST(1000, reputation_score + p_points))
  WHERE id = p_user_id
  RETURNING reputation_score INTO v_new_score;

  -- Calculate new tier
  v_new_tier := CASE
    WHEN v_new_score >= 800 THEN 'diamond'
    WHEN v_new_score >= 600 THEN 'platinum'
    WHEN v_new_score >= 400 THEN 'gold'
    WHEN v_new_score >= 200 THEN 'silver'
    ELSE 'bronze'
  END;

  UPDATE profiles SET reputation_tier = v_new_tier WHERE id = p_user_id;

  RETURN v_new_score;
END;
$$;

-- Function to handle first deposit premium trial
CREATE OR REPLACE FUNCTION public.handle_first_deposit_premium()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this is a deposit and amount >= 10
  IF NEW.type = 'deposit' AND NEW.amount >= 10 THEN
    -- Check if user hasn't completed first deposit yet
    IF NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT user_id FROM wallets WHERE id = NEW.wallet_id)
      AND first_deposit_completed = true
    ) THEN
      -- Grant 7 days premium trial
      UPDATE profiles 
      SET 
        first_deposit_completed = true,
        first_deposit_at = now(),
        activation_unlocked = true,
        premium_trial_expires_at = now() + INTERVAL '7 days'
      WHERE id = (SELECT user_id FROM wallets WHERE id = NEW.wallet_id);
      
      -- Also create/update subscription
      INSERT INTO user_subscriptions (user_id, tier, started_at, expires_at, price_monthly, auto_renew)
      VALUES (
        (SELECT user_id FROM wallets WHERE id = NEW.wallet_id),
        'pro',
        now(),
        now() + INTERVAL '7 days',
        0,
        false
      )
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        tier = 'pro',
        started_at = now(),
        expires_at = now() + INTERVAL '7 days',
        price_monthly = 0;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for first deposit premium
DROP TRIGGER IF EXISTS on_first_deposit_premium ON public.transactions;
CREATE TRIGGER on_first_deposit_premium
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_first_deposit_premium();

-- Add unique constraint to user_subscriptions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_subscriptions_user_id_key'
  ) THEN
    ALTER TABLE public.user_subscriptions ADD CONSTRAINT user_subscriptions_user_id_key UNIQUE (user_id);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
