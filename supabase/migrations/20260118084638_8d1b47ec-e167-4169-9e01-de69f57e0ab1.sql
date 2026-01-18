-- Create missing tables first
CREATE TABLE IF NOT EXISTS card_prices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  catalog_card_id uuid REFERENCES catalog_cards(id) ON DELETE CASCADE,
  canonical_card_key text NOT NULL,
  source text NOT NULL,
  currency text DEFAULT 'USD',
  condition text,
  grade_company text,
  grade_value numeric,
  price numeric NOT NULL,
  low_price numeric,
  high_price numeric,
  avg_price numeric,
  market_price numeric,
  last_sale_price numeric,
  last_sale_at timestamptz,
  sample_size integer DEFAULT 0,
  raw_payload jsonb,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pricing_unmatched_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL,
  external_id text,
  raw_payload jsonb NOT NULL,
  reason text NOT NULL,
  suggested_matches jsonb DEFAULT '[]',
  resolved_at timestamptz,
  resolved_by uuid,
  resolved_to_catalog_id uuid REFERENCES catalog_cards(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS catalog_import_batches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL,
  game text,
  status text DEFAULT 'pending',
  total_records integer DEFAULT 0,
  valid_records integer DEFAULT 0,
  invalid_records integer DEFAULT 0,
  promoted_records integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_by uuid,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_card_prices_canonical ON card_prices (canonical_card_key);
CREATE INDEX IF NOT EXISTS idx_card_prices_source ON card_prices (source);
CREATE INDEX IF NOT EXISTS idx_unmatched_source ON pricing_unmatched_items (source);

-- Enable RLS and add policies
ALTER TABLE card_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_unmatched_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read card_prices" ON card_prices FOR SELECT USING (true);
CREATE POLICY "Admin manage card_prices" ON card_prices FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin manage unmatched" ON pricing_unmatched_items FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin manage batches" ON catalog_import_batches FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Create normalization function
CREATE OR REPLACE FUNCTION normalize_onepiece_card_number(p_set_code text, p_card_number text) RETURNS text AS $$
BEGIN
  IF p_card_number IS NULL THEN RETURN NULL; END IF;
  IF p_card_number ~* '^(OP\d{2}|EB\d{2}|ST\d{2})-?\d+$' THEN
    RETURN upper(substring(p_card_number from '^([A-Z]{2}\d{2})')) || '-' || lpad(substring(p_card_number from '(\d+)$'), 3, '0');
  END IF;
  IF p_card_number ~ '^\d+$' AND p_set_code IS NOT NULL THEN
    RETURN upper(p_set_code) || '-' || lpad(p_card_number, 3, '0');
  END IF;
  RETURN p_card_number;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION build_canonical_card_key(p_game text, p_language text, p_set_code text, p_normalized_card_number text) RETURNS text AS $$
BEGIN
  IF p_game IS NULL OR p_set_code IS NULL OR p_normalized_card_number IS NULL THEN RETURN NULL; END IF;
  RETURN lower(p_game) || ':' || lower(COALESCE(p_language, 'en')) || ':' || lower(p_set_code) || ':' || lower(p_normalized_card_number);
END;
$$ LANGUAGE plpgsql IMMUTABLE;