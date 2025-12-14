-- Create storage bucket for card images
INSERT INTO storage.buckets (id, name, public)
VALUES ('card-images', 'card-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for card-images bucket
CREATE POLICY "Anyone can view card images"
ON storage.objects FOR SELECT
USING (bucket_id = 'card-images');

CREATE POLICY "Service role can upload card images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'card-images');

-- Create table to cache eBay card data
CREATE TABLE public.ebay_card_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_name TEXT NOT NULL,
  set_name TEXT,
  card_number TEXT,
  search_query TEXT NOT NULL,
  avg_price NUMERIC,
  min_price NUMERIC,
  max_price NUMERIC,
  sold_avg_price NUMERIC,
  active_listings_count INTEGER DEFAULT 0,
  sold_listings_count INTEGER DEFAULT 0,
  liquidity TEXT DEFAULT 'low',
  image_url TEXT,
  cached_image_path TEXT,
  ebay_item_ids TEXT[],
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_ebay_card_cache_search ON public.ebay_card_cache(search_query);
CREATE INDEX idx_ebay_card_cache_card_name ON public.ebay_card_cache(card_name);

-- Enable RLS
ALTER TABLE public.ebay_card_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can view cached card data
CREATE POLICY "Anyone can view card cache"
ON public.ebay_card_cache FOR SELECT
USING (true);

-- System can manage cache
CREATE POLICY "System can insert card cache"
ON public.ebay_card_cache FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update card cache"
ON public.ebay_card_cache FOR UPDATE
USING (true);

-- Add function to update timestamps
CREATE TRIGGER update_ebay_card_cache_updated_at
BEFORE UPDATE ON public.ebay_card_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();