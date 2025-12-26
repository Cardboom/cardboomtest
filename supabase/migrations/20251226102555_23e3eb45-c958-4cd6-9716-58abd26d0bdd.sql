-- Add missing columns to card_reels
ALTER TABLE public.card_reels 
ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS save_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS watch_time_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_watch_time NUMERIC(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS completion_rate NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS trending_score NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS sound_name TEXT;

-- Create reel_watch_events table
CREATE TABLE IF NOT EXISTS public.reel_watch_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id UUID NOT NULL REFERENCES public.card_reels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'view_start', 'view_3s', 'view_10s', 'view_complete', 'like', 'comment', 'share', 'save', 'follow_creator')),
  watch_duration INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on reel_watch_events
ALTER TABLE public.reel_watch_events ENABLE ROW LEVEL SECURITY;

-- RLS policy for inserting events (anyone can insert their own events)
CREATE POLICY "Anyone can insert watch events"
ON public.reel_watch_events FOR INSERT
WITH CHECK (true);

-- RLS policy for reading (admins only, useful for analytics)
CREATE POLICY "Admins can read all watch events"
ON public.reel_watch_events FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create index on reel_watch_events
CREATE INDEX IF NOT EXISTS idx_reel_watch_events_reel_id ON public.reel_watch_events(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_watch_events_event_type ON public.reel_watch_events(event_type);
CREATE INDEX IF NOT EXISTS idx_reel_watch_events_created_at ON public.reel_watch_events(created_at);

-- Create trigger to update save_count when reel is saved/unsaved
CREATE OR REPLACE FUNCTION public.update_reel_save_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.card_reels SET save_count = save_count + 1 WHERE id = NEW.reel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.card_reels SET save_count = GREATEST(0, save_count - 1) WHERE id = OLD.reel_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS update_reel_save_count_trigger ON public.reel_saves;
CREATE TRIGGER update_reel_save_count_trigger
AFTER INSERT OR DELETE ON public.reel_saves
FOR EACH ROW EXECUTE FUNCTION public.update_reel_save_count();

-- Create function to increment share count
CREATE OR REPLACE FUNCTION public.increment_reel_shares(reel_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.card_reels SET share_count = share_count + 1 WHERE id = reel_uuid;
END;
$$;

-- Create function to calculate trending score (based on recency, engagement velocity)
CREATE OR REPLACE FUNCTION public.calculate_reel_trending_score(reel_uuid UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score NUMERIC := 0;
  v_reel RECORD;
  v_hours_old NUMERIC;
  v_recent_views INTEGER;
  v_recent_likes INTEGER;
BEGIN
  SELECT * INTO v_reel FROM public.card_reels WHERE id = reel_uuid;
  IF NOT FOUND THEN RETURN 0; END IF;
  
  -- Hours since creation (cap at 168 = 7 days)
  v_hours_old := LEAST(168, EXTRACT(EPOCH FROM (now() - v_reel.created_at)) / 3600);
  
  -- Recent engagement (last 24h from watch events)
  SELECT COUNT(*) INTO v_recent_views 
  FROM public.reel_watch_events 
  WHERE reel_id = reel_uuid 
    AND event_type IN ('view_start', 'view_3s')
    AND created_at > now() - INTERVAL '24 hours';
  
  SELECT COUNT(*) INTO v_recent_likes
  FROM public.reel_likes
  WHERE reel_id = reel_uuid
    AND created_at > now() - INTERVAL '24 hours';
  
  -- Score formula: (recent_views * 1 + recent_likes * 5 + total_likes * 0.5) / (hours_old + 2)^1.5
  v_score := (
    COALESCE(v_recent_views, 0) * 1 + 
    COALESCE(v_recent_likes, 0) * 5 + 
    v_reel.like_count * 0.5 +
    v_reel.comment_count * 3 +
    COALESCE(v_reel.share_count, 0) * 4
  ) / POWER(v_hours_old + 2, 1.5);
  
  -- Update the score
  UPDATE public.card_reels SET trending_score = v_score WHERE id = reel_uuid;
  
  RETURN v_score;
END;
$$;