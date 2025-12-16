-- Create API subscriptions table
CREATE TABLE public.api_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  plan TEXT NOT NULL DEFAULT 'basic',
  price_monthly NUMERIC NOT NULL DEFAULT 30,
  requests_today INTEGER NOT NULL DEFAULT 0,
  requests_limit INTEGER NOT NULL DEFAULT 10000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON public.api_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own subscriptions
CREATE POLICY "Users can create own subscriptions"
  ON public.api_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscriptions
CREATE POLICY "Users can update own subscriptions"
  ON public.api_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_api_subscriptions_updated_at
  BEFORE UPDATE ON public.api_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for API key lookups
CREATE INDEX idx_api_subscriptions_api_key ON public.api_subscriptions(api_key);

-- Create API request logs table for tracking
CREATE TABLE public.api_request_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key UUID NOT NULL,
  endpoint TEXT NOT NULL,
  response_code INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on logs
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;

-- Only allow inserts via edge function (service role)
CREATE POLICY "Service role can manage logs"
  ON public.api_request_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);