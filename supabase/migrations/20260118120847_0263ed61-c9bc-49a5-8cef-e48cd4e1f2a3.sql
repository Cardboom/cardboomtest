-- Add snapshot columns to orders table to preserve item details after listing deletion
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS item_title TEXT,
ADD COLUMN IF NOT EXISTS item_image_url TEXT,
ADD COLUMN IF NOT EXISTS item_condition TEXT,
ADD COLUMN IF NOT EXISTS item_category TEXT,
ADD COLUMN IF NOT EXISTS item_grade TEXT,
ADD COLUMN IF NOT EXISTS item_grading_company TEXT;

-- Backfill existing orders with data from listings
UPDATE public.orders o
SET 
  item_title = l.title,
  item_image_url = l.image_url,
  item_condition = l.condition,
  item_category = l.category,
  item_grade = l.grade,
  item_grading_company = l.grading_company
FROM public.listings l
WHERE o.listing_id = l.id
AND o.item_title IS NULL;

-- Create a trigger to automatically snapshot item details on order creation
CREATE OR REPLACE FUNCTION public.snapshot_order_item_details()
RETURNS TRIGGER AS $$
BEGIN
  -- Only populate if not already set
  IF NEW.item_title IS NULL THEN
    SELECT 
      title, 
      image_url, 
      condition, 
      category, 
      grade, 
      grading_company
    INTO 
      NEW.item_title,
      NEW.item_image_url,
      NEW.item_condition,
      NEW.item_category,
      NEW.item_grade,
      NEW.item_grading_company
    FROM public.listings 
    WHERE id = NEW.listing_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS snapshot_order_item_details_trigger ON public.orders;
CREATE TRIGGER snapshot_order_item_details_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_order_item_details();