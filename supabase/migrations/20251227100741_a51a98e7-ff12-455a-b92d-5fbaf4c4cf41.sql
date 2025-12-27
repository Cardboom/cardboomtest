-- Grading Credits System
CREATE TABLE public.grading_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  credits_remaining INTEGER NOT NULL DEFAULT 0,
  last_monthly_credit_at TIMESTAMP WITH TIME ZONE,
  first_deposit_credit_claimed BOOLEAN DEFAULT FALSE,
  first_subscribe_credit_claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_credits UNIQUE (user_id)
);

-- Credit history for audit trail
CREATE TABLE public.grading_credit_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  credits_change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Card Wars Polls
CREATE TABLE public.card_wars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_a_id UUID REFERENCES public.market_items(id),
  card_b_id UUID REFERENCES public.market_items(id),
  card_a_name TEXT NOT NULL,
  card_b_name TEXT NOT NULL,
  card_a_image TEXT,
  card_b_image TEXT,
  prize_pool NUMERIC NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'active',
  winner TEXT,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Card Wars Votes
CREATE TABLE public.card_war_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_war_id UUID NOT NULL REFERENCES public.card_wars(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vote_for TEXT NOT NULL CHECK (vote_for IN ('card_a', 'card_b')),
  is_pro_vote BOOLEAN DEFAULT FALSE,
  vote_value NUMERIC DEFAULT 2.5,
  payout_amount NUMERIC,
  payout_claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_vote UNIQUE (card_war_id, user_id)
);

-- Grade & Flip settings
ALTER TABLE public.grading_orders ADD COLUMN IF NOT EXISTS auto_list_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.grading_orders ADD COLUMN IF NOT EXISTS suggested_price NUMERIC;
ALTER TABLE public.grading_orders ADD COLUMN IF NOT EXISTS auto_list_price NUMERIC;
ALTER TABLE public.grading_orders ADD COLUMN IF NOT EXISTS listing_created_id UUID;

-- Enable RLS
ALTER TABLE public.grading_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_credit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_wars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_war_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for grading_credits
CREATE POLICY "Users can view own credits" ON public.grading_credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage credits" ON public.grading_credits
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for grading_credit_history
CREATE POLICY "Users can view own credit history" ON public.grading_credit_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert credit history" ON public.grading_credit_history
  FOR INSERT WITH CHECK (true);

-- RLS Policies for card_wars
CREATE POLICY "Anyone can view active card wars" ON public.card_wars
  FOR SELECT USING (status = 'active' OR status = 'completed');

CREATE POLICY "Admins can manage card wars" ON public.card_wars
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for card_war_votes
CREATE POLICY "Anyone can view votes" ON public.card_war_votes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote" ON public.card_war_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own votes" ON public.card_war_votes
  FOR SELECT USING (auth.uid() = user_id);

-- Function to grant monthly grading credit
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate card war payouts
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
$$ LANGUAGE plpgsql SECURITY DEFINER;