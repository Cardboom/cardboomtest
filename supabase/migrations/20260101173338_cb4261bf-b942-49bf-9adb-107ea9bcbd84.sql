-- Add is_id_verified to the public_profiles view (this is safe public info for verified seller badge)
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
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
  is_id_verified,
  profile_background,
  title,
  guru_expertise,
  custom_guru,
  created_at
FROM public.profiles
WHERE account_status = 'active';

-- Grant SELECT on the view
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;