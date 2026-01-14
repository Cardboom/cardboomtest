-- Add creator revenue share fields to creator_profiles
ALTER TABLE public.creator_profiles 
ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS revenue_share_percent numeric(5,2) DEFAULT 0 CHECK (revenue_share_percent >= 0 AND revenue_share_percent <= 100),
ADD COLUMN IF NOT EXISTS total_earnings_cents bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS pending_earnings_cents bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id);

-- Create creator earnings log table for transparency
CREATE TABLE IF NOT EXISTS public.creator_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  source_user_id uuid REFERENCES public.profiles(id),
  source_type text NOT NULL, -- 'grading_order', 'sale', 'referral_sale'
  source_id uuid, -- order_id or listing_id
  gross_revenue_cents bigint NOT NULL,
  platform_fee_cents bigint NOT NULL,
  creator_share_percent numeric(5,2) NOT NULL,
  creator_earnings_cents bigint NOT NULL,
  status text DEFAULT 'pending', -- 'pending', 'credited', 'paid_out'
  credited_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creator_earnings ENABLE ROW LEVEL SECURITY;

-- Creators can view their own earnings
CREATE POLICY "Creators can view own earnings" ON public.creator_earnings
  FOR SELECT USING (
    creator_id IN (SELECT id FROM public.creator_profiles WHERE user_id = auth.uid())
  );

-- Admins can manage all earnings
CREATE POLICY "Admins can manage earnings" ON public.creator_earnings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Function to credit creator earnings
CREATE OR REPLACE FUNCTION public.credit_creator_earnings(
  p_creator_profile_id uuid,
  p_source_user_id uuid,
  p_source_type text,
  p_source_id uuid,
  p_gross_revenue_cents bigint,
  p_platform_fee_cents bigint
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_share_percent numeric(5,2);
  v_creator_user_id uuid;
  v_earnings_cents bigint;
  v_earnings_id uuid;
BEGIN
  -- Get creator's revenue share percentage and user_id
  SELECT revenue_share_percent, user_id INTO v_creator_share_percent, v_creator_user_id
  FROM creator_profiles
  WHERE id = p_creator_profile_id AND is_approved = true;
  
  IF v_creator_share_percent IS NULL OR v_creator_share_percent = 0 THEN
    RETURN NULL;
  END IF;
  
  -- Calculate creator earnings (% of platform fee)
  v_earnings_cents := FLOOR(p_platform_fee_cents * (v_creator_share_percent / 100));
  
  IF v_earnings_cents <= 0 THEN
    RETURN NULL;
  END IF;
  
  -- Insert earnings record
  INSERT INTO creator_earnings (
    creator_id, source_user_id, source_type, source_id,
    gross_revenue_cents, platform_fee_cents, creator_share_percent, creator_earnings_cents,
    status, credited_at
  ) VALUES (
    p_creator_profile_id, p_source_user_id, p_source_type, p_source_id,
    p_gross_revenue_cents, p_platform_fee_cents, v_creator_share_percent, v_earnings_cents,
    'credited', now()
  ) RETURNING id INTO v_earnings_id;
  
  -- Update creator totals
  UPDATE creator_profiles
  SET total_earnings_cents = total_earnings_cents + v_earnings_cents
  WHERE id = p_creator_profile_id;
  
  -- Credit to creator's wallet
  UPDATE wallets
  SET balance = balance + (v_earnings_cents::numeric / 100),
      updated_at = now()
  WHERE user_id = v_creator_user_id;
  
  -- Add transaction record
  INSERT INTO transactions (user_id, type, amount, status, description, reference_id)
  VALUES (
    v_creator_user_id, 'creator_earnings', (v_earnings_cents::numeric / 100), 'completed',
    'Creator revenue share from ' || p_source_type, p_source_id
  );
  
  RETURN v_earnings_id;
END;
$$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_creator_earnings_creator_id ON public.creator_earnings(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_earnings_source ON public.creator_earnings(source_type, source_id);