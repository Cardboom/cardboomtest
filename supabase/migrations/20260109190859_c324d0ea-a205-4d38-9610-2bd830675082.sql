-- Add global claim tracking to bounties
ALTER TABLE public.bounties 
ADD COLUMN IF NOT EXISTS max_claims INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_claimed INTEGER DEFAULT 0;

-- Fix the update_bounty_progress function to properly mark completion
CREATE OR REPLACE FUNCTION public.update_bounty_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_bounty RECORD;
  v_progress RECORD;
  v_user_id UUID;
  v_referrer_id UUID;
  v_count INTEGER;
BEGIN
  -- Handle grading orders
  IF TG_TABLE_NAME = 'grading_orders' AND NEW.status = 'completed' THEN
    v_user_id := NEW.user_id;
    
    -- Update direct grading bounties
    FOR v_bounty IN 
      SELECT * FROM bounties 
      WHERE is_active = true 
      AND bounty_type = 'grading_count'
      AND now() BETWEEN starts_at AND ends_at
    LOOP
      -- Count user's gradings in period
      SELECT COUNT(*) INTO v_count
      FROM grading_orders
      WHERE user_id = v_user_id
      AND status = 'completed'
      AND completed_at >= v_bounty.starts_at
      AND completed_at <= v_bounty.ends_at;
      
      -- Upsert progress
      INSERT INTO bounty_progress (user_id, bounty_id, current_count, is_completed, completed_at)
      VALUES (
        v_user_id, 
        v_bounty.id, 
        v_count,
        v_count >= v_bounty.target_count,
        CASE WHEN v_count >= v_bounty.target_count THEN now() ELSE NULL END
      )
      ON CONFLICT (user_id, bounty_id) 
      DO UPDATE SET 
        current_count = v_count,
        is_completed = v_count >= v_bounty.target_count,
        completed_at = CASE 
          WHEN v_count >= v_bounty.target_count AND bounty_progress.completed_at IS NULL 
          THEN now() 
          ELSE bounty_progress.completed_at 
        END,
        updated_at = now();
    END LOOP;
    
    -- Handle referral grading bounties
    SELECT referred_by INTO v_referrer_id FROM profiles WHERE id = v_user_id;
    
    IF v_referrer_id IS NOT NULL THEN
      FOR v_bounty IN 
        SELECT * FROM bounties 
        WHERE is_active = true 
        AND bounty_type = 'referral_grading'
        AND now() BETWEEN starts_at AND ends_at
      LOOP
        SELECT COUNT(DISTINCT go.user_id) INTO v_count
        FROM grading_orders go
        JOIN profiles p ON p.id = go.user_id
        WHERE p.referred_by = v_referrer_id
        AND go.status = 'completed'
        AND go.completed_at >= v_bounty.starts_at
        AND go.completed_at <= v_bounty.ends_at;
        
        INSERT INTO bounty_progress (user_id, bounty_id, current_count, is_completed, completed_at)
        VALUES (
          v_referrer_id, 
          v_bounty.id, 
          v_count,
          v_count >= v_bounty.target_count,
          CASE WHEN v_count >= v_bounty.target_count THEN now() ELSE NULL END
        )
        ON CONFLICT (user_id, bounty_id) 
        DO UPDATE SET 
          current_count = v_count,
          is_completed = v_count >= v_bounty.target_count,
          completed_at = CASE 
            WHEN v_count >= v_bounty.target_count AND bounty_progress.completed_at IS NULL 
            THEN now() 
            ELSE bounty_progress.completed_at 
          END,
          updated_at = now();
      END LOOP;
    END IF;
  END IF;

  -- Handle orders for sale bounties
  IF TG_TABLE_NAME = 'orders' AND NEW.status = 'completed' THEN
    FOR v_bounty IN 
      SELECT * FROM bounties 
      WHERE is_active = true 
      AND bounty_type = 'sale_count'
      AND now() BETWEEN starts_at AND ends_at
    LOOP
      SELECT COUNT(*) INTO v_count
      FROM orders o
      JOIN listings l ON l.id = o.listing_id
      WHERE l.seller_id = NEW.seller_id
      AND o.status = 'completed'
      AND o.completed_at >= v_bounty.starts_at
      AND o.completed_at <= v_bounty.ends_at;
      
      INSERT INTO bounty_progress (user_id, bounty_id, current_count, is_completed, completed_at)
      VALUES (
        NEW.seller_id, 
        v_bounty.id, 
        v_count,
        v_count >= v_bounty.target_count,
        CASE WHEN v_count >= v_bounty.target_count THEN now() ELSE NULL END
      )
      ON CONFLICT (user_id, bounty_id) 
      DO UPDATE SET 
        current_count = v_count,
        is_completed = v_count >= v_bounty.target_count,
        completed_at = CASE 
          WHEN v_count >= v_bounty.target_count AND bounty_progress.completed_at IS NULL 
          THEN now() 
          ELSE bounty_progress.completed_at 
        END,
        updated_at = now();
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update claim_bounty_reward to enforce first-come-first-served
CREATE OR REPLACE FUNCTION public.claim_bounty_reward(p_bounty_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_progress RECORD;
  v_bounty RECORD;
  v_gem_amount INTEGER;
  v_current_claims INTEGER;
BEGIN
  -- Get bounty first to check claim limits
  SELECT * INTO v_bounty FROM bounties WHERE id = p_bounty_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bounty not found');
  END IF;
  
  -- Check if bounty has reached max claims (first-come-first-served)
  IF v_bounty.total_claimed >= COALESCE(v_bounty.max_claims, 1) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This challenge has already been claimed by another user');
  END IF;
  
  -- Get user progress
  SELECT * INTO v_progress
  FROM bounty_progress
  WHERE user_id = auth.uid() AND bounty_id = p_bounty_id;
  
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
  VALUES (auth.uid(), v_gem_amount, v_gem_amount)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = cardboom_points.balance + v_gem_amount,
    total_earned = cardboom_points.total_earned + v_gem_amount,
    updated_at = now();
  
  -- Record history
  INSERT INTO cardboom_points_history (user_id, amount, transaction_type, source, description, reference_id)
  VALUES (auth.uid(), v_gem_amount, 'earn', 'bounty', v_bounty.title, p_bounty_id::text);
  
  -- Mark as claimed
  UPDATE bounty_progress
  SET reward_claimed = true, reward_claimed_at = now()
  WHERE user_id = auth.uid() AND bounty_id = p_bounty_id;
  
  RETURN jsonb_build_object('success', true, 'gems_awarded', v_gem_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix existing progress records that should be marked complete
UPDATE bounty_progress bp
SET is_completed = true,
    completed_at = COALESCE(completed_at, now())
FROM bounties b
WHERE bp.bounty_id = b.id
AND bp.current_count >= b.target_count
AND bp.is_completed = false;