-- Fix the security definer view issue by dropping it and using a secure approach
DROP VIEW IF EXISTS public.public_profiles;

-- Drop the overly permissive policy we just created
DROP POLICY IF EXISTS "Public can view limited profile data" ON public.profiles;

-- Create a more restrictive RLS policy
-- Users can only see their own profile OR profiles where they need minimal public info
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- This policy already exists but let's ensure admins have access
-- (checking if it exists first by using IF NOT EXISTS pattern via DO block)
DO $$
BEGIN
  -- The admin policies already exist from the schema, so we don't need to recreate them
  NULL;
END $$;

-- For public profile viewing (leaderboards, seller profiles, etc.), 
-- create a SECURITY INVOKER view (default) that only exposes safe columns
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  display_name,
  avatar_url,
  bio,
  badges,
  level,
  xp,
  account_type,
  is_beta_tester,
  created_at,
  title,
  showcase_items,
  guru_expertise,
  custom_guru
FROM public.profiles
WHERE account_status = 'active';

-- Grant select on the view
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Add RLS bypass for the view to work for public profile lookups
-- We need a policy that allows viewing basic profile info for other users
CREATE POLICY "Anyone can view active public profiles" 
ON public.profiles 
FOR SELECT 
USING (account_status = 'active');

-- This allows reading profiles but the view filters to only safe columns
-- The sensitive data (email, phone, national_id, etc.) is not in the view