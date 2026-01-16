-- Add pending_balance column to wallets table for tracking funds held in verification
ALTER TABLE public.wallets 
ADD COLUMN IF NOT EXISTS pending_balance NUMERIC DEFAULT 0 NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.wallets.pending_balance IS 'Funds held in escrow pending verification, not yet available for withdrawal';