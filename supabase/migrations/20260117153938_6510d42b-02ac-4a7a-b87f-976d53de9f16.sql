-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ========================================
-- CATALOG_CARDS: Canonical card entities
-- ========================================
CREATE TABLE public.catalog_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game TEXT NOT NULL CHECK (game IN ('pokemon', 'mtg', 'onepiece', 'yugioh', 'lorcana', 'digimon', 'other')),
  canonical_key TEXT NOT NULL UNIQUE,
  set_code TEXT,
  set_name TEXT,
  card_number TEXT,
  variant TEXT,
  finish TEXT,
  rarity TEXT,
  image_url TEXT,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for fast lookup
CREATE INDEX idx_catalog_cards_game ON public.catalog_cards(game);
CREATE INDEX idx_catalog_cards_set_code ON public.catalog_cards(set_code);
CREATE INDEX idx_catalog_cards_name_trgm ON public.catalog_cards USING gin(name gin_trgm_ops);

-- Enable RLS (public read, service role write via edge functions)
ALTER TABLE public.catalog_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Catalog cards are publicly readable"
  ON public.catalog_cards FOR SELECT
  USING (true);

-- ========================================
-- CARD_PRICE_SNAPSHOTS: Daily price aggregates
-- ========================================
CREATE TABLE public.card_price_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  catalog_card_id UUID NOT NULL REFERENCES public.catalog_cards(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  median_usd NUMERIC,
  median_try NUMERIC,
  median_eur NUMERIC,
  low_usd NUMERIC,
  high_usd NUMERIC,
  liquidity_count INTEGER DEFAULT 0,
  confidence NUMERIC DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  sources JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(catalog_card_id, snapshot_date)
);

-- Indexes for time-series queries
CREATE INDEX idx_card_price_snapshots_date ON public.card_price_snapshots(snapshot_date DESC);
CREATE INDEX idx_card_price_snapshots_catalog ON public.card_price_snapshots(catalog_card_id);

-- Enable RLS (public read)
ALTER TABLE public.card_price_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Price snapshots are publicly readable"
  ON public.card_price_snapshots FOR SELECT
  USING (true);

-- ========================================
-- Update price_events to link to catalog_cards
-- ========================================
ALTER TABLE public.price_events 
  ADD COLUMN IF NOT EXISTS catalog_card_id UUID REFERENCES public.catalog_cards(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_price_events_catalog_card ON public.price_events(catalog_card_id);
CREATE INDEX IF NOT EXISTS idx_price_events_sold_at ON public.price_events(sold_at DESC);

-- ========================================
-- CATALOG_CARD_LISTINGS: Link catalog to active listings
-- ========================================
CREATE TABLE public.catalog_card_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  catalog_card_id UUID NOT NULL REFERENCES public.catalog_cards(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  match_confidence NUMERIC DEFAULT 1,
  matched_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(catalog_card_id, listing_id)
);

CREATE INDEX idx_catalog_card_listings_catalog ON public.catalog_card_listings(catalog_card_id);
CREATE INDEX idx_catalog_card_listings_listing ON public.catalog_card_listings(listing_id);

ALTER TABLE public.catalog_card_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Catalog listings are publicly readable"
  ON public.catalog_card_listings FOR SELECT
  USING (true);

-- ========================================
-- Helper function: Get latest snapshot for a card
-- ========================================
CREATE OR REPLACE FUNCTION public.get_card_latest_price(p_catalog_card_id UUID)
RETURNS TABLE (
  median_usd NUMERIC,
  median_try NUMERIC,
  liquidity_count INTEGER,
  confidence NUMERIC,
  snapshot_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cps.median_usd,
    cps.median_try,
    cps.liquidity_count,
    cps.confidence,
    cps.snapshot_date
  FROM public.card_price_snapshots cps
  WHERE cps.catalog_card_id = p_catalog_card_id
  ORDER BY cps.snapshot_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ========================================
-- Helper function: Get price history for charting
-- ========================================
CREATE OR REPLACE FUNCTION public.get_card_price_history(
  p_catalog_card_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  snapshot_date DATE,
  median_usd NUMERIC,
  liquidity_count INTEGER,
  confidence NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cps.snapshot_date,
    cps.median_usd,
    cps.liquidity_count,
    cps.confidence
  FROM public.card_price_snapshots cps
  WHERE cps.catalog_card_id = p_catalog_card_id
    AND cps.snapshot_date >= CURRENT_DATE - p_days
  ORDER BY cps.snapshot_date ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ========================================
-- Updated_at trigger for catalog_cards
-- ========================================
CREATE TRIGGER update_catalog_cards_updated_at
  BEFORE UPDATE ON public.catalog_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();