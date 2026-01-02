-- Add country_code to profiles for seller location display
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'TR';

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_profiles_country_code ON public.profiles(country_code);

-- Comment for clarity
COMMENT ON COLUMN public.profiles.country_code IS 'ISO 3166-1 alpha-2 country code (e.g., TR, US, DE)';