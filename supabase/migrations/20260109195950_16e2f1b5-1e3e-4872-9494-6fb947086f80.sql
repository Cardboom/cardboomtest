-- Update the payout schedule function to include admins for same-day payouts
CREATE OR REPLACE FUNCTION calculate_payout_schedule(p_user_id UUID)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_is_priority BOOLEAN;
  v_scheduled_at TIMESTAMPTZ;
BEGIN
  -- Check if user has enterprise subscription OR is admin
  SELECT EXISTS (
    SELECT 1 FROM user_subscriptions 
    WHERE user_id = p_user_id 
    AND tier = 'enterprise'
    AND (expires_at IS NULL OR expires_at > NOW())
  ) OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id
    AND role = 'admin'
  ) INTO v_is_priority;
  
  IF v_is_priority THEN
    -- Same day for enterprise users and admins (immediate)
    v_scheduled_at := NOW();
  ELSE
    -- 2 days for regular users
    v_scheduled_at := date_trunc('day', NOW()) + interval '2 days';
  END IF;
  
  RETURN v_scheduled_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update the trigger function as well
CREATE OR REPLACE FUNCTION set_payout_schedule_on_approve()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    NEW.scheduled_payout_at := calculate_payout_schedule(NEW.user_id);
    NEW.is_enterprise_user := EXISTS (
      SELECT 1 FROM user_subscriptions 
      WHERE user_id = NEW.user_id 
      AND tier = 'enterprise'
      AND (expires_at IS NULL OR expires_at > NOW())
    ) OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = NEW.user_id
      AND role = 'admin'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;