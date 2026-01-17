-- Fix the get_catalog_card_listings function to handle listing_status enum
DROP FUNCTION IF EXISTS public.get_catalog_card_listings(UUID);

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
    l.status::TEXT,
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