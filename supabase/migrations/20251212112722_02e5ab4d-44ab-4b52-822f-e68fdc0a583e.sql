-- Create ENUMs for the new features
CREATE TYPE public.card_condition AS ENUM ('raw', 'psa1', 'psa2', 'psa3', 'psa4', 'psa5', 'psa6', 'psa7', 'psa8', 'psa9', 'psa10', 'bgs9', 'bgs9_5', 'bgs10', 'cgc9', 'cgc9_5', 'cgc10');
CREATE TYPE public.liquidity_level AS ENUM ('high', 'medium', 'low');
CREATE TYPE public.offer_status AS ENUM ('pending', 'accepted', 'rejected', 'countered', 'expired', 'cancelled');
CREATE TYPE public.trade_status AS ENUM ('proposed', 'pending_photos', 'photos_submitted', 'pending_confirmation', 'confirmed', 'in_transit', 'completed', 'cancelled', 'disputed');

-- Market items table (for explorer - products/cards)
CREATE TABLE public.market_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  set_name TEXT,
  series TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  character_name TEXT,
  rarity TEXT,
  image_url TEXT,
  base_price NUMERIC NOT NULL DEFAULT 0,
  current_price NUMERIC NOT NULL DEFAULT 0,
  price_24h_ago NUMERIC,
  price_7d_ago NUMERIC,
  price_30d_ago NUMERIC,
  change_24h NUMERIC DEFAULT 0,
  change_7d NUMERIC DEFAULT 0,
  change_30d NUMERIC DEFAULT 0,
  last_sale_price NUMERIC,
  last_sale_at TIMESTAMP WITH TIME ZONE,
  liquidity public.liquidity_level DEFAULT 'low',
  views_24h INTEGER DEFAULT 0,
  views_7d INTEGER DEFAULT 0,
  watchlist_count INTEGER DEFAULT 0,
  sales_count_30d INTEGER DEFAULT 0,
  is_trending BOOLEAN DEFAULT false,
  external_id TEXT,
  data_source TEXT DEFAULT 'cardboom',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- PSA price variations for graded items
CREATE TABLE public.market_item_grades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  market_item_id UUID NOT NULL REFERENCES public.market_items(id) ON DELETE CASCADE,
  grade public.card_condition NOT NULL,
  current_price NUMERIC NOT NULL DEFAULT 0,
  change_24h NUMERIC DEFAULT 0,
  change_7d NUMERIC DEFAULT 0,
  change_30d NUMERIC DEFAULT 0,
  last_sale_price NUMERIC,
  sales_count_30d INTEGER DEFAULT 0,
  avg_days_to_sell NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(market_item_id, grade)
);

-- Item views tracking
CREATE TABLE public.item_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  market_item_id UUID NOT NULL REFERENCES public.market_items(id) ON DELETE CASCADE,
  user_id UUID,
  session_id TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Watchlist
CREATE TABLE public.watchlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  market_item_id UUID NOT NULL REFERENCES public.market_items(id) ON DELETE CASCADE,
  grade public.card_condition,
  target_price NUMERIC,
  notify_on_price_drop BOOLEAN DEFAULT true,
  notify_on_new_listing BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, market_item_id, grade)
);

-- Portfolio items (user's owned cards)
CREATE TABLE public.portfolio_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  market_item_id UUID REFERENCES public.market_items(id),
  custom_name TEXT,
  grade public.card_condition DEFAULT 'raw',
  purchase_price NUMERIC,
  purchase_date DATE,
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  image_url TEXT,
  in_vault BOOLEAN DEFAULT false,
  vault_item_id UUID REFERENCES public.vault_items(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Conversations for messaging
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_1 UUID NOT NULL,
  participant_2 UUID NOT NULL,
  listing_id UUID REFERENCES public.listings(id),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(participant_1, participant_2, listing_id)
);

-- Messages
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_filtered BOOLEAN DEFAULT false,
  filtered_content TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Offers (for bidding system)
CREATE TABLE public.offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  message TEXT,
  status public.offer_status NOT NULL DEFAULT 'pending',
  parent_offer_id UUID REFERENCES public.offers(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trades (card-for-card trades)
CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  initiator_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  status public.trade_status NOT NULL DEFAULT 'proposed',
  initiator_confirmed BOOLEAN DEFAULT false,
  recipient_confirmed BOOLEAN DEFAULT false,
  cash_adjustment NUMERIC DEFAULT 0,
  cash_from_initiator BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trade items (items involved in a trade)
CREATE TABLE public.trade_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  vault_item_id UUID REFERENCES public.vault_items(id),
  portfolio_item_id UUID REFERENCES public.portfolio_items(id),
  description TEXT NOT NULL,
  estimated_value NUMERIC,
  photo_url TEXT,
  photo_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.market_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_item_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_items ENABLE ROW LEVEL SECURITY;

-- Market items: Public read access
CREATE POLICY "Anyone can view market items" ON public.market_items FOR SELECT USING (true);

-- Market item grades: Public read access  
CREATE POLICY "Anyone can view grades" ON public.market_item_grades FOR SELECT USING (true);

-- Item views: Anyone can insert, only system can read
CREATE POLICY "Anyone can log views" ON public.item_views FOR INSERT WITH CHECK (true);

-- Watchlist: Users manage their own
CREATE POLICY "Users can view own watchlist" ON public.watchlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add to watchlist" ON public.watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove from watchlist" ON public.watchlist FOR DELETE USING (auth.uid() = user_id);

-- Portfolio: Users manage their own
CREATE POLICY "Users can view own portfolio" ON public.portfolio_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add to portfolio" ON public.portfolio_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own portfolio" ON public.portfolio_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete from portfolio" ON public.portfolio_items FOR DELETE USING (auth.uid() = user_id);

-- Conversations: Participants only
CREATE POLICY "Participants can view conversations" ON public.conversations FOR SELECT USING (auth.uid() = participant_1 OR auth.uid() = participant_2);
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- Messages: Conversation participants only
CREATE POLICY "Participants can view messages" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid()))
);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND 
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid()))
);

-- Offers: Buyer and seller can view, buyer creates
CREATE POLICY "Participants can view offers" ON public.offers FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Buyers can create offers" ON public.offers FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Participants can update offers" ON public.offers FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Trades: Participants only
CREATE POLICY "Participants can view trades" ON public.trades FOR SELECT USING (auth.uid() = initiator_id OR auth.uid() = recipient_id);
CREATE POLICY "Users can create trades" ON public.trades FOR INSERT WITH CHECK (auth.uid() = initiator_id);
CREATE POLICY "Participants can update trades" ON public.trades FOR UPDATE USING (auth.uid() = initiator_id OR auth.uid() = recipient_id);

-- Trade items: Trade participants only
CREATE POLICY "Participants can view trade items" ON public.trade_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.trades t WHERE t.id = trade_id AND (t.initiator_id = auth.uid() OR t.recipient_id = auth.uid()))
);
CREATE POLICY "Participants can add trade items" ON public.trade_items FOR INSERT WITH CHECK (
  auth.uid() = owner_id AND
  EXISTS (SELECT 1 FROM public.trades t WHERE t.id = trade_id AND (t.initiator_id = auth.uid() OR t.recipient_id = auth.uid()))
);

-- Enable realtime for messages and offers
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;

-- Create indexes for performance
CREATE INDEX idx_market_items_category ON public.market_items(category);
CREATE INDEX idx_market_items_trending ON public.market_items(is_trending) WHERE is_trending = true;
CREATE INDEX idx_market_items_change_24h ON public.market_items(change_24h DESC);
CREATE INDEX idx_item_views_item ON public.item_views(market_item_id);
CREATE INDEX idx_item_views_recent ON public.item_views(viewed_at DESC);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_offers_listing ON public.offers(listing_id);
CREATE INDEX idx_portfolio_user ON public.portfolio_items(user_id);
CREATE INDEX idx_watchlist_user ON public.watchlist(user_id);

-- Trigger to update market_items updated_at
CREATE TRIGGER update_market_items_updated_at BEFORE UPDATE ON public.market_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_portfolio_items_updated_at BEFORE UPDATE ON public.portfolio_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON public.trades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();