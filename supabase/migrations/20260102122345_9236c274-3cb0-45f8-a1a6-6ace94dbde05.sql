-- CardBoom Pass System Tables

-- Seasons table to track 28-day periods
CREATE TABLE public.cardboom_pass_seasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season_number INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cardboom_pass_seasons ENABLE ROW LEVEL SECURITY;

-- Everyone can view seasons
CREATE POLICY "Seasons are viewable by everyone" 
ON public.cardboom_pass_seasons 
FOR SELECT 
USING (true);

-- Tier definitions (30 tiers per season)
CREATE TABLE public.cardboom_pass_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier_number INTEGER NOT NULL CHECK (tier_number >= 1 AND tier_number <= 30),
  xp_required INTEGER NOT NULL,
  free_reward_type TEXT, -- 'gems', 'discount_cap', 'cosmetic', 'badge', null
  free_reward_value JSONB,
  pro_reward_type TEXT,
  pro_reward_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (tier_number)
);

ALTER TABLE public.cardboom_pass_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tiers are viewable by everyone" 
ON public.cardboom_pass_tiers 
FOR SELECT 
USING (true);

-- User progress tracking
CREATE TABLE public.cardboom_pass_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.cardboom_pass_seasons(id) ON DELETE CASCADE,
  current_xp INTEGER NOT NULL DEFAULT 0,
  current_tier INTEGER NOT NULL DEFAULT 0,
  is_pro BOOLEAN NOT NULL DEFAULT false,
  pro_purchased_at TIMESTAMP WITH TIME ZONE,
  claimed_tiers INTEGER[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, season_id)
);

ALTER TABLE public.cardboom_pass_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress" 
ON public.cardboom_pass_progress 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" 
ON public.cardboom_pass_progress 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" 
ON public.cardboom_pass_progress 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Insert default 30 tiers
INSERT INTO public.cardboom_pass_tiers (tier_number, xp_required, free_reward_type, free_reward_value, pro_reward_type, pro_reward_value)
VALUES
  (1, 100, 'gems', '{"amount": 5}', 'gems', '{"amount": 15}'),
  (2, 250, null, null, 'cosmetic', '{"type": "profile_border", "id": "bronze_ring"}'),
  (3, 450, 'gems', '{"amount": 10}', 'gems', '{"amount": 25}'),
  (4, 700, null, null, 'discount_cap', '{"percent": 2}'),
  (5, 1000, 'badge', '{"id": "pass_tier_5", "name": "Tier 5"}', 'badge', '{"id": "pass_pro_5", "name": "Pro Tier 5"}'),
  (6, 1350, 'gems', '{"amount": 15}', 'gems', '{"amount": 35}'),
  (7, 1750, null, null, 'cosmetic', '{"type": "avatar_frame", "id": "silver_frame"}'),
  (8, 2200, 'gems', '{"amount": 20}', 'gems', '{"amount": 50}'),
  (9, 2700, null, null, 'priority', '{"type": "support", "days": 7}'),
  (10, 3250, 'badge', '{"id": "pass_tier_10", "name": "Tier 10"}', 'badge', '{"id": "pass_pro_10", "name": "Pro Tier 10"}'),
  (11, 3850, 'gems', '{"amount": 25}', 'gems', '{"amount": 60}'),
  (12, 4500, null, null, 'cosmetic', '{"type": "profile_banner", "id": "gradient_1"}'),
  (13, 5200, 'gems', '{"amount": 30}', 'gems', '{"amount": 75}'),
  (14, 5950, null, null, 'discount_cap', '{"percent": 3}'),
  (15, 6750, 'badge', '{"id": "pass_tier_15", "name": "Tier 15"}', 'badge', '{"id": "pass_pro_15", "name": "Pro Tier 15"}'),
  (16, 7600, 'gems', '{"amount": 35}', 'gems', '{"amount": 90}'),
  (17, 8500, null, null, 'cosmetic', '{"type": "avatar_frame", "id": "gold_frame"}'),
  (18, 9450, 'gems', '{"amount": 40}', 'gems', '{"amount": 100}'),
  (19, 10450, null, null, 'priority', '{"type": "listing", "boost_percent": 10}'),
  (20, 11500, 'badge', '{"id": "pass_tier_20", "name": "Tier 20"}', 'badge', '{"id": "pass_pro_20", "name": "Pro Tier 20"}'),
  (21, 12600, 'gems', '{"amount": 50}', 'gems', '{"amount": 120}'),
  (22, 13750, null, null, 'cosmetic', '{"type": "profile_border", "id": "platinum_ring"}'),
  (23, 14950, 'gems', '{"amount": 55}', 'gems', '{"amount": 140}'),
  (24, 16200, null, null, 'discount_cap', '{"percent": 5}'),
  (25, 17500, 'badge', '{"id": "pass_tier_25", "name": "Tier 25"}', 'badge', '{"id": "pass_pro_25", "name": "Pro Tier 25"}'),
  (26, 18850, 'gems', '{"amount": 60}', 'gems', '{"amount": 160}'),
  (27, 20250, null, null, 'cosmetic', '{"type": "avatar_frame", "id": "diamond_frame"}'),
  (28, 21700, 'gems', '{"amount": 75}', 'gems', '{"amount": 180}'),
  (29, 23200, null, null, 'priority', '{"type": "support", "days": 28}'),
  (30, 25000, 'badge', '{"id": "pass_tier_30", "name": "Season Master"}', 'badge', '{"id": "pass_pro_30", "name": "Pro Season Master"}');

-- Create first season
INSERT INTO public.cardboom_pass_seasons (season_number, name, starts_at, ends_at, is_active)
VALUES (1, 'Season 1: Genesis', now(), now() + interval '28 days', true);

-- Function to add XP to user's pass progress
CREATE OR REPLACE FUNCTION public.add_pass_xp(
  p_user_id UUID,
  p_xp_amount INTEGER,
  p_source TEXT DEFAULT 'transaction'
)
RETURNS INTEGER AS $$
DECLARE
  v_season_id UUID;
  v_current_xp INTEGER;
  v_new_xp INTEGER;
  v_new_tier INTEGER;
BEGIN
  -- Get active season
  SELECT id INTO v_season_id FROM public.cardboom_pass_seasons WHERE is_active = true LIMIT 1;
  
  IF v_season_id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Upsert progress
  INSERT INTO public.cardboom_pass_progress (user_id, season_id, current_xp, current_tier)
  VALUES (p_user_id, v_season_id, p_xp_amount, 0)
  ON CONFLICT (user_id, season_id) 
  DO UPDATE SET
    current_xp = cardboom_pass_progress.current_xp + p_xp_amount,
    updated_at = now()
  RETURNING current_xp INTO v_new_xp;
  
  -- Calculate new tier based on XP
  SELECT COALESCE(MAX(tier_number), 0) INTO v_new_tier
  FROM public.cardboom_pass_tiers
  WHERE xp_required <= v_new_xp;
  
  -- Update tier if changed
  UPDATE public.cardboom_pass_progress
  SET current_tier = v_new_tier
  WHERE user_id = p_user_id AND season_id = v_season_id;
  
  RETURN v_new_xp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update earn_cardboom_points to apply Pro multiplier
CREATE OR REPLACE FUNCTION public.earn_cardboom_points(
  p_user_id UUID,
  p_transaction_amount NUMERIC,
  p_source TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
  v_base_rate NUMERIC := 0.002; -- 0.2%
  v_multiplier NUMERIC := 1.0;
  v_is_pro BOOLEAN;
  v_points NUMERIC;
  v_season_id UUID;
BEGIN
  -- Check if user has Pro pass for active season
  SELECT cpp.is_pro, cps.id INTO v_is_pro, v_season_id
  FROM public.cardboom_pass_seasons cps
  LEFT JOIN public.cardboom_pass_progress cpp ON cpp.season_id = cps.id AND cpp.user_id = p_user_id
  WHERE cps.is_active = true
  LIMIT 1;
  
  -- Apply Pro multiplier (1.25x)
  IF v_is_pro = true THEN
    v_multiplier := 1.25;
  END IF;
  
  v_points := p_transaction_amount * v_base_rate * v_multiplier;
  
  -- Upsert points balance
  INSERT INTO public.cardboom_points (user_id, balance, total_earned)
  VALUES (p_user_id, v_points, v_points)
  ON CONFLICT (user_id) 
  DO UPDATE SET
    balance = cardboom_points.balance + v_points,
    total_earned = cardboom_points.total_earned + v_points,
    updated_at = now();
  
  -- Record the transaction
  INSERT INTO public.cardboom_points_history (user_id, amount, transaction_type, source, reference_id, description)
  VALUES (p_user_id, v_points, 'earn', p_source, p_reference_id, 
    COALESCE(p_description, 
      CASE WHEN v_multiplier > 1 THEN 'Earned Cardboom Gems (Pro 1.25×)' ELSE 'Earned Cardboom Gems' END
    )
  );
  
  -- Also add XP to pass progress (1 XP per $1 spent)
  IF v_season_id IS NOT NULL THEN
    PERFORM public.add_pass_xp(p_user_id, GREATEST(1, FLOOR(p_transaction_amount)::INTEGER), p_source);
  END IF;
  
  RETURN v_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to purchase Pro pass
CREATE OR REPLACE FUNCTION public.purchase_pro_pass(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_season_id UUID;
  v_wallet_balance NUMERIC;
  v_pro_price NUMERIC := 10.00;
BEGIN
  -- Get active season
  SELECT id INTO v_season_id FROM public.cardboom_pass_seasons WHERE is_active = true LIMIT 1;
  
  IF v_season_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check wallet balance
  SELECT balance INTO v_wallet_balance FROM public.wallets WHERE user_id = p_user_id;
  
  IF v_wallet_balance IS NULL OR v_wallet_balance < v_pro_price THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct from wallet
  UPDATE public.wallets SET balance = balance - v_pro_price WHERE user_id = p_user_id;
  
  -- Record transaction
  INSERT INTO public.transactions (user_id, amount, type, status, description)
  VALUES (p_user_id, -v_pro_price, 'purchase', 'completed', 'CardBoom Pass Pro Upgrade');
  
  -- Update pass progress
  INSERT INTO public.cardboom_pass_progress (user_id, season_id, is_pro, pro_purchased_at)
  VALUES (p_user_id, v_season_id, true, now())
  ON CONFLICT (user_id, season_id) 
  DO UPDATE SET
    is_pro = true,
    pro_purchased_at = now(),
    updated_at = now();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable realtime for progress updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.cardboom_pass_progress;