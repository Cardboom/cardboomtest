-- Create table to cache TCG release calendar data
CREATE TABLE public.cached_tcg_drops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT UNIQUE,
  name TEXT NOT NULL,
  tcg TEXT NOT NULL,
  release_date DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'booster-box',
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table to cache social media posts
CREATE TABLE public.cached_social_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT UNIQUE,
  platform TEXT NOT NULL DEFAULT 'x',
  author_name TEXT NOT NULL,
  author_handle TEXT,
  author_avatar TEXT,
  content TEXT NOT NULL,
  engagement_count INTEGER DEFAULT 0,
  post_url TEXT,
  posted_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table to cache AI market summary (one row, updated periodically)
CREATE TABLE public.cached_market_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_buzz TEXT,
  hot_take TEXT,
  sleeper TEXT,
  sentiment TEXT DEFAULT 'neutral' CHECK (sentiment IN ('bullish', 'bearish', 'mixed', 'neutral')),
  cardboom_index NUMERIC(5,2),
  platform_grading_avg NUMERIC(5,2),
  weekly_volume NUMERIC,
  top_movers JSONB DEFAULT '[]'::jsonb,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cached_tcg_drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cached_social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cached_market_summary ENABLE ROW LEVEL SECURITY;

-- Public read access for all cached data (this is display data)
CREATE POLICY "Anyone can view cached TCG drops"
ON public.cached_tcg_drops FOR SELECT
USING (true);

CREATE POLICY "Anyone can view cached social posts"
ON public.cached_social_posts FOR SELECT
USING (true);

CREATE POLICY "Anyone can view cached market summary"
ON public.cached_market_summary FOR SELECT
USING (true);

-- Indexes for performance
CREATE INDEX idx_cached_tcg_drops_release ON public.cached_tcg_drops(release_date) WHERE is_active = true;
CREATE INDEX idx_cached_social_posts_posted ON public.cached_social_posts(posted_at DESC) WHERE is_active = true;

-- Insert initial market summary row
INSERT INTO public.cached_market_summary (
  community_buzz,
  hot_take,
  sleeper,
  sentiment,
  cardboom_index,
  platform_grading_avg
) VALUES (
  'Market activity is picking up across all TCG categories.',
  'One Piece cards continue to show strong momentum.',
  'Keep an eye on vintage Pokemon - prices are stabilizing.',
  'neutral',
  50.00,
  8.5
);