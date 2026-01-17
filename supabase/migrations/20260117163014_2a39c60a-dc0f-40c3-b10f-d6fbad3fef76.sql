-- Drop existing function and recreate with new signature
DROP FUNCTION IF EXISTS public.get_catalog_card_resolved_price(uuid);

-- Fix price resolution to prioritize active listings FIRST
-- If a user can buy the card, price is NOT pending
CREATE OR REPLACE FUNCTION public.get_catalog_card_resolved_price(p_catalog_card_id uuid)
RETURNS TABLE(
  has_price boolean, 
  price_usd numeric, 
  price_source text, 
  liquidity_count integer, 
  confidence numeric, 
  last_updated timestamp with time zone,
  min_listing_price numeric,
  listing_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_listing_min NUMERIC;
  v_listing_median NUMERIC;
  v_listing_count INTEGER;
  v_snapshot RECORD;
  v_market_price RECORD;
BEGIN
  -- PRIORITY 1: Active listings (HIGHEST - if user can buy, price is NOT pending)
  SELECT 
    MIN(l.price) as min_price,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY l.price) as median_price,
    COUNT(*)::INTEGER as count
  INTO v_listing_min, v_listing_median, v_listing_count
  FROM catalog_card_map ccm
  JOIN listings l ON l.market_item_id = ccm.market_item_id
  WHERE ccm.catalog_card_id = p_catalog_card_id
    AND l.status = 'active'
    AND l.price > 0;
  
  IF v_listing_count > 0 AND v_listing_min IS NOT NULL THEN
    RETURN QUERY SELECT 
      true,
      v_listing_median,
      'listing'::TEXT,
      v_listing_count,
      CASE WHEN v_listing_count >= 5 THEN 0.9 WHEN v_listing_count >= 2 THEN 0.7 ELSE 0.5 END,
      now(),
      v_listing_min,
      v_listing_count;
    RETURN;
  END IF;
  
  -- PRIORITY 2: Card price snapshots (market aggregates)
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
      'market_aggregate'::TEXT,
      v_snapshot.liquidity_count::INTEGER,
      v_snapshot.confidence,
      v_snapshot.snapshot_date::TIMESTAMPTZ,
      NULL::NUMERIC,
      0::INTEGER;
    RETURN;
  END IF;
  
  -- PRIORITY 3: Market items via mapping (verified_price or raw_price)
  SELECT 
    COALESCE(mi.verified_price, mi.raw_price, mi.blended_market_price, mi.base_price) as price,
    mi.updated_at
  INTO v_market_price
  FROM catalog_card_map ccm
  JOIN market_items mi ON mi.id = ccm.market_item_id
  WHERE ccm.catalog_card_id = p_catalog_card_id
    AND (mi.verified_price IS NOT NULL OR mi.raw_price IS NOT NULL OR mi.blended_market_price IS NOT NULL OR mi.base_price IS NOT NULL)
  ORDER BY mi.verified_price DESC NULLS LAST, mi.raw_price DESC NULLS LAST
  LIMIT 1;
  
  IF FOUND AND v_market_price.price IS NOT NULL THEN
    RETURN QUERY SELECT 
      true,
      v_market_price.price,
      'market_item'::TEXT,
      1::INTEGER,
      0.6::NUMERIC,
      v_market_price.updated_at,
      NULL::NUMERIC,
      0::INTEGER;
    RETURN;
  END IF;
  
  -- No price data available
  RETURN QUERY SELECT 
    false,
    NULL::NUMERIC,
    'none'::TEXT,
    0::INTEGER,
    0::NUMERIC,
    NULL::TIMESTAMPTZ,
    NULL::NUMERIC,
    0::INTEGER;
END;
$function$;