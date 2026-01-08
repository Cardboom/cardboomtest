-- Update donate_for_grading function to check if goal is reached and auto-award credit
CREATE OR REPLACE FUNCTION public.donate_for_grading(
  p_target_type text,
  p_target_id uuid,
  p_amount_cents integer,
  p_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_donor_id uuid;
  v_owner_id uuid;
  v_wallet_id uuid;
  v_wallet_balance numeric;
  v_donation_id uuid;
  v_goal_cents integer;
  v_current_total integer;
  v_new_total integer;
  v_goal_reached boolean := false;
BEGIN
  -- Get current user
  v_donor_id := auth.uid();
  IF v_donor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get owner and goal based on target type
  IF p_target_type = 'card_instance' THEN
    SELECT owner_user_id, donation_goal_cents INTO v_owner_id, v_goal_cents 
    FROM card_instances WHERE id = p_target_id AND accepts_grading_donations = true;
  ELSIF p_target_type = 'listing' THEN
    SELECT seller_id, donation_goal_cents INTO v_owner_id, v_goal_cents 
    FROM listings WHERE id = p_target_id AND accepts_grading_donations = true;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid target type');
  END IF;

  IF v_owner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Card not accepting donations');
  END IF;

  -- Cannot donate to own card
  IF v_donor_id = v_owner_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot donate to your own card');
  END IF;

  -- Check donor wallet balance
  SELECT id, balance INTO v_wallet_id, v_wallet_balance
  FROM wallets WHERE user_id = v_donor_id;

  IF v_wallet_balance IS NULL OR v_wallet_balance < (p_amount_cents / 100.0) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient wallet balance');
  END IF;

  -- Get current donation total for this target
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_current_total
  FROM grading_donations
  WHERE (card_instance_id = p_target_id OR listing_id = p_target_id)
    AND status = 'pending';

  v_new_total := v_current_total + p_amount_cents;

  -- Deduct from donor wallet
  UPDATE wallets SET balance = balance - (p_amount_cents / 100.0), updated_at = now()
  WHERE id = v_wallet_id;

  -- Record transaction
  INSERT INTO wallet_transactions (wallet_id, amount, type, description)
  VALUES (v_wallet_id, -(p_amount_cents / 100.0), 'grading_donation', 'Grading donation for card');

  -- Create donation record
  INSERT INTO grading_donations (
    card_instance_id,
    listing_id,
    owner_user_id,
    donor_user_id,
    amount_cents,
    message
  ) VALUES (
    CASE WHEN p_target_type = 'card_instance' THEN p_target_id ELSE NULL END,
    CASE WHEN p_target_type = 'listing' THEN p_target_id ELSE NULL END,
    v_owner_id,
    v_donor_id,
    p_amount_cents,
    p_message
  ) RETURNING id INTO v_donation_id;

  -- Check if goal is now reached
  IF v_new_total >= COALESCE(v_goal_cents, 2000) THEN
    v_goal_reached := true;
    
    -- Mark all pending donations as applied
    UPDATE grading_donations
    SET status = 'applied', applied_at = now()
    WHERE (card_instance_id = p_target_id OR listing_id = p_target_id)
      AND status = 'pending';

    -- Create a free grading credit for the owner (for THIS specific listing only)
    INSERT INTO grading_credits (
      user_id,
      gifted_by,
      speed_tier,
      listing_id,
      card_instance_id,
      card_title,
      is_used
    ) VALUES (
      v_owner_id,
      NULL, -- community donation, no single gifter
      'standard',
      CASE WHEN p_target_type = 'listing' THEN p_target_id ELSE NULL END,
      CASE WHEN p_target_type = 'card_instance' THEN p_target_id ELSE NULL END,
      'Community Grading Gift',
      false
    );

    -- Disable further donations for this target
    IF p_target_type = 'card_instance' THEN
      UPDATE card_instances SET accepts_grading_donations = false WHERE id = p_target_id;
    ELSIF p_target_type = 'listing' THEN
      UPDATE listings SET accepts_grading_donations = false WHERE id = p_target_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'donation_id', v_donation_id,
    'goal_reached', v_goal_reached,
    'new_total', v_new_total,
    'goal', COALESCE(v_goal_cents, 2000)
  );
END;
$$;

-- Function to refund donations when listing is delisted
CREATE OR REPLACE FUNCTION public.refund_grading_donations(
  p_target_type text,
  p_target_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_owner_id uuid;
  v_donation RECORD;
  v_refunded_count integer := 0;
  v_total_refunded integer := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get owner to verify permission
  IF p_target_type = 'card_instance' THEN
    SELECT owner_user_id INTO v_owner_id FROM card_instances WHERE id = p_target_id;
  ELSIF p_target_type = 'listing' THEN
    SELECT seller_id INTO v_owner_id FROM listings WHERE id = p_target_id;
  END IF;

  IF v_owner_id IS NULL OR v_owner_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Refund each pending donation
  FOR v_donation IN 
    SELECT id, donor_user_id, amount_cents
    FROM grading_donations
    WHERE (card_instance_id = p_target_id OR listing_id = p_target_id)
      AND status = 'pending'
  LOOP
    -- Credit back to donor wallet
    UPDATE wallets 
    SET balance = balance + (v_donation.amount_cents / 100.0), updated_at = now()
    WHERE user_id = v_donation.donor_user_id;

    -- Record refund transaction
    INSERT INTO wallet_transactions (wallet_id, amount, type, description)
    SELECT id, (v_donation.amount_cents / 100.0), 'grading_donation_refund', 'Refund: listing delisted'
    FROM wallets WHERE user_id = v_donation.donor_user_id;

    -- Mark donation as refunded
    UPDATE grading_donations SET status = 'refunded' WHERE id = v_donation.id;

    v_refunded_count := v_refunded_count + 1;
    v_total_refunded := v_total_refunded + v_donation.amount_cents;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true, 
    'refunded_count', v_refunded_count,
    'total_refunded_cents', v_total_refunded
  );
END;
$$;