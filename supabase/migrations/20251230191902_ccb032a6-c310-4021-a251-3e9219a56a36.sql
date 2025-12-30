-- Create table for currency exchange rates with manual override support
CREATE TABLE public.currency_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate DECIMAL(12, 6) NOT NULL,
  api_rate DECIMAL(12, 6),
  is_manual_override BOOLEAN DEFAULT false,
  last_api_update TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID,
  UNIQUE(from_currency, to_currency)
);

-- Enable RLS
ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;

-- Everyone can read rates
CREATE POLICY "Anyone can read currency rates"
ON public.currency_rates
FOR SELECT
USING (true);

-- Only admins can update rates (will check via application)
CREATE POLICY "Authenticated users can update rates"
ON public.currency_rates
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert rates"
ON public.currency_rates
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Insert default rates
INSERT INTO public.currency_rates (from_currency, to_currency, rate, api_rate)
VALUES 
  ('USD', 'TRY', 42.62, 42.62),
  ('USD', 'EUR', 0.92, 0.92),
  ('EUR', 'TRY', 46.32, 46.32);

-- Add trigger for updated_at
CREATE TRIGGER update_currency_rates_updated_at
BEFORE UPDATE ON public.currency_rates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();