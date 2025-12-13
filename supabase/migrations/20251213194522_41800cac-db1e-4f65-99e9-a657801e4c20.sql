-- Add account status fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS banned_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS banned_reason text,
ADD COLUMN IF NOT EXISTS paused_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS paused_until timestamp with time zone;

-- Create index for account status queries
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles(account_status);

-- Allow admins to update all profiles (for banning/pausing)
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all transactions
CREATE POLICY "Admins can view all transactions"
ON public.transactions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all listing comments
CREATE POLICY "Admins can view all comments"
ON public.listing_comments
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete comments
CREATE POLICY "Admins can delete comments"
ON public.listing_comments
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));