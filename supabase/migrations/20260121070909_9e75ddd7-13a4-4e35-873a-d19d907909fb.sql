
-- Update the function to also match by card name/code when no explicit mapping exists
DROP FUNCTION IF EXISTS public.get_catalog_card_listings(uuid);

CREATE OR REPLACE FUNCTION public.get_catalog_card_listings(p_catalog_card_id uuid)
RETURNS TABLE(
  listing_id uuid, 
  title text, 
  price numeric, 
  image_url text, 
  condition text, 
  status text, 
  seller_id uuid, 
  seller_name text, 
  seller_avatar text, 
  market_item_id uuid, 
  mapping_confidence numeric,
  is_sample boolean,
  category text,
  seller_country_code text,
  seller_total_sales integer,
  seller_is_verified boolean,
  seller_subscription_tier text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_card_name text;
  v_set_code text;
  v_card_number text;
BEGIN
  -- Get catalog card details for fallback matching
  SELECT cc.name, cc.set_code, cc.card_number
  INTO v_card_name, v_set_code, v_card_number
  FROM catalog_cards cc
  WHERE cc.id = p_catalog_card_id;

  -- First try: explicit mapping via catalog_card_map
  RETURN QUERY
  SELECT 
    l.id as listing_id,
    l.title,
    l.price,
    l.image_url,
    l.condition,
    l.status::TEXT,
    l.seller_id,
    p.display_name as seller_name,
    p.avatar_url as seller_avatar,
    ccm.market_item_id,
    ccm.confidence as mapping_confidence,
    l.is_sample,
    l.category,
    p.country_code as seller_country_code,
    COALESCE(p.total_sales_completed, 0) as seller_total_sales,
    COALESCE(p.is_verified_seller, false) as seller_is_verified,
    COALESCE(us.tier, 'free') as seller_subscription_tier
  FROM catalog_card_map ccm
  JOIN listings l ON l.market_item_id = ccm.market_item_id
  LEFT JOIN profiles p ON p.id = l.seller_id
  LEFT JOIN user_subscriptions us ON us.user_id = l.seller_id 
    AND us.expires_at > NOW()
  WHERE ccm.catalog_card_id = p_catalog_card_id
    AND l.status = 'active';

  -- If no results from mapping, try name-based matching
  IF NOT FOUND AND v_card_name IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      l.id as listing_id,
      l.title,
      l.price,
      l.image_url,
      l.condition,
      l.status::TEXT,
      l.seller_id,
      p.display_name as seller_name,
      p.avatar_url as seller_avatar,
      l.market_item_id,
      0.7::numeric as mapping_confidence,  -- Lower confidence for name match
      l.is_sample,
      l.category,
      p.country_code as seller_country_code,
      COALESCE(p.total_sales_completed, 0) as seller_total_sales,
      COALESCE(p.is_verified_seller, false) as seller_is_verified,
      COALESCE(us.tier, 'free') as seller_subscription_tier
    FROM listings l
    JOIN market_items mi ON mi.id = l.market_item_id
    LEFT JOIN profiles p ON p.id = l.seller_id
    LEFT JOIN user_subscriptions us ON us.user_id = l.seller_id 
      AND us.expires_at > NOW()
    WHERE l.status = 'active'
      AND (
        -- Match by exact name with set code
        (mi.name ILIKE v_card_name AND mi.name ILIKE '%' || v_set_code || '%')
        OR
        -- Match by card code pattern (e.g., "OP13-065")
        (v_set_code IS NOT NULL AND v_card_number IS NOT NULL 
         AND mi.name ILIKE '%' || v_set_code || '-' || LPAD(v_card_number, 3, '0') || '%')
      )
    ORDER BY l.price ASC;
  END IF;
END;
$function$;
