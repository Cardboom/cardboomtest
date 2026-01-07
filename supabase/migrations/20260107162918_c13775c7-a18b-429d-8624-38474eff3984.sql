-- Gem Gift Cards table
CREATE TABLE public.gem_gift_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  recipient_id UUID REFERENCES auth.users(id),
  recipient_email TEXT,
  denomination_cents INTEGER NOT NULL CHECK (denomination_cents IN (500, 1000, 2000, 5000, 10000, 100000)),
  gem_amount INTEGER NOT NULL,
  code TEXT NOT NULL UNIQUE DEFAULT upper(substring(md5(random()::text) from 1 for 8)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired', 'cancelled')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  claimed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '1 year')
);

-- Enable RLS
ALTER TABLE public.gem_gift_cards ENABLE ROW LEVEL SECURITY;

-- Sender can see their sent gift cards
CREATE POLICY "Users can view gift cards they sent"
ON public.gem_gift_cards
FOR SELECT
USING (auth.uid() = sender_id);

-- Recipients can see gift cards sent to them
CREATE POLICY "Users can view gift cards sent to them"
ON public.gem_gift_cards
FOR SELECT
USING (auth.uid() = recipient_id OR recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Users can create gift cards
CREATE POLICY "Users can create gift cards"
ON public.gem_gift_cards
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Recipients can update to claim
CREATE POLICY "Recipients can claim gift cards"
ON public.gem_gift_cards
FOR UPDATE
USING (
  status = 'pending' AND 
  (recipient_id = auth.uid() OR recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- Function to claim a gift card
CREATE OR REPLACE FUNCTION public.claim_gift_card(gift_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  gift_card RECORD;
  user_email TEXT;
  result JSONB;
BEGIN
  -- Get user email
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
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
  IF gift_card.recipient_id IS NOT NULL AND gift_card.recipient_id != auth.uid() THEN
    IF gift_card.recipient_email IS NOT NULL AND gift_card.recipient_email != user_email THEN
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

-- Function to spend gems on services
CREATE OR REPLACE FUNCTION public.spend_gems_on_service(
  p_amount INTEGER,
  p_service_type TEXT,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance INTEGER;
  result JSONB;
BEGIN
  -- Get current balance
  SELECT balance INTO current_balance FROM cardboom_points WHERE user_id = auth.uid();
  
  IF current_balance IS NULL OR current_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient gems balance');
  END IF;
  
  -- Deduct gems
  UPDATE cardboom_points 
  SET balance = balance - p_amount,
      total_spent = total_spent + p_amount,
      updated_at = now()
  WHERE user_id = auth.uid();
  
  -- Record transaction
  INSERT INTO cardboom_points_history (user_id, amount, transaction_type, source, description, reference_id)
  VALUES (auth.uid(), p_amount, 'spend', p_service_type, 'Gems spent on ' || p_service_type, p_reference_id);
  
  RETURN jsonb_build_object(
    'success', true, 
    'gems_spent', p_amount,
    'new_balance', current_balance - p_amount
  );
END;
$$;