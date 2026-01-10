-- Create table for storing periodic health check reports
CREATE TABLE public.system_health_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  overall_status TEXT NOT NULL CHECK (overall_status IN ('healthy', 'degraded', 'down')),
  total_checks INTEGER NOT NULL DEFAULT 0,
  passed INTEGER NOT NULL DEFAULT 0,
  warnings INTEGER NOT NULL DEFAULT 0,
  failures INTEGER NOT NULL DEFAULT 0,
  check_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  latency_avg_ms INTEGER,
  triggered_by TEXT NOT NULL DEFAULT 'scheduled' CHECK (triggered_by IN ('scheduled', 'manual', 'alert'))
);

-- Create table for storing individual issue alerts
CREATE TABLE public.system_health_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  report_id UUID REFERENCES public.system_health_reports(id) ON DELETE CASCADE,
  check_id TEXT NOT NULL,
  check_name TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
  message TEXT NOT NULL,
  fix_hint TEXT,
  details JSONB,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id)
);

-- Create table for health check configuration
CREATE TABLE public.system_health_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  check_interval_minutes INTEGER NOT NULL DEFAULT 15,
  alert_threshold_warnings INTEGER NOT NULL DEFAULT 3,
  alert_threshold_failures INTEGER NOT NULL DEFAULT 1,
  email_alerts_enabled BOOLEAN NOT NULL DEFAULT false,
  alert_email TEXT,
  retention_days INTEGER NOT NULL DEFAULT 30,
  enabled_checks TEXT[] NOT NULL DEFAULT ARRAY['database', 'auth', 'wallet', 'listings', 'grading', 'payments', 'api'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default config
INSERT INTO public.system_health_config (check_interval_minutes, enabled_checks)
VALUES (15, ARRAY['database', 'auth', 'wallet', 'listings', 'grading', 'payments', 'api', 'vault', 'disputes']);

-- Create indexes
CREATE INDEX idx_health_reports_created_at ON public.system_health_reports(created_at DESC);
CREATE INDEX idx_health_alerts_unresolved ON public.system_health_alerts(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX idx_health_alerts_severity ON public.system_health_alerts(severity, created_at DESC);

-- Enable RLS
ALTER TABLE public.system_health_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_config ENABLE ROW LEVEL SECURITY;

-- Admin-only policies (using user_roles table)
CREATE POLICY "Admins can view health reports"
ON public.system_health_reports FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "System can insert health reports"
ON public.system_health_reports FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view health alerts"
ON public.system_health_alerts FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "System can insert health alerts"
ON public.system_health_alerts FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update health alerts"
ON public.system_health_alerts FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can manage health config"
ON public.system_health_config FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Function to clean up old reports
CREATE OR REPLACE FUNCTION public.cleanup_old_health_reports()
RETURNS void AS $$
BEGIN
  DELETE FROM public.system_health_reports
  WHERE created_at < now() - (
    SELECT (retention_days || ' days')::interval 
    FROM public.system_health_config 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;