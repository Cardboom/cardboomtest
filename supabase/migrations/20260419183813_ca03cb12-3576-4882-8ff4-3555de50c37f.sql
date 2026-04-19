-- Add worker tracking columns to collectr_scrape_queue (idempotent)
ALTER TABLE public.collectr_scrape_queue
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cards_inserted integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS last_scraped_at timestamptz;

-- Index for fast worker pickup
CREATE INDEX IF NOT EXISTS idx_collectr_scrape_queue_worker
  ON public.collectr_scrape_queue (status, attempts, last_scraped_at NULLS FIRST);