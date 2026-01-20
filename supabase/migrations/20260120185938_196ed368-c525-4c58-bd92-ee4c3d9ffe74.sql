-- Create staging table for catalog imports (mirrors catalog_cards structure)
CREATE TABLE IF NOT EXISTS public.catalog_import_staging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game TEXT NOT NULL,
  canonical_key TEXT NOT NULL,
  set_code TEXT,
  set_name TEXT,
  card_number TEXT,
  card_name TEXT NOT NULL,
  variant TEXT,
  finish TEXT,
  rarity TEXT,
  language TEXT DEFAULT 'english',
  image_url TEXT,
  image_url_hires TEXT,
  artist TEXT,
  types TEXT[], -- For Pokemon: Fire, Water, etc.
  subtypes TEXT[], -- For Pokemon: Stage 1, Basic, etc.
  supertype TEXT, -- Pokemon, Trainer, Energy
  hp TEXT,
  retreat_cost INTEGER,
  tcg_id TEXT, -- Original ID from source API (pokemon tcg api id, scryfall id, etc.)
  source_api TEXT NOT NULL, -- 'pokemon_tcg_api', 'scryfall', 'optcg_api', etc.
  imported_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'promoted')),
  rejection_reason TEXT,
  existing_catalog_id UUID, -- If this matches an existing catalog_cards entry
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(canonical_key, source_api)
);

-- Index for fast lookups
CREATE INDEX idx_staging_game ON catalog_import_staging(game);
CREATE INDEX idx_staging_status ON catalog_import_staging(status);
CREATE INDEX idx_staging_canonical_key ON catalog_import_staging(canonical_key);
CREATE INDEX idx_staging_tcg_id ON catalog_import_staging(tcg_id);

-- Enable RLS
ALTER TABLE catalog_import_staging ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can manage staging imports"
ON catalog_import_staging FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add updated_at trigger
CREATE TRIGGER update_catalog_import_staging_updated_at
BEFORE UPDATE ON catalog_import_staging
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE catalog_import_staging IS 'Staging table for bulk catalog imports from official APIs (Pokemon TCG, Scryfall, OPTCG). Admin reviews before promoting to catalog_cards.';