-- Create price reports table for users to report wrong prices
CREATE TABLE public.price_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  catalog_card_id UUID REFERENCES public.catalog_cards(id),
  market_item_id UUID REFERENCES public.market_items(id),
  listing_id UUID REFERENCES public.listings(id),
  user_id UUID REFERENCES auth.users(id),
  reported_price NUMERIC,
  expected_price NUMERIC,
  report_reason TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.price_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports (even anonymous with null user_id)
CREATE POLICY "Anyone can create price reports"
ON public.price_reports
FOR INSERT
WITH CHECK (true);

-- Users can view their own reports
CREATE POLICY "Users can view their own reports"
ON public.price_reports
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view and update all reports
CREATE POLICY "Admins can view all reports"
ON public.price_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'moderator')
  )
);

CREATE POLICY "Admins can update reports"
ON public.price_reports
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'moderator')
  )
);

-- Create index for faster lookups
CREATE INDEX idx_price_reports_status ON public.price_reports(status);
CREATE INDEX idx_price_reports_catalog_card ON public.price_reports(catalog_card_id);
CREATE INDEX idx_price_reports_created_at ON public.price_reports(created_at DESC);