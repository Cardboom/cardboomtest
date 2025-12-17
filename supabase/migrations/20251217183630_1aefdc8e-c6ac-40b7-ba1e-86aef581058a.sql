-- Create enum for discussion types
CREATE TYPE discussion_type AS ENUM ('card', 'event', 'strategy');

-- Create enum for reaction types (no upvotes/downvotes)
CREATE TYPE discussion_reaction_type AS ENUM ('insightful', 'outdated', 'contradicted');

-- Discussions table (threads)
CREATE TABLE public.discussions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type discussion_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  market_item_id UUID REFERENCES public.market_items(id) ON DELETE CASCADE,
  event_type TEXT, -- 'price_spike', 'price_drop', 'volume_spike', 'liquidity_change'
  price_at_creation NUMERIC,
  is_admin_created BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  comment_count INTEGER DEFAULT 0,
  sentiment_score NUMERIC DEFAULT 0, -- -1 to 1 scale
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Discussion comments
CREATE TABLE public.discussion_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  parent_id UUID REFERENCES public.discussion_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  stance TEXT, -- 'buy', 'hold', 'sell' for card discussions
  is_collapsed BOOLEAN DEFAULT false,
  collapse_reason TEXT, -- 'contradicted_by_market', 'low_quality', 'spam'
  accuracy_score NUMERIC, -- calculated based on market outcomes
  relevance_score NUMERIC DEFAULT 0, -- for sorting
  insightful_count INTEGER DEFAULT 0,
  outdated_count INTEGER DEFAULT 0,
  contradicted_count INTEGER DEFAULT 0,
  price_at_post NUMERIC, -- snapshot price when posted
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Comment reactions (insightful, outdated, contradicted)
CREATE TABLE public.discussion_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.discussion_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type discussion_reaction_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for discussions
CREATE POLICY "Anyone can view active discussions"
  ON public.discussions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can create strategy discussions"
  ON public.discussions FOR INSERT
  WITH CHECK (
    (type != 'strategy') OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "System can create event discussions"
  ON public.discussions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update discussions"
  ON public.discussions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for comments
CREATE POLICY "Anyone can view non-collapsed comments"
  ON public.discussion_comments FOR SELECT
  USING (true);

CREATE POLICY "Eligible users can post comments"
  ON public.discussion_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    LENGTH(content) > 10 AND
    (
      -- Check user eligibility: account age > 7 days OR has activity
      EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND (
          p.created_at < now() - interval '7 days'
          OR p.reputation_score > 0
          OR EXISTS (SELECT 1 FROM orders WHERE buyer_id = auth.uid() OR seller_id = auth.uid())
          OR EXISTS (SELECT 1 FROM listings WHERE seller_id = auth.uid())
          OR EXISTS (SELECT 1 FROM portfolio_items WHERE user_id = auth.uid())
        )
      )
    )
  );

CREATE POLICY "Users can update own comments"
  ON public.discussion_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.discussion_comments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for reactions
CREATE POLICY "Anyone can view reactions"
  ON public.discussion_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can add reactions"
  ON public.discussion_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions"
  ON public.discussion_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update comment counts and sentiment
CREATE OR REPLACE FUNCTION public.update_discussion_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE discussions 
    SET comment_count = comment_count + 1,
        updated_at = now()
    WHERE id = NEW.discussion_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE discussions 
    SET comment_count = comment_count - 1,
        updated_at = now()
    WHERE id = OLD.discussion_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_discussion_stats_trigger
  AFTER INSERT OR DELETE ON discussion_comments
  FOR EACH ROW EXECUTE FUNCTION update_discussion_stats();

-- Function to update reaction counts
CREATE OR REPLACE FUNCTION public.update_reaction_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.reaction_type = 'insightful' THEN
      UPDATE discussion_comments SET insightful_count = insightful_count + 1 WHERE id = NEW.comment_id;
    ELSIF NEW.reaction_type = 'outdated' THEN
      UPDATE discussion_comments SET outdated_count = outdated_count + 1 WHERE id = NEW.comment_id;
    ELSIF NEW.reaction_type = 'contradicted' THEN
      UPDATE discussion_comments SET contradicted_count = contradicted_count + 1 WHERE id = NEW.comment_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.reaction_type = 'insightful' THEN
      UPDATE discussion_comments SET insightful_count = insightful_count - 1 WHERE id = OLD.comment_id;
    ELSIF OLD.reaction_type = 'outdated' THEN
      UPDATE discussion_comments SET outdated_count = outdated_count - 1 WHERE id = OLD.comment_id;
    ELSIF OLD.reaction_type = 'contradicted' THEN
      UPDATE discussion_comments SET contradicted_count = contradicted_count - 1 WHERE id = OLD.comment_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_reaction_counts_trigger
  AFTER INSERT OR DELETE ON discussion_reactions
  FOR EACH ROW EXECUTE FUNCTION update_reaction_counts();

-- Index for faster queries
CREATE INDEX idx_discussions_market_item ON discussions(market_item_id);
CREATE INDEX idx_discussions_type ON discussions(type);
CREATE INDEX idx_comments_discussion ON discussion_comments(discussion_id);
CREATE INDEX idx_comments_relevance ON discussion_comments(relevance_score DESC);
CREATE INDEX idx_reactions_comment ON discussion_reactions(comment_id);