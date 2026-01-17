-- ================================================
-- DETERMINISTIC AUTO-MAPPING SYSTEM
-- ================================================

-- STEP 1: Add normalized_key columns to both tables
ALTER TABLE public.catalog_cards ADD COLUMN IF NOT EXISTS normalized_key TEXT;
ALTER TABLE public.market_items ADD COLUMN IF NOT EXISTS normalized_key TEXT;

-- STEP 2: Create alias lookup tables for canonical normalization

-- Set code aliases (e.g., "base set" -> "base1")
CREATE TABLE IF NOT EXISTS public.set_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game TEXT NOT NULL,
  alias TEXT NOT NULL,
  canonical_set_code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(game, alias)
);

-- Variant aliases (e.g., "holo", "holofoil" -> "holo")
CREATE TABLE IF NOT EXISTS public.variant_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game TEXT NOT NULL,
  alias TEXT NOT NULL,
  canonical_variant TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(game, alias)
);

-- Finish aliases (e.g., "reverse", "reverse holo" -> "reverse_holo")
CREATE TABLE IF NOT EXISTS public.finish_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game TEXT NOT NULL,
  alias TEXT NOT NULL,
  canonical_finish TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(game, alias)
);

-- Enable RLS with public read
ALTER TABLE public.set_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finish_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view set aliases" ON public.set_aliases FOR SELECT USING (true);
CREATE POLICY "Anyone can view variant aliases" ON public.variant_aliases FOR SELECT USING (true);
CREATE POLICY "Anyone can view finish aliases" ON public.finish_aliases FOR SELECT USING (true);

-- STEP 3: Create normalization functions

-- Basic string normalizer (lowercase, strip non-alphanumeric)
CREATE OR REPLACE FUNCTION public.normalize_string(input TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  IF input IS NULL THEN RETURN NULL; END IF;
  RETURN lower(regexp_replace(input, '[^a-zA-Z0-9]', '', 'g'));
END;
$$;

-- Card number normalizer (handles "123/198" -> "123", leading zeros)
CREATE OR REPLACE FUNCTION public.normalize_card_number(input TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  result TEXT;
BEGIN
  IF input IS NULL THEN RETURN NULL; END IF;
  -- Extract number before slash if present
  result := split_part(input, '/', 1);
  -- Strip non-numeric except letters at end (like "123a")
  result := lower(regexp_replace(result, '[^a-zA-Z0-9]', '', 'g'));
  -- Remove leading zeros but keep at least one digit
  result := regexp_replace(result, '^0+(?=.)', '');
  RETURN result;
END;
$$;

-- Set code normalizer with alias lookup
CREATE OR REPLACE FUNCTION public.normalize_set_code(game TEXT, input TEXT)
RETURNS TEXT
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  normalized TEXT;
  alias_result TEXT;
BEGIN
  IF input IS NULL THEN RETURN NULL; END IF;
  normalized := public.normalize_string(input);
  
  -- Check alias table
  SELECT canonical_set_code INTO alias_result
  FROM public.set_aliases
  WHERE set_aliases.game = normalize_set_code.game
    AND set_aliases.alias = normalized
  LIMIT 1;
  
  RETURN COALESCE(alias_result, normalized);
END;
$$;

-- Variant normalizer with alias lookup
CREATE OR REPLACE FUNCTION public.normalize_variant(game TEXT, input TEXT)
RETURNS TEXT
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  normalized TEXT;
  alias_result TEXT;
BEGIN
  IF input IS NULL THEN RETURN 'regular'; END IF;
  normalized := public.normalize_string(input);
  IF normalized = '' THEN RETURN 'regular'; END IF;
  
  -- Check alias table
  SELECT canonical_variant INTO alias_result
  FROM public.variant_aliases
  WHERE variant_aliases.game = normalize_variant.game
    AND variant_aliases.alias = normalized
  LIMIT 1;
  
  RETURN COALESCE(alias_result, normalized);
END;
$$;

-- Finish normalizer with alias lookup
CREATE OR REPLACE FUNCTION public.normalize_finish(game TEXT, input TEXT)
RETURNS TEXT
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  normalized TEXT;
  alias_result TEXT;
BEGIN
  IF input IS NULL THEN RETURN 'normal'; END IF;
  normalized := public.normalize_string(input);
  IF normalized = '' THEN RETURN 'normal'; END IF;
  
  -- Check alias table
  SELECT canonical_finish INTO alias_result
  FROM public.finish_aliases
  WHERE finish_aliases.game = normalize_finish.game
    AND finish_aliases.alias = normalized
  LIMIT 1;
  
  RETURN COALESCE(alias_result, normalized);
END;
$$;

-- STEP 4: Build normalized_key function
CREATE OR REPLACE FUNCTION public.build_normalized_key(
  game TEXT,
  set_code TEXT,
  card_number TEXT,
  card_code TEXT DEFAULT NULL,
  variant TEXT DEFAULT NULL,
  finish TEXT DEFAULT NULL,
  collector_number TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  norm_game TEXT;
  norm_set TEXT;
  norm_num TEXT;
  norm_variant TEXT;
  norm_finish TEXT;
BEGIN
  norm_game := lower(COALESCE(game, ''));
  
  CASE norm_game
    WHEN 'onepiece' THEN
      -- One Piece: use card_code directly or build from set+number
      IF card_code IS NOT NULL AND card_code != '' THEN
        RETURN 'onepiece:' || public.normalize_string(card_code);
      ELSE
        norm_set := COALESCE(public.normalize_set_code('onepiece', set_code), '');
        norm_num := COALESCE(public.normalize_card_number(card_number), '');
        RETURN 'onepiece:' || norm_set || '-' || norm_num;
      END IF;
      
    WHEN 'pokemon' THEN
      norm_set := COALESCE(public.normalize_set_code('pokemon', set_code), '');
      norm_num := COALESCE(public.normalize_card_number(card_number), '');
      norm_variant := public.normalize_variant('pokemon', variant);
      norm_finish := public.normalize_finish('pokemon', finish);
      RETURN 'pokemon:' || norm_set || ':' || norm_num || ':' || norm_variant || ':' || norm_finish;
      
    WHEN 'mtg' THEN
      norm_set := COALESCE(public.normalize_set_code('mtg', set_code), '');
      norm_num := COALESCE(public.normalize_card_number(COALESCE(collector_number, card_number)), '');
      norm_finish := public.normalize_finish('mtg', finish);
      RETURN 'mtg:' || norm_set || ':' || norm_num || ':' || norm_finish;
      
    ELSE
      -- Generic fallback
      norm_set := COALESCE(public.normalize_string(set_code), '');
      norm_num := COALESCE(public.normalize_card_number(card_number), '');
      RETURN norm_game || ':' || norm_set || ':' || norm_num;
  END CASE;
END;
$$;

-- STEP 5: Add match method column to catalog_card_map
ALTER TABLE public.catalog_card_map ADD COLUMN IF NOT EXISTS match_method TEXT DEFAULT 'key_exact';

-- STEP 6: Create review queue for unmatched/multi-match cases
CREATE TABLE IF NOT EXISTS public.match_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_card_id UUID NOT NULL REFERENCES public.catalog_cards(id) ON DELETE CASCADE,
  candidate_market_item_ids UUID[] NOT NULL,
  candidate_scores NUMERIC[] NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'skipped')),
  resolved_market_item_id UUID REFERENCES public.market_items(id),
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(catalog_card_id)
);

ALTER TABLE public.match_review_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage review queue" ON public.match_review_queue FOR ALL USING (true);

-- STEP 7: Create indexes for faster matching
CREATE INDEX IF NOT EXISTS idx_catalog_cards_normalized_key ON public.catalog_cards(normalized_key);
CREATE INDEX IF NOT EXISTS idx_market_items_normalized_key ON public.market_items(normalized_key);
CREATE INDEX IF NOT EXISTS idx_catalog_cards_game_set_num ON public.catalog_cards(game, set_code, card_number);
CREATE INDEX IF NOT EXISTS idx_market_items_category_set_num ON public.market_items(category, set_code, card_number);
CREATE INDEX IF NOT EXISTS idx_match_review_queue_status ON public.match_review_queue(status);

-- STEP 8: Seed common aliases

-- Pokemon set aliases
INSERT INTO public.set_aliases (game, alias, canonical_set_code) VALUES
  ('pokemon', 'baseset', 'base1'),
  ('pokemon', 'base', 'base1'),
  ('pokemon', 'jungle', 'jungle'),
  ('pokemon', 'fossil', 'fossil'),
  ('pokemon', 'teamrocket', 'rocket'),
  ('pokemon', 'rocket', 'rocket'),
  ('pokemon', 'prismaticchaos', 'sv09'),
  ('pokemon', 'sv09', 'sv09'),
  ('pokemon', 'prismaticevolutions', 'sv08'),
  ('pokemon', 'sv08', 'sv08'),
  ('pokemon', 'surginggparks', 'sv07'),
  ('pokemon', 'sv07', 'sv07')
ON CONFLICT (game, alias) DO NOTHING;

-- Pokemon variant aliases
INSERT INTO public.variant_aliases (game, alias, canonical_variant) VALUES
  ('pokemon', 'regular', 'regular'),
  ('pokemon', 'normal', 'regular'),
  ('pokemon', 'holo', 'holo'),
  ('pokemon', 'holofoil', 'holo'),
  ('pokemon', 'holographic', 'holo'),
  ('pokemon', 'reverse', 'reverse'),
  ('pokemon', 'reverseholo', 'reverse'),
  ('pokemon', 'fullart', 'fullart'),
  ('pokemon', 'fa', 'fullart'),
  ('pokemon', 'alt', 'alt'),
  ('pokemon', 'altart', 'alt'),
  ('pokemon', 'secretrare', 'secret'),
  ('pokemon', 'secret', 'secret'),
  ('pokemon', 'sir', 'sir'),
  ('pokemon', 'specialillustrationrare', 'sir'),
  ('pokemon', 'sar', 'sar'),
  ('pokemon', 'specialartrare', 'sar'),
  ('pokemon', 'illustrationrare', 'ir'),
  ('pokemon', 'ir', 'ir'),
  ('pokemon', 'ultrare', 'ultra'),
  ('pokemon', 'ur', 'ultra')
ON CONFLICT (game, alias) DO NOTHING;

-- Pokemon finish aliases
INSERT INTO public.finish_aliases (game, alias, canonical_finish) VALUES
  ('pokemon', 'normal', 'normal'),
  ('pokemon', 'holofoil', 'holo'),
  ('pokemon', 'holo', 'holo'),
  ('pokemon', 'reverseholo', 'reverse_holo'),
  ('pokemon', 'reverse', 'reverse_holo'),
  ('pokemon', 'etched', 'etched'),
  ('pokemon', 'cosmos', 'cosmos')
ON CONFLICT (game, alias) DO NOTHING;

-- One Piece set aliases
INSERT INTO public.set_aliases (game, alias, canonical_set_code) VALUES
  ('onepiece', 'op01', 'op01'),
  ('onepiece', 'op02', 'op02'),
  ('onepiece', 'op03', 'op03'),
  ('onepiece', 'op04', 'op04'),
  ('onepiece', 'op05', 'op05'),
  ('onepiece', 'op06', 'op06'),
  ('onepiece', 'op07', 'op07'),
  ('onepiece', 'op08', 'op08'),
  ('onepiece', 'op09', 'op09'),
  ('onepiece', 'op10', 'op10'),
  ('onepiece', 'eb01', 'eb01'),
  ('onepiece', 'eb02', 'eb02'),
  ('onepiece', 'st01', 'st01'),
  ('onepiece', 'st02', 'st02'),
  ('onepiece', 'st03', 'st03'),
  ('onepiece', 'st04', 'st04'),
  ('onepiece', 'prb01', 'prb01'),
  ('onepiece', 'romancedawn', 'op01'),
  ('onepiece', 'paramountwar', 'op02'),
  ('onepiece', 'pillarsofstrength', 'op03')
ON CONFLICT (game, alias) DO NOTHING;

-- MTG set aliases
INSERT INTO public.set_aliases (game, alias, canonical_set_code) VALUES
  ('mtg', 'dmu', 'dmu'),
  ('mtg', 'dominariaunited', 'dmu'),
  ('mtg', 'bro', 'bro'),
  ('mtg', 'brotherswar', 'bro'),
  ('mtg', 'one', 'one'),
  ('mtg', 'phyrexia', 'one'),
  ('mtg', 'mom', 'mom'),
  ('mtg', 'marchofthemachine', 'mom'),
  ('mtg', 'woe', 'woe'),
  ('mtg', 'wilds', 'woe'),
  ('mtg', 'lci', 'lci'),
  ('mtg', 'ixalan', 'lci'),
  ('mtg', 'mkm', 'mkm'),
  ('mtg', 'murders', 'mkm'),
  ('mtg', 'otj', 'otj'),
  ('mtg', 'outlaws', 'otj')
ON CONFLICT (game, alias) DO NOTHING;

-- MTG finish aliases
INSERT INTO public.finish_aliases (game, alias, canonical_finish) VALUES
  ('mtg', 'normal', 'normal'),
  ('mtg', 'nonfoil', 'normal'),
  ('mtg', 'foil', 'foil'),
  ('mtg', 'etched', 'etched'),
  ('mtg', 'etchedfoil', 'etched'),
  ('mtg', 'surge', 'surge'),
  ('mtg', 'surgefoil', 'surge'),
  ('mtg', 'gilded', 'gilded'),
  ('mtg', 'gildedfoil', 'gilded'),
  ('mtg', 'textured', 'textured'),
  ('mtg', 'texturedfoil', 'textured'),
  ('mtg', 'serialized', 'serialized')
ON CONFLICT (game, alias) DO NOTHING;