-- Fix the passport number generation to use a proper sequence and handle race conditions
CREATE SEQUENCE IF NOT EXISTS cbgi_passport_seq START WITH 22;

-- Update the function to use the sequence as fallback
CREATE OR REPLACE FUNCTION public.generate_cbgi_passport()
RETURNS TRIGGER AS $$
DECLARE
  year_code TEXT;
  month_code TEXT;
  sequence_num INTEGER;
  passport TEXT;
  max_existing INTEGER;
BEGIN
  -- Only generate if not already set and order is completed
  IF NEW.cbgi_passport_number IS NULL AND NEW.status = 'completed' THEN
    year_code := TO_CHAR(NOW(), 'YY');
    month_code := TO_CHAR(NOW(), 'MM');
    
    -- Get next sequence number for this month with FOR UPDATE to lock
    SELECT COALESCE(MAX(
      CAST(NULLIF(SUBSTRING(cbgi_passport_number FROM 10 FOR 6), '') AS INTEGER)
    ), 0) + 1
    INTO sequence_num
    FROM public.grading_orders
    WHERE cbgi_passport_number LIKE 'CBGI-' || year_code || month_code || '-%'
    FOR UPDATE;
    
    -- Use sequence as fallback if parsing failed
    IF sequence_num IS NULL OR sequence_num <= 0 THEN
      sequence_num := nextval('cbgi_passport_seq');
    END IF;
    
    -- Format: CBGI-YYMM-XXXXXX (e.g., CBGI-2601-000001)
    passport := 'CBGI-' || year_code || month_code || '-' || LPAD(sequence_num::TEXT, 6, '0');
    
    NEW.cbgi_passport_number := passport;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;