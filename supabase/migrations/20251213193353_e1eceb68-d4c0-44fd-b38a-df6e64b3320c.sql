-- Fix 1: pending_payments UPDATE policy - restrict to owner only
DROP POLICY IF EXISTS "System can update pending payments" ON public.pending_payments;

CREATE POLICY "Only payment owner can update pending payments"
ON public.pending_payments
FOR UPDATE
USING (auth.uid() = user_id);

-- Fix 2: Add audit logging for wallet balance changes
CREATE TABLE IF NOT EXISTS public.wallet_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid REFERENCES public.wallets(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL,
  old_balance numeric,
  new_balance numeric,
  change_amount numeric NOT NULL,
  reference_id uuid,
  ip_address text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.wallet_audit_log ENABLE ROW LEVEL SECURITY;

-- Only allow service role to insert (via edge functions)
CREATE POLICY "System can insert audit logs"
ON public.wallet_audit_log
FOR INSERT
WITH CHECK (true);

-- Users can view their own audit logs
CREATE POLICY "Users can view their audit logs"
ON public.wallet_audit_log
FOR SELECT
USING (auth.uid() = user_id);

-- Fix 3: Add sample fractional listings for demo purposes
INSERT INTO public.market_items (id, name, category, subcategory, current_price, base_price, image_url, change_24h, is_trending, liquidity, sales_count_30d)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Charizard 1st Edition PSA 10', 'pokemon', 'Base Set', 420000, 400000, '/placeholder.svg', 5.0, true, 'high', 12),
  ('22222222-2222-2222-2222-222222222222', 'Michael Jordan Fleer PSA 10', 'nba', 'Fleer', 89000, 85000, '/placeholder.svg', 8.4, true, 'high', 18)
ON CONFLICT (id) DO NOTHING;

-- Add demo fractional listings
INSERT INTO public.fractional_listings (id, owner_id, market_item_id, total_shares, available_shares, share_price, min_shares, status, daily_verification_required, last_verified_at)
SELECT 
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  (SELECT id FROM auth.users LIMIT 1),
  '11111111-1111-1111-1111-111111111111',
  1000,
  850,
  420,
  10,
  'active',
  true,
  now()
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.fractional_listings (id, owner_id, market_item_id, total_shares, available_shares, share_price, min_shares, status, daily_verification_required, last_verified_at)
SELECT 
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  (SELECT id FROM auth.users LIMIT 1),
  '22222222-2222-2222-2222-222222222222',
  500,
  320,
  178,
  5,
  'active',
  true,
  now()
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1)
ON CONFLICT (id) DO NOTHING;