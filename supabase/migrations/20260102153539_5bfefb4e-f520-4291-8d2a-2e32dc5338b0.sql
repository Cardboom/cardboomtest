-- Add system account fields to profiles for better management
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS system_account_role TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS system_account_wallet_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_auto_action_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS auto_actions_count INTEGER DEFAULT 0;

-- Create index for system accounts
CREATE INDEX IF NOT EXISTS idx_profiles_system_account 
ON public.profiles(system_account_role) 
WHERE system_account_role IS NOT NULL;

-- Add comment explaining system account roles
COMMENT ON COLUMN public.profiles.system_account_role IS 'Role for system-managed accounts: buyer (auto-buy deals), seller (relist cards), engagement (likes/comments)';

-- Update auto_buy_config to support multiple buyer accounts
ALTER TABLE public.auto_buy_config 
ADD COLUMN IF NOT EXISTS use_rotating_buyers BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS min_delay_between_buys_seconds INTEGER DEFAULT 300,
ADD COLUMN IF NOT EXISTS max_daily_buys INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS daily_buy_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reset_date DATE DEFAULT CURRENT_DATE;

-- Create table to track organic-looking transactions
CREATE TABLE IF NOT EXISTS public.organic_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_account_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  seller_account_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  market_item_id UUID REFERENCES public.market_items(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL, -- 'auto_buy', 'auto_sell', 'relist'
  price NUMERIC NOT NULL,
  market_price NUMERIC,
  discount_percent NUMERIC,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  executed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending', -- pending, scheduled, executed, failed
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.organic_transactions ENABLE ROW LEVEL SECURITY;

-- Admin-only policy for organic transactions
CREATE POLICY "Admins can manage organic transactions"
ON public.organic_transactions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));