-- Add CBGI Passport Number to grading_orders
-- This unique certification number will be used for physical certification/welding

-- Add passport_number column
ALTER TABLE public.grading_orders 
ADD COLUMN IF NOT EXISTS cbgi_passport_number TEXT UNIQUE;

-- Add pre-graded detection fields (for already PSA/BGS graded cards)
ALTER TABLE public.grading_orders 
ADD COLUMN IF NOT EXISTS is_pre_graded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pre_grade_company TEXT,
ADD COLUMN IF NOT EXISTS pre_grade_score NUMERIC;

-- Create function to generate CBGI passport numbers
CREATE OR REPLACE FUNCTION generate_cbgi_passport()
RETURNS TRIGGER AS $$
DECLARE
  year_code TEXT;
  month_code TEXT;
  sequence_num INTEGER;
  passport TEXT;
BEGIN
  -- Only generate if not already set and order is completed
  IF NEW.cbgi_passport_number IS NULL AND NEW.status = 'completed' THEN
    year_code := TO_CHAR(NOW(), 'YY');
    month_code := TO_CHAR(NOW(), 'MM');
    
    -- Get next sequence number for this month
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(cbgi_passport_number FROM 10 FOR 6) AS INTEGER)
    ), 0) + 1
    INTO sequence_num
    FROM public.grading_orders
    WHERE cbgi_passport_number LIKE 'CBGI-' || year_code || month_code || '-%';
    
    -- Format: CBGI-YYMM-XXXXXX (e.g., CBGI-2601-000001)
    passport := 'CBGI-' || year_code || month_code || '-' || LPAD(sequence_num::TEXT, 6, '0');
    
    NEW.cbgi_passport_number := passport;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate passport on completion
DROP TRIGGER IF EXISTS generate_cbgi_passport_trigger ON public.grading_orders;
CREATE TRIGGER generate_cbgi_passport_trigger
  BEFORE UPDATE ON public.grading_orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed')
  EXECUTE FUNCTION generate_cbgi_passport();

-- Also generate for new completions
DROP TRIGGER IF EXISTS generate_cbgi_passport_insert_trigger ON public.grading_orders;
CREATE TRIGGER generate_cbgi_passport_insert_trigger
  BEFORE INSERT ON public.grading_orders
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION generate_cbgi_passport();

-- Create index for passport number lookups
CREATE INDEX IF NOT EXISTS idx_grading_orders_passport ON public.grading_orders(cbgi_passport_number) WHERE cbgi_passport_number IS NOT NULL;

-- Backfill existing completed orders with passport numbers
DO $$
DECLARE
  rec RECORD;
  year_code TEXT;
  month_code TEXT;
  sequence_num INTEGER := 0;
  last_month TEXT := '';
BEGIN
  FOR rec IN 
    SELECT id, completed_at 
    FROM public.grading_orders 
    WHERE status = 'completed' 
      AND cbgi_passport_number IS NULL
      AND completed_at IS NOT NULL
    ORDER BY completed_at ASC
  LOOP
    year_code := TO_CHAR(rec.completed_at, 'YY');
    month_code := TO_CHAR(rec.completed_at, 'MM');
    
    -- Reset sequence for new month
    IF year_code || month_code != last_month THEN
      sequence_num := 0;
      last_month := year_code || month_code;
    END IF;
    
    sequence_num := sequence_num + 1;
    
    UPDATE public.grading_orders 
    SET cbgi_passport_number = 'CBGI-' || year_code || month_code || '-' || LPAD(sequence_num::TEXT, 6, '0')
    WHERE id = rec.id;
  END LOOP;
END $$;