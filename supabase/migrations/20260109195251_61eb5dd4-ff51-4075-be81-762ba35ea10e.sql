-- Add columns for scheduled payout processing
ALTER TABLE public.withdrawal_requests 
ADD COLUMN IF NOT EXISTS scheduled_payout_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payout_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS payout_error TEXT,
ADD COLUMN IF NOT EXISTS is_enterprise_user BOOLEAN DEFAULT FALSE;

-- Create function to calculate scheduled payout date based on user tier
CREATE OR REPLACE FUNCTION calculate_payout_schedule(p_user_id UUID)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_is_enterprise BOOLEAN;
  v_scheduled_at TIMESTAMPTZ;
BEGIN
  -- Check if user has enterprise subscription
  SELECT EXISTS (
    SELECT 1 FROM user_subscriptions 
    WHERE user_id = p_user_id 
    AND tier = 'enterprise'
    AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO v_is_enterprise;
  
  IF v_is_enterprise THEN
    -- Same day for enterprise users (end of day)
    v_scheduled_at := date_trunc('day', NOW()) + interval '23 hours 59 minutes';
  ELSE
    -- 2 days for regular users
    v_scheduled_at := date_trunc('day', NOW()) + interval '2 days';
  END IF;
  
  RETURN v_scheduled_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-set scheduled payout when withdrawal is approved
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
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_set_payout_schedule ON withdrawal_requests;
CREATE TRIGGER trigger_set_payout_schedule
  BEFORE UPDATE ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_payout_schedule_on_approve();

-- Create index for efficient payout processing
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_payout_schedule 
ON withdrawal_requests(scheduled_payout_at) 
WHERE status = 'approved' AND scheduled_payout_at IS NOT NULL;