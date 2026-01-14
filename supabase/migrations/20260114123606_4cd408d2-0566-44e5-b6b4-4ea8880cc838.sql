-- =============================================
-- OBSERVABILITY & SECURITY INFRASTRUCTURE (FIXED)
-- =============================================

-- 1. Request logs table for API audit trail
CREATE TABLE IF NOT EXISTS public.request_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  correlation_id TEXT,
  request_id TEXT,
  session_id TEXT,
  user_id UUID,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  latency_ms INTEGER,
  error_message TEXT,
  ip_address TEXT,
  user_agent TEXT,
  request_body JSONB,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON public.request_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_logs_user_id ON public.request_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_correlation_id ON public.request_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_status_code ON public.request_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_request_logs_endpoint ON public.request_logs(endpoint);

-- Enable RLS
ALTER TABLE public.request_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view request logs
CREATE POLICY "Admins can view request logs"
ON public.request_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert
CREATE POLICY "Service can insert request logs"
ON public.request_logs FOR INSERT
WITH CHECK (true);

-- 2. Rate limit tracking table
CREATE TABLE IF NOT EXISTS public.rate_limit_hits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL,
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('ip', 'user', 'email')),
  endpoint TEXT NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  window_end TIMESTAMPTZ NOT NULL,
  blocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier ON public.rate_limit_hits(identifier, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON public.rate_limit_hits(window_start, window_end);
CREATE INDEX IF NOT EXISTS idx_rate_limit_blocked ON public.rate_limit_hits(blocked_at) WHERE blocked_at IS NOT NULL;

ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view rate limit hits"
ON public.rate_limit_hits FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service can manage rate limit hits"
ON public.rate_limit_hits FOR ALL
WITH CHECK (true);

-- 3. Alert thresholds configuration
CREATE TABLE IF NOT EXISTS public.alert_thresholds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL UNIQUE,
  threshold_value NUMERIC NOT NULL,
  threshold_window_minutes INTEGER NOT NULL DEFAULT 5,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  notification_channels TEXT[] NOT NULL DEFAULT ARRAY['email'],
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.alert_thresholds (metric_name, threshold_value, threshold_window_minutes, severity, notification_channels) VALUES
  ('5xx_rate_percent', 1.0, 5, 'critical', ARRAY['email']),
  ('email_failure_rate_percent', 2.0, 10, 'warning', ARRAY['email']),
  ('payment_webhook_failure_rate_percent', 0.5, 10, 'critical', ARRAY['email']),
  ('auth_failure_rate_percent', 10.0, 5, 'warning', ARRAY['email']),
  ('db_latency_ms', 1000, 5, 'warning', ARRAY['email']),
  ('stuck_payments_count', 5, 60, 'warning', ARRAY['email']),
  ('rate_limit_blocks_count', 100, 5, 'info', ARRAY['email'])
ON CONFLICT (metric_name) DO NOTHING;

ALTER TABLE public.alert_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage alert thresholds"
ON public.alert_thresholds FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Alert history table
CREATE TABLE IF NOT EXISTS public.alert_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  threshold_id UUID REFERENCES public.alert_thresholds(id),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  threshold_value NUMERIC NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_history_created_at ON public.alert_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_history_acknowledged ON public.alert_history(acknowledged_at) WHERE acknowledged_at IS NULL;

ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage alert history"
ON public.alert_history FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 5. Feature flags table
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_key TEXT NOT NULL UNIQUE,
  flag_value BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  rollout_percentage INTEGER DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  allowed_user_ids UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.feature_flags (flag_key, flag_value, description) VALUES
  ('enable_turnstile', false, 'Enable Cloudflare Turnstile on auth forms'),
  ('enable_rate_limiting', true, 'Enable API rate limiting'),
  ('maintenance_mode', false, 'Put site in maintenance mode'),
  ('enable_crypto_payments', false, 'Enable cryptocurrency payment option'),
  ('enable_pro_features', true, 'Enable Pro subscription features')
ON CONFLICT (flag_key) DO NOTHING;

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read feature flags"
ON public.feature_flags FOR SELECT
USING (true);

CREATE POLICY "Admins can manage feature flags"
ON public.feature_flags FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 6. Email delivery tracking enhancement
ALTER TABLE public.email_logs 
ADD COLUMN IF NOT EXISTS bounce_type TEXT,
ADD COLUMN IF NOT EXISTS bounce_reason TEXT,
ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;

-- 7. Add correlation_id to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS correlation_id TEXT,
ADD COLUMN IF NOT EXISTS request_id TEXT;

CREATE INDEX IF NOT EXISTS idx_transactions_correlation 
ON public.transactions(correlation_id) WHERE correlation_id IS NOT NULL;

-- 8. Notification idempotency to prevent duplicates
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_idempotency 
ON public.notifications(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 9. File upload tracking for validation
CREATE TABLE IF NOT EXISTS public.file_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  is_validated BOOLEAN NOT NULL DEFAULT false,
  validation_errors TEXT[],
  scan_status TEXT DEFAULT 'pending' CHECK (scan_status IN ('pending', 'clean', 'suspicious', 'blocked')),
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_file_uploads_user ON public.file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_scan_status ON public.file_uploads(scan_status);

ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own uploads"
ON public.file_uploads FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own uploads"
ON public.file_uploads FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 10. Function to calculate error rates
CREATE OR REPLACE FUNCTION public.calculate_error_rate(
  p_endpoint TEXT DEFAULT NULL,
  p_window_minutes INTEGER DEFAULT 5
)
RETURNS TABLE (
  total_requests BIGINT,
  error_count BIGINT,
  error_rate_percent NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE status_code >= 500) as error_count,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE status_code >= 500)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE 0 
    END as error_rate_percent
  FROM public.request_logs
  WHERE created_at > now() - (p_window_minutes || ' minutes')::INTERVAL
    AND (p_endpoint IS NULL OR endpoint = p_endpoint);
$$;

-- 11. Function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_identifier_type TEXT,
  p_endpoint TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS TABLE (
  is_limited BOOLEAN,
  current_count INTEGER,
  remaining INTEGER,
  reset_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
  v_current_count INTEGER;
  v_reset_at TIMESTAMPTZ;
BEGIN
  v_window_start := now();
  v_window_end := now() + (p_window_seconds || ' seconds')::INTERVAL;
  
  SELECT rlh.hit_count, rlh.window_end INTO v_current_count, v_reset_at
  FROM public.rate_limit_hits rlh
  WHERE rlh.identifier = p_identifier
    AND rlh.identifier_type = p_identifier_type
    AND rlh.endpoint = p_endpoint
    AND rlh.window_end > now()
  ORDER BY rlh.window_start DESC
  LIMIT 1;
  
  IF v_current_count IS NULL THEN
    INSERT INTO public.rate_limit_hits (identifier, identifier_type, endpoint, hit_count, window_start, window_end)
    VALUES (p_identifier, p_identifier_type, p_endpoint, 1, v_window_start, v_window_end);
    
    is_limited := false;
    current_count := 1;
    remaining := p_limit - 1;
    reset_at := v_window_end;
  ELSE
    UPDATE public.rate_limit_hits rlh
    SET hit_count = hit_count + 1,
        blocked_at = CASE WHEN hit_count + 1 > p_limit THEN now() ELSE blocked_at END
    WHERE rlh.identifier = p_identifier
      AND rlh.identifier_type = p_identifier_type
      AND rlh.endpoint = p_endpoint
      AND rlh.window_end > now();
    
    current_count := v_current_count + 1;
    is_limited := current_count > p_limit;
    remaining := GREATEST(0, p_limit - current_count);
    reset_at := v_reset_at;
  END IF;
  
  RETURN NEXT;
END;
$$;

-- 12. Cleanup function for old logs
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.request_logs WHERE created_at < now() - INTERVAL '30 days';
  DELETE FROM public.rate_limit_hits WHERE created_at < now() - INTERVAL '7 days';
  DELETE FROM public.alert_history WHERE created_at < now() - INTERVAL '90 days';
END;
$$;