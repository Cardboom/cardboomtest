-- Add profile privacy and featured card settings
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS show_collection_count boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_portfolio_value boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS featured_card_id uuid REFERENCES public.portfolio_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS profile_color_primary text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS profile_color_secondary text DEFAULT NULL;

-- Update the public_profiles view to include new fields
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles AS
SELECT 
  id,
  display_name,
  avatar_url,
  bio,
  level,
  xp,
  profile_background,
  is_beta_tester,
  badges,
  title,
  showcase_items,
  guru_expertise,
  custom_guru,
  is_id_verified,
  created_at,
  reputation_score,
  reputation_tier,
  trust_rating,
  trust_review_count,
  country_code,
  show_collection_count,
  show_portfolio_value,
  featured_card_id,
  profile_color_primary,
  profile_color_secondary
FROM public.profiles
WHERE account_status = 'active';

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO anon, authenticated;