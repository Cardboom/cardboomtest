-- Drop and recreate the add_pass_xp function
DROP FUNCTION IF EXISTS add_pass_xp(UUID, INTEGER, TEXT);

-- Recreate add_pass_xp function with proper tier progression logic
CREATE OR REPLACE FUNCTION add_pass_xp(p_user_id UUID, p_xp_amount INTEGER, p_source TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season_id UUID;
  v_current_xp INTEGER;
  v_current_tier INTEGER;
  v_new_xp INTEGER;
  v_new_tier INTEGER;
  v_tier_xp INTEGER;
  v_cumulative_xp INTEGER := 0;
BEGIN
  -- Get active season
  SELECT id INTO v_season_id
  FROM cardboom_pass_seasons
  WHERE is_active = true
  LIMIT 1;
  
  IF v_season_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Get or create user progress
  INSERT INTO cardboom_pass_progress (user_id, season_id, current_xp, current_tier)
  VALUES (p_user_id, v_season_id, 0, 0)
  ON CONFLICT (user_id, season_id) DO NOTHING;
  
  -- Get current progress
  SELECT current_xp, current_tier INTO v_current_xp, v_current_tier
  FROM cardboom_pass_progress
  WHERE user_id = p_user_id AND season_id = v_season_id;
  
  v_new_xp := v_current_xp + p_xp_amount;
  v_new_tier := v_current_tier;
  
  -- Calculate cumulative XP for current tier
  SELECT COALESCE(SUM(xp_required), 0) INTO v_cumulative_xp
  FROM cardboom_pass_tiers
  WHERE tier_number <= v_current_tier;
  
  -- Check if user levels up (can level up multiple times)
  LOOP
    -- Get XP needed for next tier
    SELECT xp_required INTO v_tier_xp
    FROM cardboom_pass_tiers
    WHERE tier_number = v_new_tier + 1;
    
    EXIT WHEN v_tier_xp IS NULL; -- Max tier reached
    
    -- Check if user has enough XP for next tier
    IF v_new_xp >= v_cumulative_xp + v_tier_xp THEN
      v_cumulative_xp := v_cumulative_xp + v_tier_xp;
      v_new_tier := v_new_tier + 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;
  
  -- Update progress
  UPDATE cardboom_pass_progress
  SET current_xp = v_new_xp,
      current_tier = v_new_tier,
      updated_at = now()
  WHERE user_id = p_user_id AND season_id = v_season_id;
END;
$$;