-- Fix the public_profiles view - add security invoker and add account_type
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles 
WITH (security_invoker = on)
AS
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
  profile_color_secondary,
  account_type
FROM public.profiles
WHERE account_status = 'active';

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO anon, authenticated;