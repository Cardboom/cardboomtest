-- ============================================
-- STEP 1: Create enums and ledger_entries table
-- ============================================

-- Create enum for ledger entry types
CREATE TYPE public.ledger_entry_type AS ENUM (
  'deposit',
  'withdrawal', 
  'purchase',
  'sale',
  'refund',
  'grading_fee',
  'subscription_fee',
  'reward',
  'adjustment'
);

-- Create append-only ledger_entries table (immutable transaction log)
CREATE TABLE public.ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
  delta_cents bigint NOT NULL,
  currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'TRY', 'EUR')),
  entry_type ledger_entry_type NOT NULL,
  reference_type text NOT NULL,
  reference_id uuid,
  description text,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Prevent duplicate ledger entries
  CONSTRAINT ledger_unique_idempotency UNIQUE (wallet_id, idempotency_key)
);

-- Indexes for efficient balance calculation and queries
CREATE INDEX idx_ledger_wallet_id ON public.ledger_entries(wallet_id);
CREATE INDEX idx_ledger_created_at ON public.ledger_entries(created_at DESC);
CREATE INDEX idx_ledger_reference ON public.ledger_entries(reference_type, reference_id);
CREATE INDEX idx_ledger_entry_type ON public.ledger_entries(entry_type);

-- Make ledger_entries append-only (no updates or deletes)
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

-- Only allow inserts (append-only)
CREATE POLICY "Ledger entries are append-only system inserts"
ON public.ledger_entries FOR INSERT
WITH CHECK (true);

-- Users can only view their own ledger entries
CREATE POLICY "Users can view own ledger entries"
ON public.ledger_entries FOR SELECT
USING (
  wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid())
);

-- Function to calculate wallet balance from ledger
CREATE OR REPLACE FUNCTION public.get_wallet_balance(p_wallet_id uuid, p_currency text DEFAULT 'USD')
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(delta_cents), 0)::bigint
  FROM public.ledger_entries
  WHERE wallet_id = p_wallet_id AND currency = p_currency;
$$;

-- Function to get wallet balance for a user
CREATE OR REPLACE FUNCTION public.get_user_balance(p_user_id uuid, p_currency text DEFAULT 'USD')
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(le.delta_cents), 0)::bigint
  FROM public.ledger_entries le
  JOIN public.wallets w ON le.wallet_id = w.id
  WHERE w.user_id = p_user_id AND le.currency = p_currency;
$$;