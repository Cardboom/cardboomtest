-- Drop and recreate purchase_pro_pass function with correct transactions schema
CREATE OR REPLACE FUNCTION public.purchase_pro_pass(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_season_id uuid;
  v_pro_price numeric := 10.00;
  v_wallet_balance numeric;
  v_wallet_id uuid;
BEGIN
  -- Get active season
  SELECT id INTO v_season_id FROM public.cardboom_pass_seasons WHERE is_active = true LIMIT 1;
  
  IF v_season_id IS NULL THEN
    RAISE EXCEPTION 'No active season found';
  END IF;
  
  -- Check if already pro
  IF EXISTS (
    SELECT 1 FROM public.cardboom_pass_progress 
    WHERE user_id = p_user_id AND season_id = v_season_id AND is_pro = true
  ) THEN
    RETURN true; -- Already pro
  END IF;
  
  -- Get wallet balance and ID
  SELECT id, balance INTO v_wallet_id, v_wallet_balance 
  FROM public.wallets 
  WHERE user_id = p_user_id;
  
  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  
  IF v_wallet_balance < v_pro_price THEN
    RETURN false; -- Insufficient funds
  END IF;
  
  -- Deduct from wallet
  UPDATE public.wallets SET balance = balance - v_pro_price WHERE id = v_wallet_id;
  
  -- Record transaction (use wallet_id, not user_id)
  INSERT INTO public.transactions (wallet_id, amount, type, description)
  VALUES (v_wallet_id, -v_pro_price, 'withdrawal', 'CardBoom Pass Pro Upgrade');
  
  -- Update pass progress
  INSERT INTO public.cardboom_pass_progress (user_id, season_id, is_pro, pro_purchased_at)
  VALUES (p_user_id, v_season_id, true, now())
  ON CONFLICT (user_id, season_id) 
  DO UPDATE SET
    is_pro = true,
    pro_purchased_at = now(),
    updated_at = now();
  
  RETURN true;
END;
$$;