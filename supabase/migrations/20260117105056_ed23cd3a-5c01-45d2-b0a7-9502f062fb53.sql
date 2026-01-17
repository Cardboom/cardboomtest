-- Fix discussion_comments RLS policy to allow all authenticated users to comment
-- This is a community feature - new users should be able to participate

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Eligible users can post comments" ON public.discussion_comments;

-- Create a simpler policy that allows any authenticated user to post
CREATE POLICY "Authenticated users can post comments" 
ON public.discussion_comments 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND length(content) > 10
);

-- Also ensure card_war_votes policy works for non-pro users
-- The existing policy is correct (auth.uid() = user_id), so no change needed there