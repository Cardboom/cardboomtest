-- Create catalog_card_map table for hard mapping between catalog cards and internal cards
CREATE TABLE public.catalog_card_map (
  catalog_card_id UUID NOT NULL REFERENCES public.catalog_cards(id) ON DELETE CASCADE,
  market_item_id UUID NOT NULL REFERENCES public.market_items(id) ON DELETE CASCADE,
  canonical_key TEXT NOT NULL,
  confidence NUMERIC DEFAULT 1.0,
  matched_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (catalog_card_id, market_item_id)
);

-- Index for fast lookups
CREATE INDEX idx_catalog_card_map_catalog_id ON public.catalog_card_map(catalog_card_id);
CREATE INDEX idx_catalog_card_map_market_id ON public.catalog_card_map(market_item_id);
CREATE INDEX idx_catalog_card_map_canonical_key ON public.catalog_card_map(canonical_key);

-- Enable RLS
ALTER TABLE public.catalog_card_map ENABLE ROW LEVEL SECURITY;

-- Public read access for catalog data
CREATE POLICY "Public can read catalog_card_map" 
ON public.catalog_card_map 
FOR SELECT 
USING (true);

-- Service role can manage mappings
CREATE POLICY "Service role can manage catalog_card_map" 
ON public.catalog_card_map 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create a view that resolves catalog card to all listings via market_items
CREATE OR REPLACE VIEW public.catalog_card_active_listings AS
SELECT 
  ccm.catalog_card_id,
  ccm.canonical_key,
  ccm.confidence as mapping_confidence,
  l.id as listing_id,
  l.title,
  l.price,
  l.image_url,
  l.condition,
  l.status,
  l.seller_id,
  l.created_at as listing_created_at,
  mi.id as market_item_id,
  mi.name as market_item_name
FROM public.catalog_card_map ccm
JOIN public.market_items mi ON mi.id = ccm.market_item_id
JOIN public.listings l ON l.market_item_id = mi.id
WHERE l.status = 'active';

-- Create function to get resolved price for a catalog card
CREATE OR REPLACE FUNCTION public.get_catalog_card_resolved_price(p_catalog_card_id UUID)
RETURNS TABLE (
  has_price BOOLEAN,
  price_usd NUMERIC,
  price_source TEXT,
  liquidity_count INTEGER,
  confidence NUMERIC,
  last_updated TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snapshot RECORD;
  v_market_price RECORD;
  v_listing_median NUMERIC;
  v_listing_count INTEGER;
BEGIN
  -- First try: card_price_snapshots (highest priority)
  SELECT cps.median_usd, cps.liquidity_count, cps.confidence, cps.snapshot_date
  INTO v_snapshot
  FROM card_price_snapshots cps
  WHERE cps.catalog_card_id = p_catalog_card_id
  ORDER BY cps.snapshot_date DESC
  LIMIT 1;
  
  IF FOUND AND v_snapshot.median_usd IS NOT NULL THEN
    RETURN QUERY SELECT 
      true,
      v_snapshot.median_usd,
      'snapshot'::TEXT,
      v_snapshot.liquidity_count::INTEGER,
      v_snapshot.confidence,
      v_snapshot.snapshot_date::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Second try: market_items via mapping (verified_price or raw_price)
  SELECT 
    COALESCE(mi.verified_price, mi.raw_price, mi.base_price) as price,
    mi.updated_at
  INTO v_market_price
  FROM catalog_card_map ccm
  JOIN market_items mi ON mi.id = ccm.market_item_id
  WHERE ccm.catalog_card_id = p_catalog_card_id
    AND (mi.verified_price IS NOT NULL OR mi.raw_price IS NOT NULL OR mi.base_price IS NOT NULL)
  ORDER BY mi.verified_price DESC NULLS LAST, mi.raw_price DESC NULLS LAST
  LIMIT 1;
  
  IF FOUND AND v_market_price.price IS NOT NULL THEN
    RETURN QUERY SELECT 
      true,
      v_market_price.price,
      'market_item'::TEXT,
      1::INTEGER,
      0.7::NUMERIC,
      v_market_price.updated_at;
    RETURN;
  END IF;
  
  -- Third try: median of active listings
  SELECT 
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY l.price) as median_price,
    COUNT(*)::INTEGER as count
  INTO v_listing_median, v_listing_count
  FROM catalog_card_map ccm
  JOIN listings l ON l.market_item_id = ccm.market_item_id
  WHERE ccm.catalog_card_id = p_catalog_card_id
    AND l.status = 'active'
    AND l.price > 0;
  
  IF v_listing_count > 0 AND v_listing_median IS NOT NULL THEN
    RETURN QUERY SELECT 
      true,
      v_listing_median,
      'listing_median'::TEXT,
      v_listing_count,
      CASE WHEN v_listing_count >= 5 THEN 0.8 WHEN v_listing_count >= 2 THEN 0.5 ELSE 0.3 END,
      now();
    RETURN;
  END IF;
  
  -- No price data available
  RETURN QUERY SELECT 
    false,
    NULL::NUMERIC,
    'none'::TEXT,
    0::INTEGER,
    0::NUMERIC,
    NULL::TIMESTAMPTZ;
END;
$$;

-- Create function to get all active listings for a catalog card
CREATE OR REPLACE FUNCTION public.get_catalog_card_listings(p_catalog_card_id UUID)
RETURNS TABLE (
  listing_id UUID,
  title TEXT,
  price NUMERIC,
  image_url TEXT,
  condition TEXT,
  status TEXT,
  seller_id UUID,
  seller_name TEXT,
  seller_avatar TEXT,
  market_item_id UUID,
  mapping_confidence NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id as listing_id,
    l.title,
    l.price,
    l.image_url,
    l.condition,
    l.status,
    l.seller_id,
    p.display_name as seller_name,
    p.avatar_url as seller_avatar,
    ccm.market_item_id,
    ccm.confidence as mapping_confidence
  FROM catalog_card_map ccm
  JOIN listings l ON l.market_item_id = ccm.market_item_id
  LEFT JOIN profiles p ON p.id = l.seller_id
  WHERE ccm.catalog_card_id = p_catalog_card_id
    AND l.status = 'active'
  ORDER BY l.price ASC;
END;
$$;