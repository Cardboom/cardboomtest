-- Update earn_cardboom_points function to use "Gems" instead of "Points" in default description
CREATE OR REPLACE FUNCTION public.earn_cardboom_points(
  p_user_id UUID,
  p_transaction_amount NUMERIC,
  p_source TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
  v_earn_rate NUMERIC := 0.002; -- 0.2%
  v_points NUMERIC;
BEGIN
  v_points := p_transaction_amount * v_earn_rate;
  
  -- Upsert points balance
  INSERT INTO public.cardboom_points (user_id, balance, total_earned)
  VALUES (p_user_id, v_points, v_points)
  ON CONFLICT (user_id) 
  DO UPDATE SET
    balance = cardboom_points.balance + v_points,
    total_earned = cardboom_points.total_earned + v_points,
    updated_at = now();
  
  -- Record the transaction
  INSERT INTO public.cardboom_points_history (user_id, amount, transaction_type, source, reference_id, description)
  VALUES (p_user_id, v_points, 'earn', p_source, p_reference_id, COALESCE(p_description, 'Earned 0.2% Cardboom Gems'));
  
  RETURN v_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update spend_cardboom_points function to use "Gems" instead of "Points" in default description
CREATE OR REPLACE FUNCTION public.spend_cardboom_points(
  p_user_id UUID,
  p_amount NUMERIC,
  p_source TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance NUMERIC;
BEGIN
  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM public.cardboom_points
  WHERE user_id = p_user_id;
  
  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Update balance
  UPDATE public.cardboom_points
  SET balance = balance - p_amount,
      total_spent = total_spent + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Record the transaction
  INSERT INTO public.cardboom_points_history (user_id, amount, transaction_type, source, reference_id, description)
  VALUES (p_user_id, -p_amount, 'spend', p_source, p_reference_id, COALESCE(p_description, 'Spent Cardboom Gems'));
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;