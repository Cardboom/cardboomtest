-- Add new columns to referrals table for tracking deposits and trades
ALTER TABLE public.referrals
ADD COLUMN IF NOT EXISTS referred_deposit_total numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS referred_trade_volume numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_earned numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tier text DEFAULT 'bronze';

-- Create referral_commissions table to track individual commission events
CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  referral_id uuid REFERENCES public.referrals(id),
  event_type text NOT NULL, -- 'deposit', 'trade', 'signup'
  source_amount numeric NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 0.05,
  commission_amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for referral_commissions
CREATE POLICY "Users can view their commissions"
ON public.referral_commissions
FOR SELECT
USING (auth.uid() = referrer_id);

CREATE POLICY "System can insert commissions"
ON public.referral_commissions
FOR INSERT
WITH CHECK (true);

-- Update watchlist to allow updates for target_price changes
DROP POLICY IF EXISTS "Users can update watchlist" ON public.watchlist;
CREATE POLICY "Users can update watchlist"
ON public.watchlist
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referrer ON public.referral_commissions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_created ON public.referral_commissions(created_at DESC);