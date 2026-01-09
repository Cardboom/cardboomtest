-- Create content engine tracking table for keyword and vertical rotation
CREATE TABLE IF NOT EXISTS public.content_engine_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  published_date DATE NOT NULL DEFAULT CURRENT_DATE,
  primary_keyword TEXT NOT NULL,
  secondary_keywords TEXT[] DEFAULT '{}',
  game_vertical TEXT NOT NULL,
  article_slug TEXT NOT NULL,
  faq_schema JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_content_engine_published_date ON public.content_engine_log(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_content_engine_keyword ON public.content_engine_log(primary_keyword);
CREATE INDEX IF NOT EXISTS idx_content_engine_vertical ON public.content_engine_log(game_vertical);

-- Enable RLS
ALTER TABLE public.content_engine_log ENABLE ROW LEVEL SECURITY;

-- Allow public read access for content tracking
CREATE POLICY "Content engine log is publicly readable"
ON public.content_engine_log
FOR SELECT
USING (true);

-- Allow inserts without auth check for automated content engine
CREATE POLICY "Allow content engine inserts"
ON public.content_engine_log
FOR INSERT
WITH CHECK (true);