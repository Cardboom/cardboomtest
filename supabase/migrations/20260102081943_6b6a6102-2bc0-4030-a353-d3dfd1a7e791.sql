-- CRITICAL SECURITY FIX: Drop the policy that exposes profiles to public
-- The policy "Anyone can view active public profiles" exposes PII (emails, phone numbers, IDs)

DROP POLICY IF EXISTS "Anyone can view active public profiles" ON public.profiles;

-- Also fix the waitlist table - currently has qual:true exposing all emails
DROP POLICY IF EXISTS "Check own waitlist entry" ON public.waitlist;

-- Create proper admin-only policy for waitlist viewing
CREATE POLICY "Only admins can view waitlist"
ON public.waitlist
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Users can only check if their own email exists (for duplicate prevention)
CREATE POLICY "Users can check own email exists"
ON public.waitlist
FOR SELECT
USING (email = current_setting('request.jwt.claims', true)::json->>'email');