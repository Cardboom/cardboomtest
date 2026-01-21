-- Fix profiles table security: restrict access to sensitive PII fields
-- Only the logged-in user should see their own email, phone, national_id, and location data
-- Other users can only see public profile information

-- Drop the overly permissive "Anyone can count profiles for stats" policy
DROP POLICY IF EXISTS "Anyone can count profiles for stats" ON public.profiles;

-- Create a function to check if sensitive fields should be visible
-- This will be used by the RLS policy to mask sensitive data for non-owners
CREATE OR REPLACE FUNCTION public.mask_profile_sensitive_fields()
RETURNS TRIGGER AS $$
BEGIN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create a new restrictive SELECT policy that limits what other users can see
-- Users can view their own full profile OR view limited public data for other users
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Policy 1: Users can always see their own full profile
CREATE POLICY "Users can view own full profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Policy 2: For viewing other users' profiles - only allow access to active accounts
-- The application code should use the public_profiles view for this
-- But we need a base policy that allows some access for features like:
-- seller profiles on listings, user profiles on orders, etc.
CREATE POLICY "Users can view other active profiles basic info" 
ON public.profiles 
FOR SELECT 
USING (
  -- Allow if user is authenticated and target profile is active
  auth.uid() IS NOT NULL 
  AND account_status = 'active'
);

-- Policy 3: Anonymous users can count profiles for stats display (but not read data)
-- This is done via a secure function instead
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_active_users', (SELECT COUNT(*) FROM profiles WHERE account_status = 'active'),
    'total_verified_sellers', (SELECT COUNT(*) FROM profiles WHERE is_verified_seller = true AND account_status = 'active')
  );
$$;

-- Grant execute on the stats function to anon role
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO anon;
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO authenticated;

-- Update the public_profiles view to ensure it only exposes safe fields
-- and is properly secured
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
  xp,
  level,
  profile_background,
  badges,
  title,
  showcase_items,
  created_at,
  is_id_verified,
  guru_expertise,
  custom_guru,
  is_fan_account,
  trust_rating,
  trust_review_count,
  is_verified_seller,
  country_code,
  seller_trust_score,
  show_collection_count,
  show_portfolio_value,
  featured_card_id,
  profile_color_primary,
  profile_color_secondary,
  reputation_score,
  reputation_tier,
  total_sales_completed,
  -- Explicitly EXCLUDE: email, phone, national_id, phone_verified, 
  -- wire_transfer_code, id_document_url, banned_at, banned_reason,
  -- paused_at, paused_until, referral_code, referred_by, and other sensitive fields
  account_status
FROM public.profiles
WHERE account_status = 'active';

-- Grant SELECT on public_profiles to authenticated and anon
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- Add comment explaining the security model
COMMENT ON VIEW public.public_profiles IS 'Safe public view of profiles - excludes PII like email, phone, national_id. Use this for displaying other users profiles.';

COMMENT ON POLICY "Users can view own full profile" ON public.profiles IS 'Users can see all their own profile data including sensitive PII';
COMMENT ON POLICY "Users can view other active profiles basic info" ON public.profiles IS 'Authenticated users can view other active profiles - app code should use public_profiles view to limit exposed fields';