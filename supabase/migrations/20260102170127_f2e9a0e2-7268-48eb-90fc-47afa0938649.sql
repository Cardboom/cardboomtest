-- Add shipping fee and first card bonus tracking to vault_items
ALTER TABLE public.vault_items
ADD COLUMN IF NOT EXISTS shipping_fee_paid numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS return_shipping_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS first_card_bonus_applied boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS first_card_bonus_amount numeric DEFAULT 0;

-- Track if user has sent first card to vault (for bonus eligibility)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_vault_card_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS first_vault_card_sent_at timestamp with time zone;

-- Create vault shipping rates table
CREATE TABLE IF NOT EXISTS public.vault_shipping_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL CHECK (direction IN ('to_vault', 'from_vault')),
  rate_try numeric NOT NULL DEFAULT 50,
  rate_usd numeric NOT NULL DEFAULT 5,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vault_shipping_rates ENABLE ROW LEVEL SECURITY;

-- Anyone can view shipping rates
CREATE POLICY "Anyone can view shipping rates"
  ON public.vault_shipping_rates
  FOR SELECT
  USING (true);

-- Admins can manage rates
CREATE POLICY "Admins can manage shipping rates"
  ON public.vault_shipping_rates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default shipping rates
INSERT INTO public.vault_shipping_rates (direction, rate_try, rate_usd) VALUES
  ('to_vault', 50, 5),
  ('from_vault', 75, 7.5)
ON CONFLICT DO NOTHING;

-- Function to check and apply first card bonus
CREATE OR REPLACE FUNCTION public.apply_first_vault_card_bonus(
  p_user_id uuid,
  p_vault_item_id uuid,
  p_estimated_value_try numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_bonus_amount numeric := 0;
  v_already_sent boolean;
BEGIN
  -- Check if user already sent first card
  SELECT first_vault_card_sent INTO v_already_sent
  FROM profiles WHERE id = p_user_id;
  
  -- If not sent and value >= 1000 TRY, apply bonus
  IF NOT COALESCE(v_already_sent, false) AND p_estimated_value_try >= 1000 THEN
    v_bonus_amount := 50; -- 50 TRY bonus
    
    -- Update profile
    UPDATE profiles 
    SET first_vault_card_sent = true,
        first_vault_card_sent_at = now()
    WHERE id = p_user_id;
    
    -- Update vault item
    UPDATE vault_items
    SET first_card_bonus_applied = true,
        first_card_bonus_amount = v_bonus_amount
    WHERE id = p_vault_item_id;
    
    -- Credit to wallet (in TRY equivalent)
    -- We'll handle this via the wallet balance for now
    UPDATE wallets
    SET balance = balance + (v_bonus_amount / 35), -- Convert TRY to USD approx
        updated_at = now()
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN v_bonus_amount;
END;
$$;