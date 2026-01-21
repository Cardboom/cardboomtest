
-- Drop the existing function first, then recreate with additional seller details
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
    AND l.status = 'active'
  ORDER BY l.price ASC;
END;
$function$;
