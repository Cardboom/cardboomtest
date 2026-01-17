-- PART 1: SUB-PORTFOLIOS (Portfolio Collections)
CREATE TABLE public.portfolio_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'folder',
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own collections" ON public.portfolio_collections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own collections" ON public.portfolio_collections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own collections" ON public.portfolio_collections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own collections" ON public.portfolio_collections FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES public.portfolio_collections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_portfolio_items_collection ON public.portfolio_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_collections_user ON public.portfolio_collections(user_id);

-- PART 2: EXTERNAL PRICE INTEGRATION - market_items columns
ALTER TABLE public.market_items 
ADD COLUMN IF NOT EXISTS tcg TEXT,
ADD COLUMN IF NOT EXISTS collector_number TEXT,
ADD COLUMN IF NOT EXISTS card_code TEXT,
ADD COLUMN IF NOT EXISTS external_canonical_key TEXT,
ADD COLUMN IF NOT EXISTS match_confidence NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS match_source TEXT,
ADD COLUMN IF NOT EXISTS price_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cardmarket_id TEXT,
ADD COLUMN IF NOT EXISTS cardmarket_url TEXT,
ADD COLUMN IF NOT EXISTS ebay_avg_30d NUMERIC,
ADD COLUMN IF NOT EXISTS cardmarket_trend NUMERIC,
ADD COLUMN IF NOT EXISTS blended_market_price NUMERIC,
ADD COLUMN IF NOT EXISTS price_confidence TEXT DEFAULT 'low';

CREATE INDEX IF NOT EXISTS idx_market_items_tcg ON public.market_items(tcg);

-- PART 3: PRICE EVENTS
CREATE TABLE public.price_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  source_event_id TEXT,
  external_url TEXT,
  raw_json JSONB,
  external_canonical_key TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  total_price NUMERIC NOT NULL,
  total_usd NUMERIC,
  total_try NUMERIC,
  total_eur NUMERIC,
  event_type TEXT DEFAULT 'listing',
  sold_at TIMESTAMP WITH TIME ZONE,
  ingested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  matched_market_item_id UUID REFERENCES public.market_items(id) ON DELETE SET NULL,
  match_confidence NUMERIC DEFAULT 0,
  is_outlier BOOLEAN DEFAULT false,
  outlier_reason TEXT,
  is_processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(source, source_event_id)
);

ALTER TABLE public.price_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read price events" ON public.price_events FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_price_events_canonical_key ON public.price_events(external_canonical_key);
CREATE INDEX IF NOT EXISTS idx_price_events_matched_item ON public.price_events(matched_market_item_id);

-- PART 4: MATCH REVIEW QUEUE
CREATE TABLE public.match_review_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  source_event_id TEXT,
  external_data JSONB,
  proposed_market_item_id UUID REFERENCES public.market_items(id) ON DELETE CASCADE,
  proposed_confidence NUMERIC DEFAULT 0,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.match_review_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read match queue" ON public.match_review_queue FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage match queue" ON public.match_review_queue FOR ALL TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_match_queue_status ON public.match_review_queue(status);

-- Trigger for updated_at
CREATE TRIGGER update_portfolio_collections_updated_at
BEFORE UPDATE ON public.portfolio_collections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();