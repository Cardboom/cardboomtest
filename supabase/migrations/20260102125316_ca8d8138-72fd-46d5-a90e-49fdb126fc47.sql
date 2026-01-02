-- Create cardboom_news table for storing AI-generated news articles
CREATE TABLE public.cardboom_news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  summary TEXT,
  source_url TEXT,
  source_name TEXT,
  image_url TEXT,
  category TEXT DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cardboom_news ENABLE ROW LEVEL SECURITY;

-- Allow public read access to published news
CREATE POLICY "Anyone can read published news" 
ON public.cardboom_news 
FOR SELECT 
USING (is_published = true);

-- Create index for faster queries
CREATE INDEX idx_cardboom_news_created_at ON public.cardboom_news(created_at DESC);
CREATE INDEX idx_cardboom_news_category ON public.cardboom_news(category);
CREATE INDEX idx_cardboom_news_slug ON public.cardboom_news(slug);

-- Enable realtime for news updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.cardboom_news;