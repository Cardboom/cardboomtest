-- Create fractional_listings table for cards available for fractional buying
CREATE TABLE public.fractional_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  market_item_id UUID REFERENCES public.market_items(id),
  total_shares INTEGER NOT NULL DEFAULT 100,
  available_shares INTEGER NOT NULL DEFAULT 100,
  share_price NUMERIC NOT NULL,
  min_shares INTEGER NOT NULL DEFAULT 10,
  allows_fractional BOOLEAN NOT NULL DEFAULT true,
  daily_verification_required BOOLEAN NOT NULL DEFAULT true,
  last_verified_at TIMESTAMP WITH TIME ZONE,
  next_verification_due TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  owner_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  CONSTRAINT min_shares_check CHECK (min_shares >= 1 AND min_shares <= 100),
  CONSTRAINT share_price_positive CHECK (share_price > 0)
);

-- Create fractional_ownership table to track who owns what shares
CREATE TABLE public.fractional_ownership (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fractional_listing_id UUID NOT NULL REFERENCES public.fractional_listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  shares_owned INTEGER NOT NULL,
  purchase_price_per_share NUMERIC NOT NULL,
  total_invested NUMERIC NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT shares_positive CHECK (shares_owned > 0)
);

-- Create fractional_verifications table for daily verifications
CREATE TABLE public.fractional_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fractional_listing_id UUID NOT NULL REFERENCES public.fractional_listings(id) ON DELETE CASCADE,
  verified_by UUID NOT NULL,
  verification_type TEXT NOT NULL DEFAULT 'photo',
  photo_url TEXT,
  notes TEXT,
  verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'verified'
);

-- Enable RLS
ALTER TABLE public.fractional_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fractional_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fractional_verifications ENABLE ROW LEVEL SECURITY;

-- Fractional listings policies
CREATE POLICY "Anyone can view active fractional listings"
ON public.fractional_listings FOR SELECT
USING (status = 'active' OR owner_id = auth.uid());

CREATE POLICY "Owners can create fractional listings"
ON public.fractional_listings FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their listings"
ON public.fractional_listings FOR UPDATE
USING (auth.uid() = owner_id);

-- Fractional ownership policies
CREATE POLICY "Users can view their ownership"
ON public.fractional_ownership FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can create ownership records"
ON public.fractional_ownership FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Listing owners can view all ownership"
ON public.fractional_ownership FOR SELECT
USING (EXISTS (
  SELECT 1 FROM fractional_listings fl 
  WHERE fl.id = fractional_ownership.fractional_listing_id 
  AND fl.owner_id = auth.uid()
));

-- Verification policies
CREATE POLICY "Anyone can view verifications"
ON public.fractional_verifications FOR SELECT
USING (true);

CREATE POLICY "Owners can add verifications"
ON public.fractional_verifications FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM fractional_listings fl 
  WHERE fl.id = fractional_verifications.fractional_listing_id 
  AND fl.owner_id = auth.uid()
));

-- Create indexes
CREATE INDEX idx_fractional_listings_status ON public.fractional_listings(status);
CREATE INDEX idx_fractional_listings_owner ON public.fractional_listings(owner_id);
CREATE INDEX idx_fractional_ownership_user ON public.fractional_ownership(user_id);
CREATE INDEX idx_fractional_ownership_listing ON public.fractional_ownership(fractional_listing_id);

-- Enable realtime for fractional tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.fractional_listings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fractional_ownership;