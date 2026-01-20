-- Add detailed card metadata columns to catalog_cards
ALTER TABLE public.catalog_cards 
ADD COLUMN IF NOT EXISTS effect_text TEXT,
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS card_type TEXT,
ADD COLUMN IF NOT EXISTS cost INTEGER,
ADD COLUMN IF NOT EXISTS power INTEGER,
ADD COLUMN IF NOT EXISTS counter INTEGER,
ADD COLUMN IF NOT EXISTS attribute TEXT,
ADD COLUMN IF NOT EXISTS subtypes TEXT[];

-- Add same columns to staging table
ALTER TABLE public.catalog_import_staging
ADD COLUMN IF NOT EXISTS effect_text TEXT,
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS card_type TEXT,
ADD COLUMN IF NOT EXISTS cost INTEGER,
ADD COLUMN IF NOT EXISTS power INTEGER,
ADD COLUMN IF NOT EXISTS counter INTEGER,
ADD COLUMN IF NOT EXISTS attribute TEXT;

-- Create index for searching by color/type
CREATE INDEX IF NOT EXISTS idx_catalog_cards_color ON public.catalog_cards(color);
CREATE INDEX IF NOT EXISTS idx_catalog_cards_card_type ON public.catalog_cards(card_type);