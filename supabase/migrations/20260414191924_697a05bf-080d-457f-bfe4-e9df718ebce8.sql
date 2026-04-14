
CREATE TABLE public.collectr_scrape_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id TEXT NOT NULL,
  category_name TEXT NOT NULL,
  set_name TEXT NOT NULL,
  group_id TEXT NOT NULL,
  slug TEXT,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  card_count INTEGER DEFAULT 0,
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id)
);

ALTER TABLE public.collectr_scrape_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on collectr_scrape_queue"
  ON public.collectr_scrape_queue FOR SELECT
  USING (true);
