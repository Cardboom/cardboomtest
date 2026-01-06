-- Fix the award_points_on_transaction function to use correct enum value 'topup' instead of 'deposit'
CREATE OR REPLACE FUNCTION award_points_on_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Award points for topups
  IF NEW.type = 'topup' AND NEW.amount > 0 THEN
    PERFORM award_cardboom_points(
      (SELECT user_id FROM wallets WHERE id = NEW.wallet_id),
      NEW.amount,
      'top_up',
      NEW.id,
      'Points earned from wallet top-up'
    );
  END IF;
  
  RETURN NEW;
END;
$$;