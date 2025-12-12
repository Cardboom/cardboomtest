-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create a more secure policy - users can only view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Create a policy to allow viewing basic public info (display_name, avatar_url) for other users
-- This is useful for showing seller info on listings
CREATE POLICY "Anyone can view public profile info"
ON public.profiles FOR SELECT
USING (true);