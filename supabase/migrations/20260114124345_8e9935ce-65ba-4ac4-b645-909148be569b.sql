-- Step 1: Add SEO slug column to listings table
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Step 2: Function to generate SEO-friendly slug from listing data
CREATE OR REPLACE FUNCTION public.generate_listing_slug(
  p_title TEXT,
  p_set_name TEXT DEFAULT NULL,
  p_card_number TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_slug TEXT;
  v_set_slug TEXT;
BEGIN
  -- Normalize title
  v_slug := lower(COALESCE(p_title, 'item'));
  v_slug := regexp_replace(v_slug, '[^a-z0-9\s-]', '', 'g');
  v_slug := regexp_replace(v_slug, '\s+', '-', 'g');
  v_slug := regexp_replace(v_slug, '-+', '-', 'g');
  v_slug := trim(both '-' from v_slug);
  
  -- Add set name if available
  IF p_set_name IS NOT NULL AND p_set_name != '' THEN
    v_set_slug := lower(p_set_name);
    v_set_slug := regexp_replace(v_set_slug, '[^a-z0-9\s-]', '', 'g');
    v_set_slug := regexp_replace(v_set_slug, '\s+', '-', 'g');
    v_set_slug := regexp_replace(v_set_slug, '-+', '-', 'g');
    v_set_slug := trim(both '-' from v_set_slug);
    v_slug := v_slug || '-' || v_set_slug;
  END IF;
  
  -- Add card number if available
  IF p_card_number IS NOT NULL AND p_card_number != '' THEN
    v_slug := v_slug || '-' || regexp_replace(p_card_number, '[^0-9a-zA-Z]', '', 'g');
  END IF;
  
  -- Limit length
  v_slug := substring(v_slug from 1 for 150);
  
  RETURN v_slug;
END;
$$;

-- Step 3: Backfill slugs with unique suffix to avoid duplicates upfront
UPDATE public.listings
SET slug = public.generate_listing_slug(title, set_name, card_number) || '-' || substring(id::text from 1 for 8)
WHERE slug IS NULL;

-- Step 4: Create indexes (non-unique first for lookups)
CREATE INDEX IF NOT EXISTS idx_listings_slug ON public.listings(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_category_slug_lookup ON public.listings(category, slug) WHERE slug IS NOT NULL;

-- Step 5: Trigger function to auto-generate slug on insert/update
CREATE OR REPLACE FUNCTION public.set_listing_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_base_slug TEXT;
  v_final_slug TEXT;
  v_counter INTEGER := 0;
BEGIN
  -- Only generate if slug is null
  IF NEW.slug IS NULL THEN
    v_base_slug := public.generate_listing_slug(NEW.title, NEW.set_name, NEW.card_number);
    v_final_slug := v_base_slug;
    
    -- Ensure uniqueness within category by appending counter or ID
    WHILE EXISTS (
      SELECT 1 FROM public.listings 
      WHERE category = NEW.category 
        AND slug = v_final_slug 
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) LOOP
      v_counter := v_counter + 1;
      IF v_counter > 10 THEN
        -- Fall back to ID suffix for guaranteed uniqueness
        v_final_slug := v_base_slug || '-' || substring(NEW.id::text from 1 for 8);
        EXIT;
      ELSE
        v_final_slug := v_base_slug || '-' || v_counter;
      END IF;
    END LOOP;
    
    NEW.slug := v_final_slug;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 6: Create trigger
DROP TRIGGER IF EXISTS trigger_set_listing_slug ON public.listings;
CREATE TRIGGER trigger_set_listing_slug
BEFORE INSERT ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.set_listing_slug();