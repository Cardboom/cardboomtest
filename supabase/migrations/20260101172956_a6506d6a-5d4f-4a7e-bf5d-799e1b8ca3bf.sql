-- Drop existing view first
DROP VIEW IF EXISTS public.public_profiles;

-- Create a public_profiles view with only safe fields (no PII like email, phone, national_id)
CREATE VIEW public.public_profiles AS
SELECT 
  id,
  display_name,
  avatar_url,
  bio,
  account_type,
  is_beta_tester,
  badges,
  showcase_items,
  reputation_score,
  reputation_tier,
  trust_rating,
  trust_review_count,
  level,
  xp,
  is_fan_account,
  profile_background,
  title,
  guru_expertise,
  custom_guru,
  created_at
FROM public.profiles
WHERE account_status = 'active';

-- Grant SELECT on the view to authenticated and anon users
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;