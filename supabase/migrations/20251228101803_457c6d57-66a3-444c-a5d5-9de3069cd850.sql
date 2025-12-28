-- ============================================
-- STEP 5: Payment intents + provider events
-- ============================================

-- Payment intent status enum
CREATE TYPE public.payment_intent_status AS ENUM (
  'pending',
  'processing',
  'succeeded', 
  'failed',
  'cancelled',
  'refunded',
  'partially_refunded'
);

-- Create payment_intents table
CREATE TABLE public.payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'TRY', 'EUR')),
  provider text NOT NULL CHECK (provider IN ('iyzico', 'stripe', 'wire_transfer', 'manual')),
  provider_intent_id text,
  status payment_intent_status NOT NULL DEFAULT 'pending',
  intent_type text NOT NULL CHECK (intent_type IN ('top_up', 'purchase', 'subscription', 'grading')),
  reference_type text,
  reference_id uuid,
  metadata jsonb DEFAULT '{}',
  idempotency_key text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  
  CONSTRAINT payment_intent_idempotency UNIQUE (user_id, idempotency_key)
);

CREATE INDEX idx_payment_intent_user ON public.payment_intents(user_id);
CREATE INDEX idx_payment_intent_status ON public.payment_intents(status);
CREATE INDEX idx_payment_intent_provider ON public.payment_intents(provider, provider_intent_id);
CREATE INDEX idx_payment_intent_created ON public.payment_intents(created_at DESC);

-- Provider webhook events (for deduplication and audit)
CREATE TABLE public.provider_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  signature text,
  signature_verified boolean DEFAULT false,
  processed boolean DEFAULT false,
  process_error text,
  payment_intent_id uuid REFERENCES public.payment_intents(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  
  CONSTRAINT provider_event_unique UNIQUE (provider, event_id)
);

CREATE INDEX idx_provider_events_processed ON public.provider_events(processed, created_at);
CREATE INDEX idx_provider_events_intent ON public.provider_events(payment_intent_id);

-- Refunds table
CREATE TABLE public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id uuid NOT NULL REFERENCES public.payment_intents(id),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  reason text,
  status payment_intent_status NOT NULL DEFAULT 'pending',
  provider_refund_id text,
  ledger_entry_id uuid REFERENCES public.ledger_entries(id),
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  
  CONSTRAINT refund_idempotency UNIQUE (payment_intent_id, idempotency_key)
);

CREATE INDEX idx_refunds_payment ON public.refunds(payment_intent_id);
CREATE INDEX idx_refunds_status ON public.refunds(status);

-- Reconciliation mismatches table
CREATE TABLE public.reconciliation_mismatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id uuid REFERENCES public.payment_intents(id),
  provider_event_id uuid REFERENCES public.provider_events(id),
  mismatch_type text NOT NULL,
  expected_amount_cents bigint,
  actual_amount_cents bigint,
  details jsonb,
  resolved boolean DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reconciliation_unresolved ON public.reconciliation_mismatches(resolved, created_at);

-- RLS for payment tables
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_mismatches ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment intents
CREATE POLICY "Users can view own payment intents"
ON public.payment_intents FOR SELECT
USING (user_id = auth.uid());

-- System can manage payment intents
CREATE POLICY "System can manage payment intents"
ON public.payment_intents FOR ALL
USING (true)
WITH CHECK (true);

-- Only admins can view provider events
CREATE POLICY "Admins can view provider events"
ON public.provider_events FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage provider events"
ON public.provider_events FOR ALL
USING (true)
WITH CHECK (true);

-- Users can view their own refunds
CREATE POLICY "Users can view own refunds"
ON public.refunds FOR SELECT
USING (
  payment_intent_id IN (SELECT id FROM public.payment_intents WHERE user_id = auth.uid())
);

CREATE POLICY "System can manage refunds"
ON public.refunds FOR ALL
USING (true)
WITH CHECK (true);

-- Only admins can manage reconciliation mismatches
CREATE POLICY "Admins can manage reconciliation mismatches"
ON public.reconciliation_mismatches FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));