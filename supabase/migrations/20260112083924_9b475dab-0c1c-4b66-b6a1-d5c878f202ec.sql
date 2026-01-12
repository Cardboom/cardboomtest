-- Add currency support to offers table
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS amount_usd NUMERIC; -- Stores USD equivalent for non-USD offers

-- Add phone number support to gem_gift_cards
ALTER TABLE public.gem_gift_cards ADD COLUMN IF NOT EXISTS recipient_phone TEXT;

-- Update the claim_gift_card function to also check phone number
CREATE OR REPLACE FUNCTION public.claim_gift_card(gift_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  gift_card RECORD;
  user_email TEXT;
  user_phone TEXT;
  result JSONB;
BEGIN
  -- Get user email and phone
  SELECT email, phone INTO user_email, user_phone FROM auth.users WHERE id = auth.uid();
  
  -- Find and lock the gift card
  SELECT * INTO gift_card 
  FROM gem_gift_cards 
  WHERE code = upper(gift_code) 
  AND status = 'pending'
  AND expires_at > now()
  FOR UPDATE;
  
  IF gift_card IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift card not found, already claimed, or expired');
  END IF;
  
  -- Check if user is intended recipient or card is open
  -- Card is open if both recipient_id and recipient_email and recipient_phone are NULL
  IF gift_card.recipient_id IS NOT NULL AND gift_card.recipient_id != auth.uid() THEN
    -- Not the direct recipient, check email
    IF gift_card.recipient_email IS NOT NULL AND gift_card.recipient_email != user_email THEN
      -- Not the email recipient, check phone
      IF gift_card.recipient_phone IS NOT NULL AND gift_card.recipient_phone != user_phone THEN
        RETURN jsonb_build_object('success', false, 'error', 'This gift card is for a different user');
      ELSIF gift_card.recipient_phone IS NULL THEN
        -- Has email restriction but not phone, and email doesn't match
        RETURN jsonb_build_object('success', false, 'error', 'This gift card is for a different user');
      END IF;
    END IF;
  ELSIF gift_card.recipient_id IS NULL THEN
    -- No direct user recipient, check if email or phone restriction exists
    IF gift_card.recipient_email IS NOT NULL AND gift_card.recipient_email != user_email THEN
      IF gift_card.recipient_phone IS NOT NULL AND gift_card.recipient_phone != user_phone THEN
        RETURN jsonb_build_object('success', false, 'error', 'This gift card is for a different user');
      ELSIF gift_card.recipient_phone IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'This gift card is for a different user');
      END IF;
    ELSIF gift_card.recipient_phone IS NOT NULL AND gift_card.recipient_phone != user_phone THEN
      RETURN jsonb_build_object('success', false, 'error', 'This gift card is for a different user');
    END IF;
  END IF;
  
  -- Update gift card status
  UPDATE gem_gift_cards 
  SET status = 'claimed', 
      recipient_id = auth.uid(),
      claimed_at = now()
  WHERE id = gift_card.id;
  
  -- Add gems to user's balance
  INSERT INTO cardboom_points (user_id, balance, total_earned, total_spent)
  VALUES (auth.uid(), gift_card.gem_amount, gift_card.gem_amount, 0)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    balance = cardboom_points.balance + gift_card.gem_amount,
    total_earned = cardboom_points.total_earned + gift_card.gem_amount,
    updated_at = now();
  
  -- Record in history
  INSERT INTO cardboom_points_history (user_id, amount, transaction_type, source, description, reference_id)
  VALUES (auth.uid(), gift_card.gem_amount, 'earn', 'gift_card', 'Gift card claimed: ' || gift_card.code, gift_card.id::text);
  
  RETURN jsonb_build_object(
    'success', true, 
    'gems_received', gift_card.gem_amount,
    'denomination_cents', gift_card.denomination_cents
  );
END;
$$;