-- Create a security definer function to get current user's email
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid()
$$;

-- Create a security definer function to get current user's phone
CREATE OR REPLACE FUNCTION public.get_current_user_phone()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT phone FROM auth.users WHERE id = auth.uid()
$$;

-- Drop the problematic policies that query auth.users directly
DROP POLICY IF EXISTS "Users can view gift cards sent to them" ON public.gem_gift_cards;
DROP POLICY IF EXISTS "Recipients can claim gift cards" ON public.gem_gift_cards;

-- Recreate policies using security definer functions
CREATE POLICY "Users can view gift cards sent to them"
ON public.gem_gift_cards
FOR SELECT
USING (
  auth.uid() = recipient_id 
  OR recipient_email = public.get_current_user_email()
  OR recipient_phone = public.get_current_user_phone()
);

CREATE POLICY "Recipients can claim gift cards"
ON public.gem_gift_cards
FOR UPDATE
USING (
  status = 'pending' AND (
    recipient_id = auth.uid() 
    OR recipient_email = public.get_current_user_email()
    OR recipient_phone = public.get_current_user_phone()
  )
);