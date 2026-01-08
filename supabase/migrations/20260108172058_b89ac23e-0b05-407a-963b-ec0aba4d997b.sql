-- Create grading_donations table for piggy bank system
CREATE TABLE public.grading_donations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_instance_id uuid REFERENCES public.card_instances(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
  market_item_id uuid REFERENCES public.market_items(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  donor_user_id uuid NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  message text,
  status text NOT NULL DEFAULT 'pending', -- pending, applied, refunded
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  applied_at timestamp with time zone,
  CONSTRAINT valid_target CHECK (
    card_instance_id IS NOT NULL OR listing_id IS NOT NULL OR market_item_id IS NOT NULL
  )
);

-- Enable RLS
ALTER TABLE public.grading_donations ENABLE ROW LEVEL SECURITY;

-- Policies for grading_donations
CREATE POLICY "Users can view donations to their cards"
ON public.grading_donations
FOR SELECT
USING (auth.uid() = owner_user_id OR auth.uid() = donor_user_id);

CREATE POLICY "Authenticated users can donate"
ON public.grading_donations
FOR INSERT
WITH CHECK (auth.uid() = donor_user_id);

-- Add donation settings to card_instances
ALTER TABLE public.card_instances
ADD COLUMN IF NOT EXISTS accepts_grading_donations boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS donation_goal_cents integer DEFAULT 2000; -- $20 default grading fee

-- Add donation settings to listings
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS accepts_grading_donations boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS donation_goal_cents integer DEFAULT 2000;

-- Create view for total donations per card
CREATE OR REPLACE VIEW public.card_donation_totals AS
SELECT 
  COALESCE(card_instance_id::text, listing_id::text, market_item_id::text) as target_id,
  card_instance_id,
  listing_id,
  market_item_id,
  owner_user_id,
  SUM(amount_cents) FILTER (WHERE status = 'pending') as total_pending_cents,
  SUM(amount_cents) FILTER (WHERE status = 'applied') as total_applied_cents,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count
FROM public.grading_donations
GROUP BY card_instance_id, listing_id, market_item_id, owner_user_id;

-- Create function to process grading donation (deducts from donor wallet)
CREATE OR REPLACE FUNCTION public.donate_for_grading(
  p_target_type text,
  p_target_id uuid,
  p_amount_cents integer,
  p_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_donor_id uuid;
  v_owner_id uuid;
  v_wallet_id uuid;
  v_wallet_balance numeric;
  v_donation_id uuid;
BEGIN
  -- Get current user
  v_donor_id := auth.uid();
  IF v_donor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get owner based on target type
  IF p_target_type = 'card_instance' THEN
    SELECT owner_user_id INTO v_owner_id FROM card_instances WHERE id = p_target_id AND accepts_grading_donations = true;
  ELSIF p_target_type = 'listing' THEN
    SELECT seller_id INTO v_owner_id FROM listings WHERE id = p_target_id AND accepts_grading_donations = true;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid target type');
  END IF;

  IF v_owner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Card not accepting donations');
  END IF;

  -- Cannot donate to own card
  IF v_donor_id = v_owner_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot donate to your own card');
  END IF;

  -- Check donor wallet balance
  SELECT id, balance INTO v_wallet_id, v_wallet_balance
  FROM wallets WHERE user_id = v_donor_id;

  IF v_wallet_balance IS NULL OR v_wallet_balance < (p_amount_cents / 100.0) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient wallet balance');
  END IF;

  -- Deduct from donor wallet
  UPDATE wallets SET balance = balance - (p_amount_cents / 100.0), updated_at = now()
  WHERE id = v_wallet_id;

  -- Record transaction
  INSERT INTO wallet_transactions (wallet_id, amount, type, description)
  VALUES (v_wallet_id, -(p_amount_cents / 100.0), 'grading_donation', 'Grading donation for card');

  -- Create donation record
  INSERT INTO grading_donations (
    card_instance_id,
    listing_id,
    owner_user_id,
    donor_user_id,
    amount_cents,
    message
  ) VALUES (
    CASE WHEN p_target_type = 'card_instance' THEN p_target_id ELSE NULL END,
    CASE WHEN p_target_type = 'listing' THEN p_target_id ELSE NULL END,
    v_owner_id,
    v_donor_id,
    p_amount_cents,
    p_message
  ) RETURNING id INTO v_donation_id;

  RETURN jsonb_build_object('success', true, 'donation_id', v_donation_id);
END;
$$;