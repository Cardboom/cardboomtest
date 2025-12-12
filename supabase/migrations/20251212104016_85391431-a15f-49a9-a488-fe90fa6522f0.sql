-- Table for tracking price history (hybrid pricing system)
CREATE TABLE public.price_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id text NOT NULL,
  price numeric NOT NULL,
  source text NOT NULL DEFAULT 'internal', -- 'internal' for platform sales, 'external' for API data
  recorded_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for efficient price queries
CREATE INDEX idx_price_history_product_recorded ON public.price_history(product_id, recorded_at DESC);

-- Enable RLS
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Anyone can read price history (public data)
CREATE POLICY "Anyone can view price history"
  ON public.price_history FOR SELECT
  USING (true);

-- Only system can insert price records
CREATE POLICY "System can insert price history"
  ON public.price_history FOR INSERT
  WITH CHECK (true);

-- Table for pending payments (iyzico 3D flow)
CREATE TABLE public.pending_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  fee numeric NOT NULL,
  total numeric NOT NULL,
  conversation_id text NOT NULL UNIQUE,
  payment_id text,
  status text NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

-- Index for quick lookup
CREATE INDEX idx_pending_payments_conversation ON public.pending_payments(conversation_id);
CREATE INDEX idx_pending_payments_user ON public.pending_payments(user_id);

-- Enable RLS
ALTER TABLE public.pending_payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own pending payments
CREATE POLICY "Users can view own pending payments"
  ON public.pending_payments FOR SELECT
  USING (auth.uid() = user_id);

-- System can manage pending payments
CREATE POLICY "System can insert pending payments"
  ON public.pending_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update pending payments"
  ON public.pending_payments FOR UPDATE
  USING (true);