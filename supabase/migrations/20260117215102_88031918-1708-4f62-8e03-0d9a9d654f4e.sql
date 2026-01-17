-- ================================================
-- GLOBAL IMAGE NORMALIZATION SYSTEM
-- ================================================

-- Create enum types for image normalization
CREATE TYPE public.normalized_image_type AS ENUM ('SLAB', 'RAW');
CREATE TYPE public.normalization_status AS ENUM ('PENDING', 'DONE', 'FAILED');

-- Add normalization fields to market_items (canonical catalog)
ALTER TABLE public.market_items 
  ADD COLUMN normalized_image_url TEXT,
  ADD COLUMN normalized_image_type public.normalized_image_type,
  ADD COLUMN normalization_status public.normalization_status DEFAULT 'PENDING',
  ADD COLUMN normalization_error TEXT;

-- Add normalization fields to catalog_cards
ALTER TABLE public.catalog_cards 
  ADD COLUMN normalized_image_url TEXT,
  ADD COLUMN normalized_image_type public.normalized_image_type,
  ADD COLUMN normalization_status public.normalization_status DEFAULT 'PENDING',
  ADD COLUMN normalization_error TEXT;

-- Add normalization fields to listings
ALTER TABLE public.listings 
  ADD COLUMN normalized_image_url TEXT,
  ADD COLUMN normalized_image_type public.normalized_image_type,
  ADD COLUMN normalization_status public.normalization_status DEFAULT 'PENDING',
  ADD COLUMN normalization_error TEXT;

-- Add normalization fields to card_instances
ALTER TABLE public.card_instances 
  ADD COLUMN normalized_image_url TEXT,
  ADD COLUMN normalized_image_type public.normalized_image_type,
  ADD COLUMN normalization_status public.normalization_status DEFAULT 'PENDING',
  ADD COLUMN normalization_error TEXT;

-- Add normalization fields to vault_items
ALTER TABLE public.vault_items 
  ADD COLUMN normalized_image_url TEXT,
  ADD COLUMN normalized_image_type public.normalized_image_type,
  ADD COLUMN normalization_status public.normalization_status DEFAULT 'PENDING',
  ADD COLUMN normalization_error TEXT;

-- Add normalization fields to grading_orders (front and back)
ALTER TABLE public.grading_orders 
  ADD COLUMN front_normalized_image_url TEXT,
  ADD COLUMN front_normalized_image_type public.normalized_image_type,
  ADD COLUMN front_normalization_status public.normalization_status DEFAULT 'PENDING',
  ADD COLUMN front_normalization_error TEXT,
  ADD COLUMN back_normalized_image_url TEXT,
  ADD COLUMN back_normalized_image_type public.normalized_image_type,
  ADD COLUMN back_normalization_status public.normalization_status DEFAULT 'PENDING',
  ADD COLUMN back_normalization_error TEXT;

-- Add normalization fields to swap_listings
ALTER TABLE public.swap_listings 
  ADD COLUMN normalized_image_url TEXT,
  ADD COLUMN normalized_image_type public.normalized_image_type,
  ADD COLUMN normalization_status public.normalization_status DEFAULT 'PENDING',
  ADD COLUMN normalization_error TEXT;

-- Add normalization fields to boom_pack_cards
ALTER TABLE public.boom_pack_cards 
  ADD COLUMN normalized_image_url TEXT,
  ADD COLUMN normalized_image_type public.normalized_image_type,
  ADD COLUMN normalization_status public.normalization_status DEFAULT 'PENDING',
  ADD COLUMN normalization_error TEXT;

-- Create indexes for efficient backfill queries
CREATE INDEX idx_market_items_normalization_pending 
  ON public.market_items (normalization_status) 
  WHERE normalization_status = 'PENDING' AND image_url IS NOT NULL;

CREATE INDEX idx_catalog_cards_normalization_pending 
  ON public.catalog_cards (normalization_status) 
  WHERE normalization_status = 'PENDING' AND image_url IS NOT NULL;

CREATE INDEX idx_listings_normalization_pending 
  ON public.listings (normalization_status) 
  WHERE normalization_status = 'PENDING' AND image_url IS NOT NULL;

CREATE INDEX idx_card_instances_normalization_pending 
  ON public.card_instances (normalization_status) 
  WHERE normalization_status = 'PENDING' AND image_url IS NOT NULL;

CREATE INDEX idx_vault_items_normalization_pending 
  ON public.vault_items (normalization_status) 
  WHERE normalization_status = 'PENDING' AND image_url IS NOT NULL;

-- Create a tracking table for normalization jobs
CREATE TABLE public.image_normalization_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  source_image_url TEXT NOT NULL,
  status public.normalization_status DEFAULT 'PENDING',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on jobs table
ALTER TABLE public.image_normalization_jobs ENABLE ROW LEVEL SECURITY;

-- Only admins can manage normalization jobs
CREATE POLICY "Admins can manage normalization jobs" ON public.image_normalization_jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create index on jobs table
CREATE INDEX idx_normalization_jobs_status 
  ON public.image_normalization_jobs (status, table_name);

CREATE UNIQUE INDEX idx_normalization_jobs_unique 
  ON public.image_normalization_jobs (table_name, record_id);