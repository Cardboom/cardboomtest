-- Create swap_listings table for card swap feature
CREATE TABLE public.swap_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_instance_id UUID REFERENCES public.card_instances(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  category TEXT NOT NULL,
  condition TEXT DEFAULT 'near_mint',
  grade TEXT,
  grading_company TEXT,
  estimated_value NUMERIC(10,2),
  looking_for TEXT, -- What the user is looking for in exchange
  accept_cash_offers BOOLEAN DEFAULT true,
  min_cash_addon NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'completed', 'cancelled')),
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create swap_offers table for offers on swap listings
CREATE TABLE public.swap_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  swap_listing_id UUID NOT NULL REFERENCES public.swap_listings(id) ON DELETE CASCADE,
  offerer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offered_card_instance_id UUID REFERENCES public.card_instances(id) ON DELETE SET NULL,
  offered_card_title TEXT NOT NULL,
  offered_card_image TEXT,
  offered_card_category TEXT,
  offered_card_condition TEXT,
  offered_card_grade TEXT,
  offered_card_estimated_value NUMERIC(10,2),
  cash_addon NUMERIC(10,2) DEFAULT 0, -- Additional cash offered
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn', 'countered')),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.swap_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swap_offers ENABLE ROW LEVEL SECURITY;

-- Swap listings policies
CREATE POLICY "Anyone can view active swap listings"
  ON public.swap_listings FOR SELECT
  USING (status = 'active' OR user_id = auth.uid());

CREATE POLICY "Users can create their own swap listings"
  ON public.swap_listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own swap listings"
  ON public.swap_listings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own swap listings"
  ON public.swap_listings FOR DELETE
  USING (auth.uid() = user_id);

-- Swap offers policies
CREATE POLICY "Users can view offers on their listings or their own offers"
  ON public.swap_offers FOR SELECT
  USING (
    offerer_id = auth.uid() OR
    swap_listing_id IN (SELECT id FROM public.swap_listings WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create offers on swap listings"
  ON public.swap_offers FOR INSERT
  WITH CHECK (auth.uid() = offerer_id);

CREATE POLICY "Users can update their own offers"
  ON public.swap_offers FOR UPDATE
  USING (
    offerer_id = auth.uid() OR
    swap_listing_id IN (SELECT id FROM public.swap_listings WHERE user_id = auth.uid())
  );

-- Indexes for performance
CREATE INDEX idx_swap_listings_user_id ON public.swap_listings(user_id);
CREATE INDEX idx_swap_listings_status ON public.swap_listings(status);
CREATE INDEX idx_swap_listings_category ON public.swap_listings(category);
CREATE INDEX idx_swap_offers_listing_id ON public.swap_offers(swap_listing_id);
CREATE INDEX idx_swap_offers_offerer_id ON public.swap_offers(offerer_id);
CREATE INDEX idx_swap_offers_status ON public.swap_offers(status);