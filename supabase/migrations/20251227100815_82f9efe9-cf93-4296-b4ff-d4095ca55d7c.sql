-- Fix function search paths for security
CREATE OR REPLACE FUNCTION public.check_and_grant_monthly_grading_credit()
RETURNS TRIGGER AS $$
DECLARE
  user_tier TEXT;
  months_since_last INTEGER;
  should_grant BOOLEAN := FALSE;
BEGIN
  -- Get user subscription tier
  SELECT tier INTO user_tier FROM public.user_subscriptions 
  WHERE user_id = NEW.user_id AND expires_at > now() 
  ORDER BY expires_at DESC LIMIT 1;
  
  -- Check if user qualifies for monthly credit
  IF user_tier = 'verified_seller' THEN
    -- Verified sellers get 1/month
    IF NEW.last_monthly_credit_at IS NULL OR 
       NEW.last_monthly_credit_at < now() - interval '1 month' THEN
      should_grant := TRUE;
    END IF;
  ELSIF user_tier = 'pro' THEN
    -- Pro users get 1/2 months
    IF NEW.last_monthly_credit_at IS NULL OR 
       NEW.last_monthly_credit_at < now() - interval '2 months' THEN
      should_grant := TRUE;
    END IF;
  END IF;
  
  IF should_grant THEN
    NEW.credits_remaining := NEW.credits_remaining + 1;
    NEW.last_monthly_credit_at := now();
    
    INSERT INTO public.grading_credit_history (user_id, credits_change, reason)
    VALUES (NEW.user_id, 1, 'Monthly subscription credit');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix card war payouts function search path
CREATE OR REPLACE FUNCTION public.calculate_card_war_payouts(war_id UUID)
RETURNS void AS $$
DECLARE
  winning_side TEXT;
  total_winner_votes NUMERIC;
  prize NUMERIC;
  vote_record RECORD;
BEGIN
  -- Get the winner and prize pool
  SELECT winner, prize_pool INTO winning_side, prize 
  FROM public.card_wars WHERE id = war_id;
  
  IF winning_side IS NULL THEN
    RETURN;
  END IF;
  
  -- Count total winning pro votes
  SELECT COALESCE(SUM(vote_value), 0) INTO total_winner_votes
  FROM public.card_war_votes 
  WHERE card_war_id = war_id AND vote_for = winning_side AND is_pro_vote = TRUE;
  
  -- Calculate and set payouts for each winning voter
  IF total_winner_votes > 0 THEN
    FOR vote_record IN 
      SELECT id, user_id, vote_value 
      FROM public.card_war_votes 
      WHERE card_war_id = war_id AND vote_for = winning_side AND is_pro_vote = TRUE
    LOOP
      UPDATE public.card_war_votes 
      SET payout_amount = (vote_record.vote_value / total_winner_votes) * prize
      WHERE id = vote_record.id;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;