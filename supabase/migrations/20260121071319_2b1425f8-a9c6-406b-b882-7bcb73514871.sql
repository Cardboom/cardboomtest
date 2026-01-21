
-- Update the auto-link function to also match by set_code/card_number and create catalog mappings
CREATE OR REPLACE FUNCTION public.auto_link_listing_to_market_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_market_item_id UUID;
  v_catalog_card_id UUID;
  v_canonical_key TEXT;
  v_needs_mapping BOOLEAN := true;
BEGIN
  -- Check if market_item_id already exists
  IF NEW.market_item_id IS NOT NULL THEN
    v_market_item_id := NEW.market_item_id;
    v_needs_mapping := false;
  END IF;
  
  -- Only do market_item matching if needed
  IF v_market_item_id IS NULL THEN
    -- First try: match by set_code + card_number (most reliable for One Piece)
    IF NEW.set_code IS NOT NULL AND NEW.card_number IS NOT NULL THEN
      SELECT id INTO v_market_item_id
      FROM market_items
      WHERE 
        LOWER(category) = LOWER(NEW.category)
        AND (
          LOWER(name) LIKE '%' || LOWER(NEW.set_code) || '-' || LPAD(NEW.card_number, 3, '0') || '%'
          OR LOWER(name) LIKE '%' || LOWER(NEW.set_code) || '-' || NEW.card_number || '%'
        )
      ORDER BY verified_price DESC NULLS LAST
      LIMIT 1;
    END IF;
    
    -- Second try: match by title and category
    IF v_market_item_id IS NULL THEN
      SELECT id INTO v_market_item_id
      FROM market_items
      WHERE 
        LOWER(TRIM(name)) = LOWER(TRIM(NEW.title))
        AND LOWER(category) = LOWER(NEW.category)
      ORDER BY verified_price DESC NULLS LAST
      LIMIT 1;
    END IF;
    
    -- If still not found, create a new market_item
    IF v_market_item_id IS NULL AND NEW.title IS NOT NULL THEN
      INSERT INTO market_items (name, category, image_url, current_price)
      VALUES (NEW.title, NEW.category, NEW.image_url, NEW.price)
      RETURNING id INTO v_market_item_id;
    END IF;
    
    -- Link the listing
    IF v_market_item_id IS NOT NULL THEN
      NEW.market_item_id := v_market_item_id;
    END IF;
  END IF;
  
  -- Always try to create catalog mapping if we have set_code/card_number
  IF NEW.set_code IS NOT NULL AND NEW.card_number IS NOT NULL AND (NEW.market_item_id IS NOT NULL OR v_market_item_id IS NOT NULL) THEN
    v_canonical_key := LOWER(NEW.category) || ':' || LOWER(NEW.set_code) || ':' || LPAD(NEW.card_number, 3, '0');
    
    -- Find matching catalog card
    SELECT id INTO v_catalog_card_id
    FROM catalog_cards
    WHERE 
      LOWER(set_code) = LOWER(NEW.set_code)
      AND (
        card_number = NEW.card_number 
        OR card_number = LPAD(NEW.card_number, 3, '0')
        OR LPAD(card_number, 3, '0') = LPAD(NEW.card_number, 3, '0')
      )
    LIMIT 1;
    
    -- Create catalog_card_map entry if found
    IF v_catalog_card_id IS NOT NULL THEN
      INSERT INTO catalog_card_map (catalog_card_id, market_item_id, canonical_key, confidence)
      VALUES (v_catalog_card_id, COALESCE(NEW.market_item_id, v_market_item_id), v_canonical_key, 0.9)
      ON CONFLICT (catalog_card_id, market_item_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Also update the get_catalog_card_listings function to include CBGI grading info
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
  seller_subscription_tier text,
  cbgi_score numeric,
  cbgi_grade_label text,
  cbgi_completed_at timestamptz,
  external_grade text,
  external_grading_company text
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
    COALESCE(us.tier, 'free') as seller_subscription_tier,
    l.cbgi_score,
    l.cbgi_grade_label,
    l.cbgi_completed_at,
    l.grade as external_grade,
    l.grading_company as external_grading_company
  FROM catalog_card_map ccm
  JOIN listings l ON l.market_item_id = ccm.market_item_id
  LEFT JOIN profiles p ON p.id = l.seller_id
  LEFT JOIN user_subscriptions us ON us.user_id = l.seller_id 
    AND us.expires_at > NOW()
  WHERE ccm.catalog_card_id = p_catalog_card_id
    AND l.status = 'active'
  ORDER BY l.price ASC;

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
      0.7::numeric as mapping_confidence,
      l.is_sample,
      l.category,
      p.country_code as seller_country_code,
      COALESCE(p.total_sales_completed, 0) as seller_total_sales,
      COALESCE(p.is_verified_seller, false) as seller_is_verified,
      COALESCE(us.tier, 'free') as seller_subscription_tier,
      l.cbgi_score,
      l.cbgi_grade_label,
      l.cbgi_completed_at,
      l.grade as external_grade,
      l.grading_company as external_grading_company
    FROM listings l
    JOIN market_items mi ON mi.id = l.market_item_id
    LEFT JOIN profiles p ON p.id = l.seller_id
    LEFT JOIN user_subscriptions us ON us.user_id = l.seller_id 
      AND us.expires_at > NOW()
    WHERE l.status = 'active'
      AND (
        (mi.name ILIKE v_card_name AND mi.name ILIKE '%' || v_set_code || '%')
        OR (v_set_code IS NOT NULL AND v_card_number IS NOT NULL 
           AND mi.name ILIKE '%' || v_set_code || '-' || LPAD(v_card_number, 3, '0') || '%')
      )
    ORDER BY l.price ASC;
  END IF;
END;
$function$;
