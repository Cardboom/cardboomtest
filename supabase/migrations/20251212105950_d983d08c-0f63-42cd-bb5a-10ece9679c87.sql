-- Fix function search path for calculate_level
CREATE OR REPLACE FUNCTION public.calculate_level(xp_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN GREATEST(1, FLOOR(SQRT(xp_amount::NUMERIC / 100)) + 1)::INTEGER;
END;
$$;