-- =====================================================
-- FREE GRADING CREDIT ON SIGNUP + ABUSE PREVENTION
-- =====================================================

-- 1. Add signup credit tracking column
ALTER TABLE public.grading_credits 
ADD COLUMN IF NOT EXISTS signup_credit_claimed BOOLEAN DEFAULT FALSE;

-- 2. Create signup fingerprints table for abuse prevention
CREATE TABLE IF NOT EXISTS public.signup_fingerprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  device_fingerprint TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  blocked BOOLEAN DEFAULT FALSE,
  block_reason TEXT
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_signup_fingerprints_ip ON public.signup_fingerprints(ip_address);
CREATE INDEX IF NOT EXISTS idx_signup_fingerprints_device ON public.signup_fingerprints(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_signup_fingerprints_created ON public.signup_fingerprints(created_at);

-- Enable RLS
ALTER TABLE public.signup_fingerprints ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (admin only)
CREATE POLICY "Service role only" ON public.signup_fingerprints
  FOR ALL USING (false);

-- 3. Function to check signup rate limits
CREATE OR REPLACE FUNCTION public.check_signup_rate_limit(
  p_ip_address TEXT,
  p_device_fingerprint TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ip_count INTEGER;
  v_device_count INTEGER;
  v_is_blocked BOOLEAN;
  v_result JSONB;
BEGIN
  -- Check if IP or device is blocked
  SELECT EXISTS(
    SELECT 1 FROM signup_fingerprints 
    WHERE (ip_address = p_ip_address OR device_fingerprint = p_device_fingerprint)
    AND blocked = true
  ) INTO v_is_blocked;
  
  IF v_is_blocked THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'This device or network has been blocked due to suspicious activity'
    );
  END IF;
  
  -- Count signups from this IP in last 24 hours (max 3)
  SELECT COUNT(*) INTO v_ip_count
  FROM signup_fingerprints
  WHERE ip_address = p_ip_address
  AND created_at > now() - interval '24 hours';
  
  IF v_ip_count >= 3 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Too many accounts created from this network. Please try again later.'
    );
  END IF;
  
  -- Count signups from this device fingerprint in last 30 days (max 2)
  IF p_device_fingerprint IS NOT NULL THEN
    SELECT COUNT(*) INTO v_device_count
    FROM signup_fingerprints
    WHERE device_fingerprint = p_device_fingerprint
    AND created_at > now() - interval '30 days';
    
    IF v_device_count >= 2 THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'Too many accounts created from this device. Please contact support.'
      );
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'ip_count', v_ip_count,
    'device_count', COALESCE(v_device_count, 0)
  );
END;
$$;

-- 4. Function to record signup fingerprint
CREATE OR REPLACE FUNCTION public.record_signup_fingerprint(
  p_user_id UUID,
  p_ip_address TEXT,
  p_device_fingerprint TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO signup_fingerprints (user_id, ip_address, device_fingerprint)
  VALUES (p_user_id, p_ip_address, p_device_fingerprint);
END;
$$;

-- 5. Function to grant signup credit (called after profile completion)
CREATE OR REPLACE FUNCTION public.grant_signup_grading_credit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_phone BOOLEAN;
  v_has_national_id BOOLEAN;
  v_already_claimed BOOLEAN;
BEGIN
  -- Check if user has completed required verification
  SELECT 
    (phone IS NOT NULL AND phone != ''),
    (national_id IS NOT NULL AND national_id != '')
  INTO v_has_phone, v_has_national_id
  FROM profiles
  WHERE id = p_user_id;
  
  IF NOT v_has_phone OR NOT v_has_national_id THEN
    RETURN FALSE;
  END IF;
  
  -- Check if already claimed
  SELECT signup_credit_claimed INTO v_already_claimed
  FROM grading_credits
  WHERE user_id = p_user_id;
  
  IF v_already_claimed THEN
    RETURN FALSE;
  END IF;
  
  -- Grant credit
  INSERT INTO grading_credits (user_id, credits_remaining, signup_credit_claimed)
  VALUES (p_user_id, 1, true)
  ON CONFLICT (user_id) DO UPDATE SET
    credits_remaining = grading_credits.credits_remaining + 1,
    signup_credit_claimed = true
  WHERE grading_credits.signup_credit_claimed = false;
  
  -- Log the credit if it was actually granted
  IF FOUND THEN
    INSERT INTO grading_credit_history (user_id, credits_change, reason)
    VALUES (p_user_id, 1, 'Welcome bonus - 1 free AI grading for verified account');
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- 6. Check for duplicate national IDs (prevent multi-account abuse)
CREATE OR REPLACE FUNCTION public.check_national_id_unique()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_count INTEGER;
BEGIN
  -- Only check if national_id is being set/changed
  IF NEW.national_id IS NOT NULL AND NEW.national_id != '' THEN
    -- Check if this national ID is already used by another account
    SELECT COUNT(*) INTO v_existing_count
    FROM profiles
    WHERE national_id = NEW.national_id
    AND id != NEW.id;
    
    IF v_existing_count > 0 THEN
      RAISE EXCEPTION 'This national ID is already registered with another account';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for national ID uniqueness
DROP TRIGGER IF EXISTS check_national_id_before_update ON public.profiles;
CREATE TRIGGER check_national_id_before_update
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_national_id_unique();

-- 7. Auto-grant signup credit when profile is completed
CREATE OR REPLACE FUNCTION public.auto_grant_signup_credit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if phone and national_id were just completed
  IF (OLD.phone IS NULL OR OLD.phone = '') AND (NEW.phone IS NOT NULL AND NEW.phone != '') AND
     (NEW.national_id IS NOT NULL AND NEW.national_id != '') THEN
    PERFORM grant_signup_grading_credit(NEW.id);
  ELSIF (OLD.national_id IS NULL OR OLD.national_id = '') AND (NEW.national_id IS NOT NULL AND NEW.national_id != '') AND
        (NEW.phone IS NOT NULL AND NEW.phone != '') THEN
    PERFORM grant_signup_grading_credit(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-granting signup credit
DROP TRIGGER IF EXISTS auto_grant_signup_credit_on_profile_update ON public.profiles;
CREATE TRIGGER auto_grant_signup_credit_on_profile_update
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_grant_signup_credit();