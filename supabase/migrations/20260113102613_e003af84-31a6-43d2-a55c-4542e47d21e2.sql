-- Drop and recreate spend_cardboom_points to return JSONB
DROP FUNCTION IF EXISTS public.spend_cardboom_points(uuid, numeric, text, uuid, text);

CREATE OR REPLACE FUNCTION public.spend_cardboom_points(
  p_user_id UUID,
  p_amount NUMERIC,
  p_source TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_current_balance NUMERIC;
BEGIN
  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM public.cardboom_points
  WHERE user_id = p_user_id;
  
  -- Check if user has points record
  IF v_current_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No gems balance found. Earn gems through activities!');
  END IF;
  
  -- Check sufficient balance
  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', format('Insufficient gems. You have %s but need %s.', v_current_balance::int, p_amount::int));
  END IF;
  
  -- Update balance
  UPDATE public.cardboom_points
  SET balance = balance - p_amount,
      total_spent = total_spent + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Record the transaction
  INSERT INTO public.cardboom_points_history (user_id, amount, transaction_type, source, reference_id, description)
  VALUES (p_user_id, -p_amount, 'spend', p_source, p_reference_id, COALESCE(p_description, 'Spent CardBoom Gems'));
  
  RETURN jsonb_build_object('success', true, 'new_balance', v_current_balance - p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix notification type constraint to include all used types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'price_alert', 
  'new_offer', 
  'message', 
  'order_update', 
  'follower', 
  'review', 
  'referral',
  'grading_complete',
  'listing_created',
  'outbid',
  'auction_won',
  'storage_fee',
  'sale',
  'daily_xp',
  'donation_complete',
  'donation_refund',
  'vault_shipping_required',
  'gift'
));