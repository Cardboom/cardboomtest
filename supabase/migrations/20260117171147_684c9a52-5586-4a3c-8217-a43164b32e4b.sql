-- Create a function to auto-link listings to market_items based on title/category matching
CREATE OR REPLACE FUNCTION public.auto_link_listing_to_market_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_market_item_id UUID;
BEGIN
  -- Only process if market_item_id is null
  IF NEW.market_item_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Try to find a matching market_item by title and category
  SELECT id INTO v_market_item_id
  FROM market_items
  WHERE 
    LOWER(TRIM(name)) = LOWER(TRIM(NEW.title))
    AND LOWER(category) = LOWER(NEW.category)
  ORDER BY verified_price DESC NULLS LAST
  LIMIT 1;
  
  -- If found, link the listing
  IF v_market_item_id IS NOT NULL THEN
    NEW.market_item_id := v_market_item_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new listings
DROP TRIGGER IF EXISTS trigger_auto_link_listing ON listings;
CREATE TRIGGER trigger_auto_link_listing
  BEFORE INSERT ON listings
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_listing_to_market_item();

-- Also create a function to backfill existing listings
CREATE OR REPLACE FUNCTION public.backfill_listing_market_items()
RETURNS TABLE(updated_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Update listings that have no market_item_id but can be matched
  WITH matches AS (
    SELECT 
      l.id as listing_id,
      m.id as market_item_id
    FROM listings l
    JOIN market_items m ON 
      LOWER(TRIM(m.name)) = LOWER(TRIM(l.title))
      AND LOWER(m.category) = LOWER(l.category)
    WHERE l.market_item_id IS NULL
      AND l.status = 'active'
  )
  UPDATE listings l
  SET market_item_id = matches.market_item_id
  FROM matches
  WHERE l.id = matches.listing_id;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_count;
END;
$$;

-- Run the backfill immediately
SELECT * FROM backfill_listing_market_items();