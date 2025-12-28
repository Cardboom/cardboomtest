-- ============================================
-- STEP 2: Add _cents columns to money tables
-- ============================================

-- Add balance_cents to wallets (will be cached/materialized)
ALTER TABLE public.wallets 
ADD COLUMN IF NOT EXISTS balance_cents bigint DEFAULT 0 CHECK (balance_cents >= 0),
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD' CHECK (currency IN ('USD', 'TRY', 'EUR'));

-- Add _cents columns to listings
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS price_cents bigint CHECK (price_cents >= 0),
ADD COLUMN IF NOT EXISTS external_price_cents bigint CHECK (external_price_cents >= 0);

-- Add _cents columns to orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS price_cents bigint CHECK (price_cents >= 0),
ADD COLUMN IF NOT EXISTS buyer_fee_cents bigint CHECK (buyer_fee_cents >= 0),
ADD COLUMN IF NOT EXISTS seller_fee_cents bigint CHECK (seller_fee_cents >= 0);

-- Add _cents columns to market_items
ALTER TABLE public.market_items
ADD COLUMN IF NOT EXISTS current_price_cents bigint CHECK (current_price_cents >= 0);

-- Add _cents columns to grading_orders
ALTER TABLE public.grading_orders
ADD COLUMN IF NOT EXISTS price_cents bigint CHECK (price_cents >= 0);

-- ============================================
-- STEP 3: Idempotency system
-- ============================================

-- Create idempotency_keys table
CREATE TABLE public.idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  
  CONSTRAINT idempotency_unique_key UNIQUE (user_id, idempotency_key)
);

CREATE INDEX idx_idempotency_expires ON public.idempotency_keys(expires_at);
CREATE INDEX idx_idempotency_user ON public.idempotency_keys(user_id);

-- RLS for idempotency_keys
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage idempotency keys"
ON public.idempotency_keys FOR ALL
USING (true)
WITH CHECK (true);

-- Function to check idempotency and get cached response
CREATE OR REPLACE FUNCTION public.check_idempotency(
  p_user_id uuid,
  p_key text,
  p_request_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing record;
BEGIN
  SELECT * INTO v_existing 
  FROM public.idempotency_keys 
  WHERE user_id = p_user_id 
    AND idempotency_key = p_key
    AND expires_at > now();
  
  IF v_existing IS NULL THEN
    RETURN NULL;
  END IF;
  
  IF v_existing.request_hash != p_request_hash THEN
    RETURN jsonb_build_object('error', 'Idempotency key reused with different request');
  END IF;
  
  RETURN v_existing.response;
END;
$$;

-- Function to record idempotency result
CREATE OR REPLACE FUNCTION public.record_idempotency(
  p_user_id uuid,
  p_key text,
  p_request_hash text,
  p_response jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.idempotency_keys (user_id, idempotency_key, request_hash, response)
  VALUES (p_user_id, p_key, p_request_hash, p_response)
  ON CONFLICT (user_id, idempotency_key) DO NOTHING;
END;
$$;

-- ============================================
-- STEP 4: Safe ledger posting function
-- ============================================

-- Function to post a ledger entry with idempotency
CREATE OR REPLACE FUNCTION public.post_ledger_entry(
  p_wallet_id uuid,
  p_delta_cents bigint,
  p_currency text,
  p_entry_type ledger_entry_type,
  p_reference_type text,
  p_reference_id uuid,
  p_description text,
  p_idempotency_key text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id uuid;
  v_current_balance bigint;
BEGIN
  -- Check if this would result in negative balance for withdrawals
  IF p_delta_cents < 0 THEN
    v_current_balance := get_wallet_balance(p_wallet_id, p_currency);
    IF v_current_balance + p_delta_cents < 0 THEN
      RAISE EXCEPTION 'Insufficient balance: current=%, requested=%', v_current_balance, ABS(p_delta_cents);
    END IF;
  END IF;

  -- Insert ledger entry (idempotency key prevents duplicates)
  INSERT INTO public.ledger_entries (
    wallet_id, delta_cents, currency, entry_type, 
    reference_type, reference_id, description, idempotency_key
  )
  VALUES (
    p_wallet_id, p_delta_cents, p_currency, p_entry_type,
    p_reference_type, p_reference_id, p_description, p_idempotency_key
  )
  ON CONFLICT (wallet_id, idempotency_key) DO NOTHING
  RETURNING id INTO v_entry_id;
  
  -- If we got an id, update cached balance
  IF v_entry_id IS NOT NULL THEN
    UPDATE public.wallets 
    SET balance_cents = get_wallet_balance(p_wallet_id, p_currency),
        updated_at = now()
    WHERE id = p_wallet_id;
  ELSE
    -- Duplicate detected, get existing entry id
    SELECT id INTO v_entry_id FROM public.ledger_entries 
    WHERE wallet_id = p_wallet_id AND idempotency_key = p_idempotency_key;
  END IF;
  
  RETURN v_entry_id;
END;
$$;

-- Trigger to update cached balance on any ledger insert
CREATE OR REPLACE FUNCTION public.update_wallet_cached_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.wallets 
  SET balance_cents = get_wallet_balance(NEW.wallet_id, NEW.currency),
      updated_at = now()
  WHERE id = NEW.wallet_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_wallet_balance
AFTER INSERT ON public.ledger_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_wallet_cached_balance();