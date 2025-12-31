-- ============================================
-- 1. Set Completion Tracker Tables
-- ============================================

-- Table to define sets/collections
CREATE TABLE IF NOT EXISTS public.card_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  series TEXT,
  total_cards INTEGER NOT NULL DEFAULT 0,
  release_date DATE,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to track user's set completion progress
CREATE TABLE IF NOT EXISTS public.set_completion (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  set_id UUID NOT NULL REFERENCES public.card_sets(id) ON DELETE CASCADE,
  owned_cards JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of card identifiers/numbers user owns
  completion_percent NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, set_id)
);

ALTER TABLE public.card_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.set_completion ENABLE ROW LEVEL SECURITY;

-- Anyone can view sets
CREATE POLICY "Anyone can view card sets" ON public.card_sets FOR SELECT USING (true);

-- Users can manage their own set completion
CREATE POLICY "Users can view own set completion" ON public.set_completion FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own set completion" ON public.set_completion FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own set completion" ON public.set_completion FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own set completion" ON public.set_completion FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 2. Auction/Bidding System Tables
-- ============================================

-- Auction listings table
CREATE TABLE IF NOT EXISTS public.auctions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  condition TEXT NOT NULL DEFAULT 'Near Mint',
  image_url TEXT,
  starting_price NUMERIC NOT NULL,
  current_bid NUMERIC,
  reserve_price NUMERIC,
  buy_now_price NUMERIC,
  bid_increment NUMERIC NOT NULL DEFAULT 1,
  bid_count INTEGER NOT NULL DEFAULT 0,
  highest_bidder_id UUID,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'ended', 'sold', 'cancelled')),
  winner_id UUID,
  final_price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Auction bids table
CREATE TABLE IF NOT EXISTS public.auction_bids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  max_bid NUMERIC, -- For auto-bidding
  is_winning BOOLEAN NOT NULL DEFAULT false,
  is_auto_bid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Auction watchers
CREATE TABLE IF NOT EXISTS public.auction_watchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  notify_on_outbid BOOLEAN NOT NULL DEFAULT true,
  notify_before_end BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(auction_id, user_id)
);

ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_watchers ENABLE ROW LEVEL SECURITY;

-- Auction policies
CREATE POLICY "Anyone can view active auctions" ON public.auctions FOR SELECT USING (status IN ('active', 'ended', 'sold'));
CREATE POLICY "Sellers can create auctions" ON public.auctions FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update own auctions" ON public.auctions FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "System can update auctions" ON public.auctions FOR UPDATE USING (true);

-- Auction bid policies
CREATE POLICY "Anyone can view auction bids" ON public.auction_bids FOR SELECT USING (true);
CREATE POLICY "Users can place bids" ON public.auction_bids FOR INSERT WITH CHECK (auth.uid() = bidder_id);

-- Auction watcher policies  
CREATE POLICY "Users can view own watches" ON public.auction_watchers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can watch auctions" ON public.auction_watchers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove watches" ON public.auction_watchers FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 3. Portfolio Value History (for charts)
-- ============================================

CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  total_value NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  item_count INTEGER NOT NULL DEFAULT 0,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_portfolio_snapshots_user_date ON public.portfolio_snapshots(user_id, recorded_at DESC);

ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own snapshots" ON public.portfolio_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert snapshots" ON public.portfolio_snapshots FOR INSERT WITH CHECK (true);

-- ============================================
-- 4. Push Notification Subscriptions
-- ============================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push subscriptions" ON public.push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 5. Add auction listing type to listings
-- ============================================

-- Add is_auction column to listings if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'is_auction') THEN
    ALTER TABLE public.listings ADD COLUMN is_auction BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- ============================================
-- 6. Seed some sample card sets
-- ============================================

INSERT INTO public.card_sets (name, category, series, total_cards, release_date) VALUES
  ('Base Set', 'pokemon', '1st Generation', 102, '1999-01-09'),
  ('Jungle', 'pokemon', '1st Generation', 64, '1999-06-16'),
  ('Fossil', 'pokemon', '1st Generation', 62, '1999-10-10'),
  ('Base Set 2', 'pokemon', '1st Generation', 130, '2000-02-24'),
  ('Team Rocket', 'pokemon', '1st Generation', 83, '2000-04-24'),
  ('Gym Heroes', 'pokemon', 'Gym', 132, '2000-08-14'),
  ('Neo Genesis', 'pokemon', 'Neo', 111, '2000-12-16'),
  ('Sword & Shield Base', 'pokemon', 'Sword & Shield', 216, '2020-02-07'),
  ('Evolving Skies', 'pokemon', 'Sword & Shield', 237, '2021-08-27'),
  ('Scarlet & Violet Base', 'pokemon', 'Scarlet & Violet', 198, '2023-03-31'),
  ('Legend of Blue Eyes White Dragon', 'yugioh', 'Original', 126, '2002-03-08'),
  ('Metal Raiders', 'yugioh', 'Original', 144, '2002-06-26'),
  ('The First Chapter', 'lorcana', 'Original', 204, '2023-08-18'),
  ('Rise of the Floodborn', 'lorcana', 'Original', 204, '2023-11-17'),
  ('OP01 Romance Dawn', 'onepiece', 'Original', 121, '2022-07-22'),
  ('OP02 Paramount War', 'onepiece', 'Original', 121, '2022-11-04')
ON CONFLICT DO NOTHING;