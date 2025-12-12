-- Add national_id and phone to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS national_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wire_transfer_code TEXT UNIQUE;

-- Create XP/Rewards system tables
CREATE TYPE public.xp_action_type AS ENUM ('purchase', 'sale', 'listing', 'referral', 'daily_login', 'review', 'first_purchase', 'streak_bonus');
CREATE TYPE public.reward_type AS ENUM ('voucher', 'free_shipping', 'early_access', 'exclusive_drop');
CREATE TYPE public.reward_status AS ENUM ('available', 'claimed', 'expired', 'used');
CREATE TYPE public.wire_transfer_status AS ENUM ('pending', 'matched', 'confirmed', 'rejected');

-- XP History table
CREATE TABLE public.xp_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action xp_action_type NOT NULL,
  xp_earned INTEGER NOT NULL,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.xp_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own XP history" ON public.xp_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert XP history" ON public.xp_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Rewards catalog table
CREATE TABLE public.rewards_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type reward_type NOT NULL,
  xp_cost INTEGER NOT NULL,
  value_amount NUMERIC,
  is_active BOOLEAN DEFAULT true,
  stock INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rewards_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active rewards" ON public.rewards_catalog
  FOR SELECT USING (is_active = true);

-- User rewards (claimed rewards)
CREATE TABLE public.user_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reward_id UUID NOT NULL REFERENCES public.rewards_catalog(id),
  status reward_status NOT NULL DEFAULT 'claimed',
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  code TEXT UNIQUE
);

ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rewards" ON public.user_rewards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can claim rewards" ON public.user_rewards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their rewards" ON public.user_rewards
  FOR UPDATE USING (auth.uid() = user_id);

-- Wire transfers table
CREATE TABLE public.wire_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'TRY',
  sender_name TEXT,
  sender_iban TEXT,
  transfer_description TEXT,
  matched_code TEXT,
  status wire_transfer_status NOT NULL DEFAULT 'pending',
  commission_rate NUMERIC DEFAULT 0.0125,
  net_amount NUMERIC,
  notes TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wire_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their matched transfers" ON public.wire_transfers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage transfers" ON public.wire_transfers
  FOR ALL USING (true);

-- User IBAN table for withdrawals
CREATE TABLE public.user_ibans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  iban TEXT NOT NULL,
  bank_name TEXT,
  holder_name TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_ibans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their IBANs" ON public.user_ibans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add IBANs" ON public.user_ibans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their IBANs" ON public.user_ibans
  FOR UPDATE USING (auth.uid() = user_id);

-- Daily login tracking
CREATE TABLE public.daily_logins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  login_date DATE NOT NULL DEFAULT CURRENT_DATE,
  streak_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, login_date)
);

ALTER TABLE public.daily_logins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their logins" ON public.daily_logins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can log daily login" ON public.daily_logins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to generate unique wire transfer code
CREATE OR REPLACE FUNCTION public.generate_wire_transfer_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.wire_transfer_code IS NULL THEN
    NEW.wire_transfer_code := 'CB-' || UPPER(SUBSTRING(NEW.id::text, 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate wire transfer code on profile insert
CREATE TRIGGER generate_wire_code_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_wire_transfer_code();

-- Function to calculate level from XP
CREATE OR REPLACE FUNCTION public.calculate_level(xp_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Level formula: Level = floor(sqrt(xp / 100)) + 1
  RETURN GREATEST(1, FLOOR(SQRT(xp_amount::NUMERIC / 100)) + 1)::INTEGER;
END;
$$;

-- Insert default rewards
INSERT INTO public.rewards_catalog (name, description, type, xp_cost, value_amount, stock) VALUES
  ('$5 Card Voucher', 'Redeem for $5 off any card purchase', 'voucher', 500, 5, NULL),
  ('$10 Card Voucher', 'Redeem for $10 off any card purchase', 'voucher', 900, 10, NULL),
  ('$25 Card Voucher', 'Redeem for $25 off any card purchase', 'voucher', 2000, 25, NULL),
  ('Free Shipping', 'Free shipping on your next order', 'free_shipping', 300, 0, NULL),
  ('Early Access Pass', 'Get early access to new drops for 30 days', 'early_access', 1500, 0, 100),
  ('Exclusive Drop Access', 'Access to exclusive limited edition drops', 'exclusive_drop', 5000, 0, 50);

-- Create indexes
CREATE INDEX idx_xp_history_user_id ON public.xp_history(user_id);
CREATE INDEX idx_user_rewards_user_id ON public.user_rewards(user_id);
CREATE INDEX idx_wire_transfers_status ON public.wire_transfers(status);
CREATE INDEX idx_wire_transfers_matched_code ON public.wire_transfers(matched_code);
CREATE INDEX idx_daily_logins_user_date ON public.daily_logins(user_id, login_date);