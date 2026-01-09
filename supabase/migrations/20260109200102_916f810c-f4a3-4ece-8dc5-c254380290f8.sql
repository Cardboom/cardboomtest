-- Fix the claim_bounty_reward function to properly cast reference_id as UUID
CREATE OR REPLACE FUNCTION public.claim_bounty_reward(p_bounty_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_progress RECORD;
  v_bounty RECORD;
  v_gem_amount INTEGER;
  v_actual_user_id UUID;
BEGIN
  -- Use provided user_id or fall back to auth.uid()
  v_actual_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_actual_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Get bounty first to check claim limits
  SELECT * INTO v_bounty FROM bounties WHERE id = p_bounty_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bounty not found');
  END IF;
  
  -- Check if bounty has reached max claims (first-come-first-served)
  IF COALESCE(v_bounty.total_claimed, 0) >= COALESCE(v_bounty.max_claims, 1) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This challenge has already been claimed by another user');
  END IF;
  
  -- Get user progress
  SELECT * INTO v_progress
  FROM bounty_progress
  WHERE user_id = v_actual_user_id AND bounty_id = p_bounty_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Progress not found');
  END IF;
  
  IF NOT v_progress.is_completed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not completed yet');
  END IF;
  
  IF v_progress.reward_claimed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reward already claimed');
  END IF;
  
  v_gem_amount := v_bounty.reward_gems;
  
  -- Atomically increment total_claimed and check limit again
  UPDATE bounties 
  SET total_claimed = COALESCE(total_claimed, 0) + 1
  WHERE id = p_bounty_id 
  AND COALESCE(total_claimed, 0) < COALESCE(max_claims, 1);
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'This challenge has already been claimed by another user');
  END IF;
  
  -- Award gems
  INSERT INTO cardboom_points (user_id, balance, total_earned)
  VALUES (v_actual_user_id, v_gem_amount, v_gem_amount)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = cardboom_points.balance + v_gem_amount,
    total_earned = cardboom_points.total_earned + v_gem_amount,
    updated_at = now();
  
  -- Record history - p_bounty_id is already UUID, no cast needed
  INSERT INTO cardboom_points_history (user_id, amount, transaction_type, source, description, reference_id)
  VALUES (v_actual_user_id, v_gem_amount, 'earn', 'bounty', v_bounty.title, p_bounty_id);
  
  -- Mark as claimed
  UPDATE bounty_progress
  SET reward_claimed = true, reward_claimed_at = now()
  WHERE user_id = v_actual_user_id AND bounty_id = p_bounty_id;
  
  RETURN jsonb_build_object('success', true, 'gems_awarded', v_gem_amount);
END;
$$;