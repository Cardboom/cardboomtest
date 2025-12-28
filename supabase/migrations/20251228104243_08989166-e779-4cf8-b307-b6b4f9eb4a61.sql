-- Community Card Votes (Daily polls for XP - separate from paid Card Wars)
CREATE TABLE public.community_card_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_a_id UUID REFERENCES public.market_items(id),
  card_b_id UUID REFERENCES public.market_items(id),
  card_a_name TEXT NOT NULL,
  card_b_name TEXT NOT NULL,
  card_a_image TEXT,
  card_b_image TEXT,
  card_a_votes INTEGER DEFAULT 0,
  card_b_votes INTEGER DEFAULT 0,
  card_a_weighted_votes NUMERIC DEFAULT 0,
  card_b_weighted_votes NUMERIC DEFAULT 0,
  xp_reward INTEGER DEFAULT 20,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  winner TEXT CHECK (winner IN ('card_a', 'card_b')),
  vote_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ends_at TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 day'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- User votes on community polls
CREATE TABLE public.community_vote_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.community_card_votes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  vote_for TEXT NOT NULL CHECK (vote_for IN ('card_a', 'card_b')),
  vote_weight NUMERIC DEFAULT 1,
  is_pro_vote BOOLEAN DEFAULT FALSE,
  xp_claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Enable RLS
ALTER TABLE public.community_card_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_vote_entries ENABLE ROW LEVEL SECURITY;

-- Everyone can view polls
CREATE POLICY "Anyone can view community polls" 
ON public.community_card_votes FOR SELECT USING (true);

-- Only admins can create/update polls
CREATE POLICY "Admins can manage community polls" 
ON public.community_card_votes FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Users can view all vote entries
CREATE POLICY "Anyone can view vote entries" 
ON public.community_vote_entries FOR SELECT USING (true);

-- Users can insert their own votes
CREATE POLICY "Users can vote" 
ON public.community_vote_entries FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own entries (for XP claim)
CREATE POLICY "Users can update own votes" 
ON public.community_vote_entries FOR UPDATE 
USING (auth.uid() = user_id);

-- Function to update vote counts
CREATE OR REPLACE FUNCTION public.update_community_vote_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_for = 'card_a' THEN
      UPDATE community_card_votes 
      SET card_a_votes = card_a_votes + 1,
          card_a_weighted_votes = card_a_weighted_votes + NEW.vote_weight
      WHERE id = NEW.poll_id;
    ELSE
      UPDATE community_card_votes 
      SET card_b_votes = card_b_votes + 1,
          card_b_weighted_votes = card_b_weighted_votes + NEW.vote_weight
      WHERE id = NEW.poll_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for vote counts
CREATE TRIGGER update_community_votes_trigger
AFTER INSERT ON public.community_vote_entries
FOR EACH ROW EXECUTE FUNCTION public.update_community_vote_counts();

-- Function to finalize daily polls and determine winner
CREATE OR REPLACE FUNCTION public.finalize_community_poll(poll_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_poll RECORD;
  v_winner TEXT;
BEGIN
  SELECT * INTO v_poll FROM community_card_votes WHERE id = poll_uuid;
  
  IF v_poll.status = 'completed' THEN
    RETURN;
  END IF;
  
  -- Determine winner by weighted votes (Pro votes count more)
  IF v_poll.card_a_weighted_votes > v_poll.card_b_weighted_votes THEN
    v_winner := 'card_a';
  ELSIF v_poll.card_b_weighted_votes > v_poll.card_a_weighted_votes THEN
    v_winner := 'card_b';
  ELSE
    -- Tie: use raw vote count
    v_winner := CASE WHEN v_poll.card_a_votes >= v_poll.card_b_votes THEN 'card_a' ELSE 'card_b' END;
  END IF;
  
  UPDATE community_card_votes 
  SET status = 'completed', winner = v_winner 
  WHERE id = poll_uuid;
END;
$$;