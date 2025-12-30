-- Create trade_match_preferences table for what users want
CREATE TABLE public.trade_preferences (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  market_item_id uuid REFERENCES public.market_items(id),
  preference_type text NOT NULL CHECK (preference_type IN ('want', 'have_for_trade')),
  min_grade text,
  max_price numeric,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, market_item_id, preference_type)
);

-- Enable RLS
ALTER TABLE public.trade_preferences ENABLE ROW LEVEL SECURITY;

-- Users can manage their own preferences
CREATE POLICY "Users can manage own trade preferences"
ON public.trade_preferences FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Anyone can view active preferences for matching
CREATE POLICY "Anyone can view active trade preferences"
ON public.trade_preferences FOR SELECT
USING (is_active = true);

-- Create indexes for efficient matching
CREATE INDEX idx_trade_preferences_user ON public.trade_preferences(user_id);
CREATE INDEX idx_trade_preferences_item ON public.trade_preferences(market_item_id);
CREATE INDEX idx_trade_preferences_type ON public.trade_preferences(preference_type);

-- Add trigger for updated_at
CREATE TRIGGER update_trade_preferences_updated_at
  BEFORE UPDATE ON public.trade_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();