-- Add username/slug to creator_profiles for public URLs (/@username)
ALTER TABLE public.creator_profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS total_calls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS accurate_calls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS accuracy_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_clicks INTEGER DEFAULT 0;

-- Create index for fast username lookups
CREATE INDEX IF NOT EXISTS idx_creator_profiles_username ON public.creator_profiles(username);

-- Creator Watchlists - public content objects with thesis
CREATE TABLE IF NOT EXISTS public.creator_watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  thesis TEXT,
  is_public BOOLEAN DEFAULT true,
  slug TEXT NOT NULL,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(creator_id, slug)
);

-- Watchlist items with timestamps for tracking adds/removes
CREATE TABLE IF NOT EXISTS public.creator_watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id UUID NOT NULL REFERENCES public.creator_watchlists(id) ON DELETE CASCADE,
  market_item_id UUID NOT NULL REFERENCES public.market_items(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at TIMESTAMPTZ,
  price_when_added NUMERIC NOT NULL,
  price_when_removed NUMERIC,
  note TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Creator Market Calls - immutable timestamped calls
CREATE TABLE IF NOT EXISTS public.creator_market_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  market_item_id UUID NOT NULL REFERENCES public.market_items(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL CHECK (call_type IN ('buy', 'hold', 'sell', 'watch')),
  price_at_call NUMERIC NOT NULL,
  liquidity_at_call TEXT,
  volume_at_call INTEGER,
  thesis TEXT,
  is_public BOOLEAN DEFAULT true,
  -- Outcome tracking (updated by system, not user)
  current_price NUMERIC,
  price_change_percent NUMERIC,
  outcome_status TEXT DEFAULT 'active' CHECK (outcome_status IN ('active', 'played_out', 'still_developing', 'contradicted')),
  outcome_updated_at TIMESTAMPTZ,
  time_to_exit_days INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  -- Note: No updated_at - calls are immutable
);

-- Creator call follow-ups (since calls can't be edited)
CREATE TABLE IF NOT EXISTS public.creator_call_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES public.creator_market_calls(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  price_at_followup NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Creator Analytics - track engagement and attribution
CREATE TABLE IF NOT EXISTS public.creator_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  call_views INTEGER DEFAULT 0,
  watchlist_views INTEGER DEFAULT 0,
  referral_clicks INTEGER DEFAULT 0,
  new_followers INTEGER DEFAULT 0,
  UNIQUE(creator_id, date)
);

-- Creator followers
CREATE TABLE IF NOT EXISTS public.creator_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  follower_user_id UUID NOT NULL,
  followed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  referral_source TEXT,
  UNIQUE(creator_id, follower_user_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.creator_watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_market_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_call_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_followers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for creator_watchlists
CREATE POLICY "Anyone can view public watchlists" ON public.creator_watchlists
  FOR SELECT USING (is_public = true);

CREATE POLICY "Creators can manage own watchlists" ON public.creator_watchlists
  FOR ALL USING (EXISTS (
    SELECT 1 FROM creator_profiles cp 
    WHERE cp.id = creator_watchlists.creator_id AND cp.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM creator_profiles cp 
    WHERE cp.id = creator_watchlists.creator_id AND cp.user_id = auth.uid()
  ));

-- RLS Policies for creator_watchlist_items
CREATE POLICY "Anyone can view public watchlist items" ON public.creator_watchlist_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM creator_watchlists cw 
    WHERE cw.id = creator_watchlist_items.watchlist_id AND cw.is_public = true
  ));

CREATE POLICY "Creators can manage own watchlist items" ON public.creator_watchlist_items
  FOR ALL USING (EXISTS (
    SELECT 1 FROM creator_watchlists cw
    JOIN creator_profiles cp ON cp.id = cw.creator_id
    WHERE cw.id = creator_watchlist_items.watchlist_id AND cp.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM creator_watchlists cw
    JOIN creator_profiles cp ON cp.id = cw.creator_id
    WHERE cw.id = creator_watchlist_items.watchlist_id AND cp.user_id = auth.uid()
  ));

-- RLS Policies for creator_market_calls
CREATE POLICY "Anyone can view public calls" ON public.creator_market_calls
  FOR SELECT USING (is_public = true);

CREATE POLICY "Creators can create calls" ON public.creator_market_calls
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM creator_profiles cp 
    WHERE cp.id = creator_market_calls.creator_id AND cp.user_id = auth.uid()
  ));

-- No UPDATE policy - calls are immutable!

-- RLS Policies for creator_call_followups
CREATE POLICY "Anyone can view followups" ON public.creator_call_followups
  FOR SELECT USING (true);

CREATE POLICY "Creators can add followups to own calls" ON public.creator_call_followups
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM creator_market_calls cmc
    JOIN creator_profiles cp ON cp.id = cmc.creator_id
    WHERE cmc.id = creator_call_followups.call_id AND cp.user_id = auth.uid()
  ));

-- RLS Policies for creator_analytics
CREATE POLICY "Creators can view own analytics" ON public.creator_analytics
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM creator_profiles cp 
    WHERE cp.id = creator_analytics.creator_id AND cp.user_id = auth.uid()
  ));

CREATE POLICY "System can manage analytics" ON public.creator_analytics
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for creator_followers
CREATE POLICY "Anyone can view follower counts" ON public.creator_followers
  FOR SELECT USING (true);

CREATE POLICY "Users can follow creators" ON public.creator_followers
  FOR INSERT WITH CHECK (auth.uid() = follower_user_id);

CREATE POLICY "Users can unfollow" ON public.creator_followers
  FOR DELETE USING (auth.uid() = follower_user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_creator_market_calls_creator ON public.creator_market_calls(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_market_calls_item ON public.creator_market_calls(market_item_id);
CREATE INDEX IF NOT EXISTS idx_creator_watchlists_creator ON public.creator_watchlists(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_analytics_creator_date ON public.creator_analytics(creator_id, date);
CREATE INDEX IF NOT EXISTS idx_creator_followers_creator ON public.creator_followers(creator_id);

-- Function to update call outcomes (run periodically)
CREATE OR REPLACE FUNCTION public.update_call_outcomes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE creator_market_calls cmc
  SET 
    current_price = mi.current_price,
    price_change_percent = CASE 
      WHEN cmc.price_at_call > 0 THEN 
        ((mi.current_price - cmc.price_at_call) / cmc.price_at_call) * 100
      ELSE 0
    END,
    outcome_updated_at = now()
  FROM market_items mi
  WHERE cmc.market_item_id = mi.id
    AND cmc.outcome_status = 'active';
    
  -- Update creator accuracy stats
  UPDATE creator_profiles cp
  SET 
    total_calls = (SELECT COUNT(*) FROM creator_market_calls WHERE creator_id = cp.id),
    accurate_calls = (SELECT COUNT(*) FROM creator_market_calls 
      WHERE creator_id = cp.id 
      AND ((call_type = 'buy' AND price_change_percent > 10)
        OR (call_type = 'sell' AND price_change_percent < -10))),
    accuracy_rate = CASE 
      WHEN (SELECT COUNT(*) FROM creator_market_calls WHERE creator_id = cp.id AND outcome_status != 'active') > 0 
      THEN (SELECT COUNT(*)::NUMERIC FROM creator_market_calls 
        WHERE creator_id = cp.id 
        AND ((call_type = 'buy' AND price_change_percent > 10)
          OR (call_type = 'sell' AND price_change_percent < -10))) 
        / (SELECT COUNT(*)::NUMERIC FROM creator_market_calls WHERE creator_id = cp.id AND outcome_status != 'active') * 100
      ELSE 0
    END;
END;
$$;