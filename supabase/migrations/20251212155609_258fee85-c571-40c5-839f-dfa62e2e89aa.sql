-- Create comments table for listings
CREATE TABLE public.listing_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.listing_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can view comments
CREATE POLICY "Anyone can view comments"
ON public.listing_comments FOR SELECT
USING (true);

-- Users can create comments
CREATE POLICY "Users can create comments"
ON public.listing_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
ON public.listing_comments FOR DELETE
USING (auth.uid() = user_id);

-- Create price prediction votes table
CREATE TABLE public.price_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(listing_id, user_id)
);

-- Enable RLS
ALTER TABLE public.price_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can view votes
CREATE POLICY "Anyone can view votes"
ON public.price_votes FOR SELECT
USING (true);

-- Users can create/update their vote
CREATE POLICY "Users can vote"
ON public.price_votes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their vote
CREATE POLICY "Users can update vote"
ON public.price_votes FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their vote
CREATE POLICY "Users can delete vote"
ON public.price_votes FOR DELETE
USING (auth.uid() = user_id);