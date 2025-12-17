-- Add upvotes and language to discussions table
ALTER TABLE public.discussions 
ADD COLUMN IF NOT EXISTS upvotes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS language text DEFAULT 'en';

-- Create discussion_votes table for tracking who voted
CREATE TABLE IF NOT EXISTS public.discussion_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discussion_id uuid NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  vote_type text NOT NULL DEFAULT 'up',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(discussion_id, user_id)
);

-- Enable RLS
ALTER TABLE public.discussion_votes ENABLE ROW LEVEL SECURITY;

-- RLS policies for discussion_votes
CREATE POLICY "Anyone can view vote counts" ON public.discussion_votes
  FOR SELECT USING (true);

CREATE POLICY "Users can add their vote" ON public.discussion_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their vote" ON public.discussion_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update upvote count
CREATE OR REPLACE FUNCTION public.update_discussion_upvotes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.discussions 
    SET upvotes = upvotes + 1 
    WHERE id = NEW.discussion_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.discussions 
    SET upvotes = GREATEST(upvotes - 1, 0)
    WHERE id = OLD.discussion_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for upvote updates
DROP TRIGGER IF EXISTS on_discussion_vote_change ON public.discussion_votes;
CREATE TRIGGER on_discussion_vote_change
  AFTER INSERT OR DELETE ON public.discussion_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_discussion_upvotes();

-- Create index for efficient sorting
CREATE INDEX IF NOT EXISTS idx_discussions_upvotes ON public.discussions(upvotes DESC);
CREATE INDEX IF NOT EXISTS idx_discussions_language ON public.discussions(language);