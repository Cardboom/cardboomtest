-- Add source tracking and eligibility fields to auctions table
ALTER TABLE public.auctions 
ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'direct',
ADD COLUMN IF NOT EXISTS source_vault_item_id uuid REFERENCES public.vault_items(id),
ADD COLUMN IF NOT EXISTS source_card_instance_id uuid REFERENCES public.card_instances(id);

-- Add check constraint for source type
ALTER TABLE public.auctions
ADD CONSTRAINT auctions_source_type_check 
CHECK (source_type IN ('direct', 'vault_verified', 'card_instance'));

-- Add constraint for max 14 days duration
-- Using validation trigger instead of CHECK constraint for time-based validation
CREATE OR REPLACE FUNCTION public.validate_auction_duration()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure auction duration is max 14 days (2 weeks)
  IF NEW.ends_at > NEW.starts_at + INTERVAL '14 days' THEN
    RAISE EXCEPTION 'Auction duration cannot exceed 14 days';
  END IF;
  
  -- Ensure auction end is in the future for new auctions
  IF TG_OP = 'INSERT' AND NEW.ends_at <= NOW() THEN
    RAISE EXCEPTION 'Auction end date must be in the future';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_auction_duration_trigger ON public.auctions;
CREATE TRIGGER validate_auction_duration_trigger
BEFORE INSERT OR UPDATE ON public.auctions
FOR EACH ROW
EXECUTE FUNCTION public.validate_auction_duration();

-- Create function to check if user can create auctions
CREATE OR REPLACE FUNCTION public.can_create_auction(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_verified boolean := false;
  is_enterprise boolean := false;
BEGIN
  -- Check if user is a verified seller
  SELECT EXISTS (
    SELECT 1 FROM verified_sellers 
    WHERE verified_sellers.user_id = $1 
    AND verification_status = 'approved'
    AND subscription_active = true
  ) INTO is_verified;
  
  -- Check if user has enterprise subscription
  SELECT EXISTS (
    SELECT 1 FROM user_subscriptions 
    WHERE user_subscriptions.user_id = $1 
    AND tier = 'enterprise'
    AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO is_enterprise;
  
  RETURN is_verified OR is_enterprise;
END;
$$;

-- Update RLS policy for auction creation to check eligibility
DROP POLICY IF EXISTS "Users can create auctions" ON public.auctions;
CREATE POLICY "Eligible users can create auctions"
ON public.auctions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = seller_id 
  AND public.can_create_auction(auth.uid())
);

-- Keep existing policies for viewing and updating
DROP POLICY IF EXISTS "Anyone can view active auctions" ON public.auctions;
CREATE POLICY "Anyone can view active auctions"
ON public.auctions
FOR SELECT
USING (status IN ('active', 'ended', 'completed'));

DROP POLICY IF EXISTS "Sellers can update own auctions" ON public.auctions;
CREATE POLICY "Sellers can update own auctions"
ON public.auctions
FOR UPDATE
TO authenticated
USING (auth.uid() = seller_id);

-- Add index for source lookups
CREATE INDEX IF NOT EXISTS idx_auctions_source_vault_item ON public.auctions(source_vault_item_id) WHERE source_vault_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_auctions_source_card_instance ON public.auctions(source_card_instance_id) WHERE source_card_instance_id IS NOT NULL;