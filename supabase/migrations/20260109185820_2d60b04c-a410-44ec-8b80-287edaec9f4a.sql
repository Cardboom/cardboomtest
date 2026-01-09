-- Add columns to wire_transfers for auto-verification
ALTER TABLE public.wire_transfers ADD COLUMN IF NOT EXISTS national_id_match TEXT;
ALTER TABLE public.wire_transfers ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.wire_transfers ADD COLUMN IF NOT EXISTS auto_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.wire_transfers ADD COLUMN IF NOT EXISTS scheduled_credit_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.wire_transfers ADD COLUMN IF NOT EXISTS credited_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.wire_transfers ADD COLUMN IF NOT EXISTS wallet_transaction_id UUID;

-- Create function to auto-match wire transfers by national ID
CREATE OR REPLACE FUNCTION public.process_pending_wire_transfers()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  processed_count INTEGER := 0;
  transfer RECORD;
  matched_profile RECORD;
  commission_rate NUMERIC := 0.03; -- 3% fee
  flat_fee NUMERIC := 0.50;
  net_amount_usd NUMERIC;
  usd_rate NUMERIC;
BEGIN
  -- Get current USD/TRY rate
  SELECT rate INTO usd_rate FROM currency_rates WHERE from_currency = 'USD' AND to_currency = 'TRY' LIMIT 1;
  IF usd_rate IS NULL THEN
    usd_rate := 38.0; -- Fallback rate
  END IF;

  -- Process transfers that have been scheduled and 1 day has passed
  FOR transfer IN 
    SELECT * FROM wire_transfers 
    WHERE status = 'verified' 
    AND scheduled_credit_at IS NOT NULL 
    AND scheduled_credit_at <= NOW()
    AND credited_at IS NULL
  LOOP
    -- Credit user wallet
    UPDATE wallets 
    SET balance = balance + transfer.net_amount,
        updated_at = NOW()
    WHERE user_id = transfer.user_id;
    
    -- If wallet doesn't exist, create it
    IF NOT FOUND THEN
      INSERT INTO wallets (user_id, balance) VALUES (transfer.user_id, transfer.net_amount);
    END IF;
    
    -- Mark transfer as credited
    UPDATE wire_transfers
    SET credited_at = NOW(),
        status = 'credited'
    WHERE id = transfer.id;
    
    processed_count := processed_count + 1;
  END LOOP;
  
  RETURN processed_count;
END;
$$;

-- Create function to verify wire transfer by national ID
CREATE OR REPLACE FUNCTION public.verify_wire_transfer_by_national_id(
  p_transfer_id UUID,
  p_national_id TEXT,
  p_amount NUMERIC,
  p_sender_name TEXT DEFAULT NULL,
  p_sender_iban TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_profile RECORD;
  commission_rate NUMERIC := 0.03; -- 3% fee
  flat_fee NUMERIC := 0.50;
  net_amount_try NUMERIC;
  usd_rate NUMERIC;
  net_amount_usd NUMERIC;
  result JSON;
BEGIN
  -- Find user by national ID
  SELECT id, display_name, email, national_id INTO matched_profile
  FROM profiles
  WHERE national_id = p_national_id
  LIMIT 1;
  
  IF matched_profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No user found with this National ID');
  END IF;
  
  -- Get current USD/TRY rate
  SELECT rate INTO usd_rate FROM currency_rates WHERE from_currency = 'USD' AND to_currency = 'TRY' LIMIT 1;
  IF usd_rate IS NULL THEN
    usd_rate := 38.0; -- Fallback rate
  END IF;
  
  -- Calculate net amount (amount is in TRY, convert to USD after fee)
  net_amount_try := p_amount * (1 - commission_rate);
  net_amount_usd := (net_amount_try / usd_rate) - flat_fee;
  
  IF net_amount_usd <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Transfer amount too small after fees');
  END IF;
  
  -- Update the transfer record
  UPDATE wire_transfers
  SET user_id = matched_profile.id,
      national_id_match = p_national_id,
      sender_name = COALESCE(p_sender_name, sender_name),
      sender_iban = COALESCE(p_sender_iban, sender_iban),
      transfer_description = COALESCE(p_description, transfer_description),
      amount = p_amount,
      net_amount = net_amount_usd,
      commission_rate = commission_rate,
      status = 'verified',
      verified_at = NOW(),
      auto_verified = TRUE,
      scheduled_credit_at = NOW() + INTERVAL '1 day'
  WHERE id = p_transfer_id;
  
  RETURN json_build_object(
    'success', true,
    'user_id', matched_profile.id,
    'display_name', matched_profile.display_name,
    'amount_try', p_amount,
    'net_amount_usd', net_amount_usd,
    'scheduled_credit_at', NOW() + INTERVAL '1 day'
  );
END;
$$;

-- Add 'verified' and 'credited' to wire_transfer_status enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'verified' AND enumtypid = 'wire_transfer_status'::regtype) THEN
    ALTER TYPE wire_transfer_status ADD VALUE 'verified';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'credited' AND enumtypid = 'wire_transfer_status'::regtype) THEN
    ALTER TYPE wire_transfer_status ADD VALUE 'credited';
  END IF;
END $$;