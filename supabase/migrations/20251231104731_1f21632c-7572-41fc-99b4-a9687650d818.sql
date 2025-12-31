
-- Create cardboom_points table to track user points balance
CREATE TABLE public.cardboom_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance NUMERIC NOT NULL DEFAULT 0,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  total_spent NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create points history table for tracking all point transactions
CREATE TABLE public.cardboom_points_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL, -- 'earn', 'spend', 'refund'
  source TEXT NOT NULL, -- 'card_war', 'top_up', 'purchase', 'order', etc.
  reference_id UUID, -- optional reference to the source transaction
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cardboom_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cardboom_points_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for cardboom_points
CREATE POLICY "Users can view own points"
  ON public.cardboom_points FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage points"
  ON public.cardboom_points FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS policies for cardboom_points_history
CREATE POLICY "Users can view own points history"
  ON public.cardboom_points_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert points history"
  ON public.cardboom_points_history FOR INSERT
  WITH CHECK (true);

-- Function to award points (0.2% of transaction amount)
CREATE OR REPLACE FUNCTION public.award_cardboom_points(
  p_user_id UUID,
  p_transaction_amount NUMERIC,
  p_source TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
  v_points NUMERIC;
BEGIN
  -- Calculate 0.2% of transaction amount
  v_points := ROUND(p_transaction_amount * 0.002, 2);
  
  -- Skip if points are 0 or negative
  IF v_points <= 0 THEN
    RETURN 0;
  END IF;
  
  -- Insert or update user's points balance
  INSERT INTO public.cardboom_points (user_id, balance, total_earned)
  VALUES (p_user_id, v_points, v_points)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = cardboom_points.balance + v_points,
      total_earned = cardboom_points.total_earned + v_points,
      updated_at = now();
  
  -- Record the transaction
  INSERT INTO public.cardboom_points_history (user_id, amount, transaction_type, source, reference_id, description)
  VALUES (p_user_id, v_points, 'earn', p_source, p_reference_id, COALESCE(p_description, 'Earned 0.2% Cardboom Points'));
  
  RETURN v_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to spend points
CREATE OR REPLACE FUNCTION public.spend_cardboom_points(
  p_user_id UUID,
  p_amount NUMERIC,
  p_source TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance NUMERIC;
BEGIN
  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM public.cardboom_points
  WHERE user_id = p_user_id;
  
  -- Check if user has enough points
  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct points
  UPDATE public.cardboom_points
  SET balance = balance - p_amount,
      total_spent = total_spent + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Record the transaction
  INSERT INTO public.cardboom_points_history (user_id, amount, transaction_type, source, reference_id, description)
  VALUES (p_user_id, -p_amount, 'spend', p_source, p_reference_id, COALESCE(p_description, 'Spent Cardboom Points'));
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to award points on wallet top-up
CREATE OR REPLACE FUNCTION public.award_points_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Award points for deposits (top-ups)
  IF NEW.type = 'deposit' AND NEW.amount > 0 THEN
    PERFORM award_cardboom_points(
      (SELECT user_id FROM wallets WHERE id = NEW.wallet_id),
      NEW.amount,
      'top_up',
      NEW.id,
      'Points earned from wallet top-up'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_award_points_on_transaction
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.award_points_on_transaction();

-- Trigger to award points on card war pro votes
CREATE OR REPLACE FUNCTION public.award_points_on_card_war_vote()
RETURNS TRIGGER AS $$
BEGIN
  -- Award points for pro votes (paid votes)
  IF NEW.is_pro_vote = true AND NEW.vote_value > 0 THEN
    PERFORM award_cardboom_points(
      NEW.user_id,
      NEW.vote_value,
      'card_war',
      NEW.id,
      'Points earned from Card War vote'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_award_points_on_card_war_vote
  AFTER INSERT ON public.card_war_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.award_points_on_card_war_vote();

-- Trigger to award points on completed orders (purchases)
CREATE OR REPLACE FUNCTION public.award_points_on_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Award points when order is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Award to buyer
    PERFORM award_cardboom_points(
      NEW.buyer_id,
      NEW.total_amount,
      'purchase',
      NEW.id,
      'Points earned from purchase'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_award_points_on_order
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.award_points_on_order();

-- Create updated_at trigger
CREATE TRIGGER update_cardboom_points_updated_at
  BEFORE UPDATE ON public.cardboom_points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
