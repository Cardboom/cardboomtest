-- Add CBGI (CardBoom Grading Index) fields to grading_orders
ALTER TABLE public.grading_orders 
ADD COLUMN IF NOT EXISTS cbgi_json jsonb,
ADD COLUMN IF NOT EXISTS cbgi_score_0_100 integer,
ADD COLUMN IF NOT EXISTS estimated_psa_range text,
ADD COLUMN IF NOT EXISTS cbgi_confidence text CHECK (cbgi_confidence IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS cbgi_risk_flags text[],
ADD COLUMN IF NOT EXISTS tcg text CHECK (tcg IN ('pokemon', 'onepiece', 'mtg', 'yugioh', 'sports', 'lorcana', 'other')),
ADD COLUMN IF NOT EXISTS variant text,
ADD COLUMN IF NOT EXISTS identified_confidence numeric(3,2),
ADD COLUMN IF NOT EXISTS eye_appeal_grade numeric(3,1),
ADD COLUMN IF NOT EXISTS pricing_confidence numeric(3,2),
ADD COLUMN IF NOT EXISTS price_low numeric(10,2),
ADD COLUMN IF NOT EXISTS price_mid numeric(10,2),
ADD COLUMN IF NOT EXISTS price_high numeric(10,2),
ADD COLUMN IF NOT EXISTS price_source text,
ADD COLUMN IF NOT EXISTS price_currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS comps_json jsonb,
ADD COLUMN IF NOT EXISTS error_message text;

-- Create index for CBGI score lookups
CREATE INDEX IF NOT EXISTS idx_grading_orders_cbgi_score ON public.grading_orders(cbgi_score_0_100);

-- Create index for status + user queries
CREATE INDEX IF NOT EXISTS idx_grading_orders_user_status ON public.grading_orders(user_id, status);

COMMENT ON COLUMN public.grading_orders.cbgi_json IS 'Full CBGI grading response from ChatGPT Vision';
COMMENT ON COLUMN public.grading_orders.cbgi_score_0_100 IS 'CardBoom Grading Index score 0-100';
COMMENT ON COLUMN public.grading_orders.estimated_psa_range IS 'Estimated PSA grade range e.g. PSA 8-9';
COMMENT ON COLUMN public.grading_orders.cbgi_confidence IS 'Confidence level: low, medium, high';
COMMENT ON COLUMN public.grading_orders.cbgi_risk_flags IS 'Risk flags like GLARE, LOW_RES, SLEEVE, PRINT_LINES_RISK';
COMMENT ON COLUMN public.grading_orders.eye_appeal_grade IS 'Eye appeal subgrade 1-10';
COMMENT ON COLUMN public.grading_orders.comps_json IS 'Comparable listings from pricing source';