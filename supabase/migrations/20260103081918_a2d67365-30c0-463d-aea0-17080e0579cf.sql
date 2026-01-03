-- Create digital product codes inventory table
CREATE TABLE public.digital_product_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  market_item_id UUID REFERENCES public.market_items(id),
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('game_key', 'game_points', 'gift_card', 'subscription')),
  game_name TEXT NOT NULL,
  code TEXT NOT NULL,
  is_sold BOOLEAN DEFAULT false,
  is_reserved BOOLEAN DEFAULT false,
  reserved_until TIMESTAMPTZ,
  reserved_by_order_id UUID,
  sold_at TIMESTAMPTZ,
  sold_to_user_id UUID,
  sold_order_id UUID,
  source_provider TEXT NOT NULL DEFAULT 'manual',
  source_order_id TEXT,
  cost_price_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create delivered codes log for audit
CREATE TABLE public.digital_code_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) NOT NULL,
  code_id UUID REFERENCES public.digital_product_codes(id) NOT NULL,
  user_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivery_method TEXT DEFAULT 'instant',
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ
);

-- Create provider configuration table
CREATE TABLE public.key_provider_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL UNIQUE CHECK (provider IN ('kinguin', 'g2a', 'eneba', 'manual')),
  is_enabled BOOLEAN DEFAULT false,
  api_key_secret_name TEXT,
  markup_percent NUMERIC(5,2) DEFAULT 15.00,
  auto_purchase_enabled BOOLEAN DEFAULT false,
  min_stock_threshold INTEGER DEFAULT 5,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.digital_product_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_code_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_provider_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for digital_product_codes (admin only for management)
CREATE POLICY "Admins can manage codes" ON public.digital_product_codes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for digital_code_deliveries
CREATE POLICY "Users can view their own deliveries" ON public.digital_code_deliveries
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert deliveries" ON public.digital_code_deliveries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all deliveries" ON public.digital_code_deliveries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for key_provider_config (admin only)
CREATE POLICY "Admins can manage provider config" ON public.key_provider_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Create indexes
CREATE INDEX idx_digital_codes_available ON public.digital_product_codes(market_item_id, is_sold, is_reserved) WHERE is_sold = false AND is_reserved = false;
CREATE INDEX idx_digital_codes_game ON public.digital_product_codes(game_name, product_type);
CREATE INDEX idx_code_deliveries_user ON public.digital_code_deliveries(user_id);
CREATE INDEX idx_code_deliveries_order ON public.digital_code_deliveries(order_id);

-- Insert default provider configs with 15% markup
INSERT INTO public.key_provider_config (provider, markup_percent, is_enabled) VALUES
  ('kinguin', 15.00, false),
  ('g2a', 15.00, false),
  ('eneba', 15.00, false),
  ('manual', 15.00, true);

-- Create trigger for updated_at
CREATE TRIGGER update_digital_product_codes_updated_at
  BEFORE UPDATE ON public.digital_product_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_key_provider_config_updated_at
  BEFORE UPDATE ON public.key_provider_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();