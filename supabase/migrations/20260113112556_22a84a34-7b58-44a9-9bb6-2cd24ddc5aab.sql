-- Create a function to claim tier rewards and register them to the user
CREATE OR REPLACE FUNCTION claim_tier_reward(
  p_user_id UUID,
  p_tier_number INTEGER,
  p_is_pro_reward BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season_id UUID;
  v_progress_id UUID;
  v_current_tier INTEGER;
  v_is_pro BOOLEAN;
  v_claimed_tiers INTEGER[];
  v_reward_type TEXT;
  v_reward_value JSONB;
  v_result JSONB;
BEGIN
  -- Get active season
  SELECT id INTO v_season_id
  FROM cardboom_pass_seasons
  WHERE is_active = true
  LIMIT 1;
  
  IF v_season_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active season');
  END IF;
  
  -- Get user progress
  SELECT id, current_tier, is_pro, COALESCE(claimed_tiers, ARRAY[]::INTEGER[])
  INTO v_progress_id, v_current_tier, v_is_pro, v_claimed_tiers
  FROM cardboom_pass_progress
  WHERE user_id = p_user_id AND season_id = v_season_id;
  
  IF v_progress_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No progress found');
  END IF;
  
  -- Check if tier is unlocked
  IF p_tier_number > v_current_tier THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tier not unlocked yet');
  END IF;
  
  -- For pro rewards, check if user has pro pass
  IF p_is_pro_reward AND NOT v_is_pro THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pro pass required');
  END IF;
  
  -- Check if already claimed (use tier*10 + 1 for free, tier*10 + 2 for pro)
  DECLARE
    v_claim_key INTEGER := p_tier_number * 10 + (CASE WHEN p_is_pro_reward THEN 2 ELSE 1 END);
  BEGIN
    IF v_claim_key = ANY(v_claimed_tiers) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Already claimed');
    END IF;
    
    -- Get the reward
    IF p_is_pro_reward THEN
      SELECT pro_reward_type, pro_reward_value INTO v_reward_type, v_reward_value
      FROM cardboom_pass_tiers WHERE tier_number = p_tier_number;
    ELSE
      SELECT free_reward_type, free_reward_value INTO v_reward_type, v_reward_value
      FROM cardboom_pass_tiers WHERE tier_number = p_tier_number;
    END IF;
    
    IF v_reward_type IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'No reward for this tier');
    END IF;
    
    -- Process reward based on type
    CASE v_reward_type
      WHEN 'gems' THEN
        -- Award gems to user
        PERFORM earn_cardboom_points(p_user_id, (v_reward_value->>'amount')::INTEGER, 'pass_reward', 'Pass Tier ' || p_tier_number || ' Reward');
        v_result := jsonb_build_object('type', 'gems', 'amount', (v_reward_value->>'amount')::INTEGER);
        
      WHEN 'badge' THEN
        -- Insert badge into user_achievements or a badges table
        INSERT INTO user_achievements (user_id, achievement_id, earned_at)
        SELECT p_user_id, a.id, now()
        FROM achievements a
        WHERE a.key = v_reward_value->>'id'
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
        v_result := jsonb_build_object('type', 'badge', 'name', v_reward_value->>'name');
        
      WHEN 'cosmetic' THEN
        -- Unlock the cosmetic for the user (add to profile_background_unlocks or similar)
        INSERT INTO profile_background_unlocks (user_id, background_id)
        SELECT p_user_id, pb.id
        FROM profile_backgrounds pb
        WHERE pb.key = v_reward_value->>'id'
        ON CONFLICT (user_id, background_id) DO NOTHING;
        v_result := jsonb_build_object('type', 'cosmetic', 'cosmetic_type', v_reward_value->>'type', 'id', v_reward_value->>'id');
        
      WHEN 'discount_cap' THEN
        -- Store discount cap in user profile or separate table
        UPDATE profiles 
        SET checkout_discount_percent = GREATEST(COALESCE(checkout_discount_percent, 0), (v_reward_value->>'percent')::INTEGER)
        WHERE id = p_user_id;
        v_result := jsonb_build_object('type', 'discount_cap', 'percent', (v_reward_value->>'percent')::INTEGER);
        
      WHEN 'priority' THEN
        -- Set priority support expiry
        UPDATE profiles
        SET priority_support_until = GREATEST(COALESCE(priority_support_until, now()), now() + ((v_reward_value->>'days')::INTEGER || ' days')::INTERVAL)
        WHERE id = p_user_id;
        v_result := jsonb_build_object('type', 'priority', 'days', (v_reward_value->>'days')::INTEGER);
        
      ELSE
        v_result := jsonb_build_object('type', v_reward_type, 'value', v_reward_value);
    END CASE;
    
    -- Mark tier reward as claimed
    UPDATE cardboom_pass_progress
    SET claimed_tiers = array_append(COALESCE(claimed_tiers, ARRAY[]::INTEGER[]), v_claim_key),
        updated_at = now()
    WHERE id = v_progress_id;
    
    RETURN jsonb_build_object('success', true, 'reward', v_result);
  END;
END;
$$;

-- Add checkout_discount_percent and priority_support_until to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'checkout_discount_percent') THEN
    ALTER TABLE profiles ADD COLUMN checkout_discount_percent INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'priority_support_until') THEN
    ALTER TABLE profiles ADD COLUMN priority_support_until TIMESTAMPTZ;
  END IF;
END $$;