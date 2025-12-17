
-- Data Classification for market signals and pricing data
CREATE TABLE public.data_access_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_type TEXT NOT NULL,
  field_name TEXT NOT NULL,
  access_level TEXT NOT NULL CHECK (access_level IN ('public', 'pro_only', 'never_export')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(data_type, field_name)
);

-- Insert default data classifications
INSERT INTO public.data_access_levels (data_type, field_name, access_level, description) VALUES
('market_item', 'current_price', 'public', 'Current market price'),
('market_item', 'change_24h', 'public', 'Basic price changes'),
('market_item', 'sale_probability', 'never_export', 'Proprietary liquidity prediction'),
('market_item', 'avg_days_to_sell', 'pro_only', 'Exit velocity metrics'),
('pricing', 'confidence_score', 'never_export', 'Internal pricing confidence'),
('pricing', 'raw_ugms_signals', 'never_export', 'User generated market signals'),
('pricing', 'trimmed_mean', 'pro_only', 'Advanced pricing analytics'),
('portfolio', 'heat_score', 'pro_only', 'Portfolio activity metric');

-- Creator Profiles for influencers/streamers
CREATE TABLE public.creator_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  creator_name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'twitch', 'twitter', 'tiktok', 'instagram', 'other')),
  platform_handle TEXT,
  follower_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  bio TEXT,
  specialty_categories TEXT[] DEFAULT '{}',
  portfolio_public BOOLEAN DEFAULT true,
  watchlist_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Creator watching items (public "Cards I'm Watching")
CREATE TABLE public.creator_picks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  market_item_id UUID NOT NULL REFERENCES public.market_items(id) ON DELETE CASCADE,
  pick_type TEXT NOT NULL CHECK (pick_type IN ('watching', 'bullish', 'bearish', 'holding')),
  note TEXT,
  price_at_pick NUMERIC,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(creator_id, market_item_id)
);

-- Market Memory - Historical patterns and events
CREATE TABLE public.market_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  market_item_id UUID REFERENCES public.market_items(id) ON DELETE CASCADE,
  category TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('price_peak', 'price_bottom', 'recovery', 'crash', 'rotation_spike', 'reprint_drop', 'hype_cycle')),
  event_date DATE NOT NULL,
  price_at_event NUMERIC,
  recovery_days INTEGER,
  description TEXT NOT NULL,
  confidence TEXT DEFAULT 'medium' CHECK (confidence IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- External Exit Signals - liquidity on other platforms
CREATE TABLE public.external_liquidity_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  market_item_id UUID REFERENCES public.market_items(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('ebay', 'tcgplayer', 'cardmarket', 'stockx', 'whatnot', 'other')),
  liquidity_level TEXT DEFAULT 'medium' CHECK (liquidity_level IN ('low', 'medium', 'high', 'very_high')),
  avg_price NUMERIC,
  spread_percent NUMERIC,
  volume_24h INTEGER DEFAULT 0,
  is_recommended BOOLEAN DEFAULT false,
  recommendation_reason TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(market_item_id, platform)
);

-- Admin Kill Switches / Market Controls
CREATE TABLE public.market_controls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  control_type TEXT NOT NULL CHECK (control_type IN ('freeze_category', 'throttle_low_confidence', 'boost_category', 'shadow_ban_pattern', 'price_floor', 'price_ceiling')),
  target_category TEXT,
  target_pattern TEXT,
  is_active BOOLEAN DEFAULT true,
  threshold_value NUMERIC,
  reason TEXT NOT NULL,
  activated_by UUID,
  activated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Whale Seller Invites (Quiet perks)
CREATE TABLE public.whale_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  invite_tier TEXT NOT NULL CHECK (invite_tier IN ('silver_whale', 'gold_whale', 'platinum_whale')),
  faster_payouts BOOLEAN DEFAULT true,
  payout_speed_hours INTEGER DEFAULT 24,
  private_liquidity_access BOOLEAN DEFAULT true,
  early_exit_warnings BOOLEAN DEFAULT true,
  fee_discount_percent NUMERIC DEFAULT 0,
  invited_by UUID,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.data_access_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_liquidity_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whale_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view data access levels" ON public.data_access_levels FOR SELECT USING (true);

CREATE POLICY "Anyone can view public creator profiles" ON public.creator_profiles FOR SELECT USING (is_public = true);
CREATE POLICY "Users can manage own creator profile" ON public.creator_profiles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view public creator picks" ON public.creator_picks FOR SELECT 
  USING (is_public = true AND EXISTS (SELECT 1 FROM creator_profiles cp WHERE cp.id = creator_id AND cp.is_public = true));
CREATE POLICY "Creators can manage own picks" ON public.creator_picks FOR ALL 
  USING (EXISTS (SELECT 1 FROM creator_profiles cp WHERE cp.id = creator_id AND cp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM creator_profiles cp WHERE cp.id = creator_id AND cp.user_id = auth.uid()));

CREATE POLICY "Anyone can view market memory" ON public.market_memory FOR SELECT USING (true);
CREATE POLICY "Admins can manage market memory" ON public.market_memory FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view external liquidity" ON public.external_liquidity_signals FOR SELECT USING (true);
CREATE POLICY "System can manage external liquidity" ON public.external_liquidity_signals FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage market controls" ON public.market_controls FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view market controls" ON public.market_controls FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Whale users can view own invite" ON public.whale_invites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage whale invites" ON public.whale_invites FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
