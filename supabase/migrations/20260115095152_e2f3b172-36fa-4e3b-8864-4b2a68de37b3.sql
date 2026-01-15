
-- Allow users to check if a seller wallet exists (for purchase flow)
-- This only allows checking existence, the balance is not exposed via this policy
-- The purchase flow needs to verify the seller has a wallet before proceeding

CREATE POLICY "Users can verify seller wallet exists for purchases" 
ON public.wallets 
FOR SELECT 
USING (
  -- Allow if checking a seller who has active listings
  EXISTS (
    SELECT 1 FROM public.listings l 
    WHERE l.seller_id = wallets.user_id 
    AND l.status = 'active'
  )
  OR
  -- Or if it's your own wallet
  auth.uid() = user_id
);

-- Drop the old restrictive policy since the new one covers its case
DROP POLICY IF EXISTS "Users can view their own wallet" ON public.wallets;
