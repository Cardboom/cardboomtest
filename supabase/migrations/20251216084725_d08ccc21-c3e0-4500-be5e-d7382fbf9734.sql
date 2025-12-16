-- Create table for secondary market share listings
CREATE TABLE public.fractional_share_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fractional_listing_id UUID NOT NULL REFERENCES public.fractional_listings(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  shares_for_sale INTEGER NOT NULL,
  price_per_share NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT positive_shares CHECK (shares_for_sale > 0),
  CONSTRAINT positive_price CHECK (price_per_share > 0)
);

-- Enable RLS
ALTER TABLE public.fractional_share_listings ENABLE ROW LEVEL SECURITY;

-- Anyone can view active listings
CREATE POLICY "Anyone can view active share listings"
ON public.fractional_share_listings
FOR SELECT
USING (status = 'active' OR seller_id = auth.uid());

-- Users can create listings for shares they own
CREATE POLICY "Users can list their shares"
ON public.fractional_share_listings
FOR INSERT
WITH CHECK (auth.uid() = seller_id);

-- Sellers can update their own listings
CREATE POLICY "Sellers can update their listings"
ON public.fractional_share_listings
FOR UPDATE
USING (auth.uid() = seller_id);

-- Sellers can delete their own listings
CREATE POLICY "Sellers can delete their listings"
ON public.fractional_share_listings
FOR DELETE
USING (auth.uid() = seller_id);

-- Add trigger for updated_at
CREATE TRIGGER update_fractional_share_listings_updated_at
BEFORE UPDATE ON public.fractional_share_listings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();