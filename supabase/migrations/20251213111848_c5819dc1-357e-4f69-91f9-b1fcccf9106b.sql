-- Create bids table for users to place bids on items even if no one is selling
CREATE TABLE public.bids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  market_item_id UUID REFERENCES public.market_items(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  bid_amount NUMERIC NOT NULL,
  max_bid NUMERIC,
  grade TEXT DEFAULT 'any',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'matched', 'cancelled', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tournament_entries table for the monthly tournament
CREATE TABLE public.tournament_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tournament_month TEXT NOT NULL, -- Format: YYYY-MM
  volume_amount NUMERIC NOT NULL DEFAULT 0,
  cards_sold INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  prize_won NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tournament_month)
);

-- Enable RLS
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for bids
CREATE POLICY "Anyone can view active bids" ON public.bids
  FOR SELECT USING (status = 'active');

CREATE POLICY "Users can create bids" ON public.bids
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their bids" ON public.bids
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can cancel their bids" ON public.bids
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for tournament_entries
CREATE POLICY "Anyone can view tournament entries" ON public.tournament_entries
  FOR SELECT USING (true);

CREATE POLICY "System can insert tournament entries" ON public.tournament_entries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update tournament entries" ON public.tournament_entries
  FOR UPDATE USING (true);

-- Create indexes
CREATE INDEX idx_bids_market_item ON public.bids(market_item_id);
CREATE INDEX idx_bids_user ON public.bids(user_id);
CREATE INDEX idx_bids_status ON public.bids(status);
CREATE INDEX idx_tournament_month ON public.tournament_entries(tournament_month);
CREATE INDEX idx_tournament_volume ON public.tournament_entries(volume_amount DESC);