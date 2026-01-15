-- Table to track daily reel post rewards (one reward per user per day)
CREATE TABLE IF NOT EXISTS public.reel_daily_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reel_id UUID NOT NULL REFERENCES public.card_reels(id) ON DELETE CASCADE,
  reward_date DATE NOT NULL DEFAULT CURRENT_DATE,
  gems_awarded INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, reward_date)
);

-- Enable RLS
ALTER TABLE public.reel_daily_rewards ENABLE ROW LEVEL SECURITY;

-- Users can only read their own rewards
CREATE POLICY "Users can read their own reel rewards"
ON public.reel_daily_rewards FOR SELECT
USING (auth.uid() = user_id);

-- System can insert rewards (via trigger)
CREATE POLICY "System can insert reel rewards"
ON public.reel_daily_rewards FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Function to award daily reel gems
CREATE OR REPLACE FUNCTION public.award_daily_reel_gems(p_user_id UUID, p_reel_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already_claimed BOOLEAN;
  v_gems INTEGER := 50;
BEGIN
  -- Check if user already claimed today
  SELECT EXISTS(
    SELECT 1 FROM reel_daily_rewards 
    WHERE user_id = p_user_id AND reward_date = CURRENT_DATE
  ) INTO v_already_claimed;
  
  IF v_already_claimed THEN
    RETURN FALSE;
  END IF;
  
  -- Insert reward record
  INSERT INTO reel_daily_rewards (user_id, reel_id, gems_awarded)
  VALUES (p_user_id, p_reel_id, v_gems);
  
  -- Award gems to user's cardboom_points
  INSERT INTO cardboom_points (user_id, balance, total_earned)
  VALUES (p_user_id, v_gems, v_gems)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = cardboom_points.balance + v_gems,
    total_earned = cardboom_points.total_earned + v_gems,
    updated_at = now();
  
  -- Log the transaction
  INSERT INTO cardboom_points_history (user_id, amount, transaction_type, source, description, reference_id)
  VALUES (p_user_id, v_gems, 'earn', 'reel_daily_bonus', 'Daily Boom Reel reward', p_reel_id::text);
  
  RETURN TRUE;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.award_daily_reel_gems(UUID, UUID) TO authenticated;