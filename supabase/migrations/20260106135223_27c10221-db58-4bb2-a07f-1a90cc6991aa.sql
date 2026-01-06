-- Fix the trigger function to use correct enum value 'topup' instead of 'deposit'
CREATE OR REPLACE FUNCTION handle_first_deposit_premium()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this is a topup and amount >= 10
  IF NEW.type = 'topup' AND NEW.amount >= 10 THEN
    -- Check if user hasn't completed first deposit yet
    IF NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT user_id FROM wallets WHERE id = NEW.wallet_id)
      AND first_deposit_completed = true
    ) THEN
      -- Grant 7 days premium trial
      UPDATE profiles 
      SET 
        first_deposit_completed = true,
        first_deposit_at = now(),
        activation_unlocked = true,
        premium_trial_expires_at = now() + INTERVAL '7 days'
      WHERE id = (SELECT user_id FROM wallets WHERE id = NEW.wallet_id);
      
      -- Also create/update subscription
      INSERT INTO user_subscriptions (user_id, tier, started_at, expires_at, price_monthly, auto_renew)
      VALUES (
        (SELECT user_id FROM wallets WHERE id = NEW.wallet_id),
        'pro',
        now(),
        now() + INTERVAL '7 days',
        0,
        false
      )
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        tier = 'pro',
        started_at = now(),
        expires_at = now() + INTERVAL '7 days',
        price_monthly = 0;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;