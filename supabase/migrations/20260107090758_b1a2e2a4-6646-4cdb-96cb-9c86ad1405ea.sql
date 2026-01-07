-- Create table to store AI-generated price estimates for cards
CREATE TABLE public.card_price_estimates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  market_item_id uuid REFERENCES public.market_items(id) ON DELETE CASCADE,
  card_name text NOT NULL,
  set_name text,
  category text NOT NULL,
  
  -- Price estimates by grade
  price_ungraded numeric,
  price_psa_6 numeric,
  price_psa_7 numeric,
  price_psa_8 numeric,
  price_psa_9 numeric,
  price_psa_10 numeric,
  
  -- Metadata
  confidence_score numeric DEFAULT 0.7,
  data_source text DEFAULT 'ai_estimate',
  notes text,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone DEFAULT (now() + interval '7 days'),
  
  -- Ensure one estimate per market item
  UNIQUE(market_item_id)
);

-- Create index for faster lookups
CREATE INDEX idx_card_price_estimates_market_item ON public.card_price_estimates(market_item_id);
CREATE INDEX idx_card_price_estimates_card_name ON public.card_price_estimates(card_name);
CREATE INDEX idx_card_price_estimates_category ON public.card_price_estimates(category);

-- Enable RLS
ALTER TABLE public.card_price_estimates ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Anyone can view price estimates"
ON public.card_price_estimates FOR SELECT
USING (true);

-- Only service role can insert/update (via edge functions)
CREATE POLICY "Service role can manage price estimates"
ON public.card_price_estimates FOR ALL
USING (auth.role() = 'service_role');

-- Create table to track AI-discovered trending cards
CREATE TABLE public.ai_trending_cards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  market_item_id uuid REFERENCES public.market_items(id) ON DELETE CASCADE,
  card_name text NOT NULL,
  category text NOT NULL,
  
  -- Trend data
  trend_score numeric DEFAULT 0,
  trend_reason text,
  predicted_direction text CHECK (predicted_direction IN ('bullish', 'bearish', 'neutral')),
  
  -- Source info
  discovered_at timestamp with time zone DEFAULT now() NOT NULL,
  data_sources text[],
  
  -- Expiration
  expires_at timestamp with time zone DEFAULT (now() + interval '24 hours'),
  is_active boolean DEFAULT true
);

-- Indexes
CREATE INDEX idx_ai_trending_cards_active ON public.ai_trending_cards(is_active, trend_score DESC);
CREATE INDEX idx_ai_trending_cards_category ON public.ai_trending_cards(category);

-- Enable RLS
ALTER TABLE public.ai_trending_cards ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view trending cards"
ON public.ai_trending_cards FOR SELECT
USING (true);

-- Service role management
CREATE POLICY "Service role can manage trending cards"
ON public.ai_trending_cards FOR ALL
USING (auth.role() = 'service_role');

-- Create table to improve database from user listings
CREATE TABLE public.listing_card_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
  
  -- Extracted card data
  detected_card_name text,
  detected_set_name text,
  detected_card_number text,
  detected_rarity text,
  detected_language text,
  detected_category text,
  
  -- Match to existing catalog
  matched_market_item_id uuid REFERENCES public.market_items(id),
  match_confidence numeric DEFAULT 0,
  
  -- Processing status
  processed_at timestamp with time zone DEFAULT now(),
  contributed_to_catalog boolean DEFAULT false,
  
  UNIQUE(listing_id)
);

-- Index
CREATE INDEX idx_listing_card_data_listing ON public.listing_card_data(listing_id);
CREATE INDEX idx_listing_card_data_unmatched ON public.listing_card_data(matched_market_item_id) WHERE matched_market_item_id IS NULL;

-- Enable RLS
ALTER TABLE public.listing_card_data ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Anyone can view listing card data"
ON public.listing_card_data FOR SELECT
USING (true);

-- Service role management
CREATE POLICY "Service role can manage listing card data"
ON public.listing_card_data FOR ALL
USING (auth.role() = 'service_role');

-- Update timestamp trigger
CREATE TRIGGER update_card_price_estimates_updated_at
BEFORE UPDATE ON public.card_price_estimates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();