-- Auto-Match Queue table to track pending matches
CREATE TABLE public.auto_match_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_type TEXT NOT NULL CHECK (match_type IN ('buy_order_to_listing', 'listing_to_buy_order')),
  buy_order_id UUID REFERENCES public.buy_orders(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  match_score NUMERIC NOT NULL DEFAULT 0,
  price_match_percent NUMERIC, -- How close the listing price is to buy order max_price
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'notified', 'accepted', 'rejected', 'expired')),
  notified_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(buy_order_id, listing_id)
);

-- Enable RLS
ALTER TABLE public.auto_match_queue ENABLE ROW LEVEL SECURITY;

-- Buyers can see matches for their buy orders
CREATE POLICY "Buyers can view their matches" ON public.auto_match_queue
  FOR SELECT USING (auth.uid() = buyer_id);

-- Sellers can see matches for their listings
CREATE POLICY "Sellers can view their matches" ON public.auto_match_queue
  FOR SELECT USING (auth.uid() = seller_id);

-- Users can update matches they're part of
CREATE POLICY "Users can update their matches" ON public.auto_match_queue
  FOR UPDATE USING (auth.uid() IN (buyer_id, seller_id));

-- System can insert (via trigger)
CREATE POLICY "System can insert matches" ON public.auto_match_queue
  FOR INSERT WITH CHECK (true);

-- Admins can manage all
CREATE POLICY "Admins can manage all matches" ON public.auto_match_queue
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Index for fast lookups
CREATE INDEX idx_auto_match_queue_buy_order ON public.auto_match_queue(buy_order_id) WHERE status = 'pending';
CREATE INDEX idx_auto_match_queue_listing ON public.auto_match_queue(listing_id) WHERE status = 'pending';
CREATE INDEX idx_auto_match_queue_buyer ON public.auto_match_queue(buyer_id, status);
CREATE INDEX idx_auto_match_queue_seller ON public.auto_match_queue(seller_id, status);

-- Function to find and queue matches for a new listing
CREATE OR REPLACE FUNCTION public.find_matches_for_listing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  buy_order RECORD;
  match_score NUMERIC;
  price_match NUMERIC;
BEGIN
  -- Only process active listings
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;

  -- Find matching buy orders
  FOR buy_order IN 
    SELECT bo.* 
    FROM buy_orders bo
    WHERE bo.status = 'active'
      AND bo.category = NEW.category
      AND bo.max_price >= NEW.price
      AND (
        bo.market_item_id IS NULL 
        OR bo.market_item_id = NEW.market_item_id
      )
      AND bo.buyer_id != NEW.seller_id
      AND (bo.expires_at IS NULL OR bo.expires_at > now())
      -- Name match (fuzzy)
      AND (
        LOWER(NEW.title) LIKE '%' || LOWER(SPLIT_PART(bo.item_name, ' ', 1)) || '%'
        OR LOWER(bo.item_name) LIKE '%' || LOWER(SPLIT_PART(NEW.title, ' ', 1)) || '%'
      )
  LOOP
    -- Calculate match score (0-100)
    match_score := 50; -- Base score
    
    -- Exact name match bonus
    IF LOWER(NEW.title) = LOWER(buy_order.item_name) THEN
      match_score := match_score + 30;
    ELSIF LOWER(NEW.title) LIKE '%' || LOWER(buy_order.item_name) || '%' THEN
      match_score := match_score + 20;
    END IF;
    
    -- Price match (how good of a deal for buyer)
    price_match := (1 - (NEW.price / buy_order.max_price)) * 100;
    match_score := match_score + LEAST(20, price_match / 2);
    
    -- Condition match bonus
    IF buy_order.condition IS NOT NULL AND NEW.condition = buy_order.condition THEN
      match_score := match_score + 10;
    END IF;
    
    -- Grade match bonus
    IF buy_order.grade IS NOT NULL AND NEW.grade = buy_order.grade THEN
      match_score := match_score + 10;
    END IF;
    
    -- Insert match into queue (ignore duplicates)
    INSERT INTO auto_match_queue (
      match_type, buy_order_id, listing_id, buyer_id, seller_id,
      match_score, price_match_percent
    ) VALUES (
      'listing_to_buy_order', buy_order.id, NEW.id, buy_order.buyer_id, NEW.seller_id,
      LEAST(100, match_score), price_match
    )
    ON CONFLICT (buy_order_id, listing_id) DO UPDATE SET
      match_score = EXCLUDED.match_score,
      price_match_percent = EXCLUDED.price_match_percent,
      updated_at = now();
    
    -- Create notification for buyer
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      buy_order.buyer_id, 
      'match', 
      'Match Found!',
      'A listing matches your buy order for "' || buy_order.item_name || '" at $' || NEW.price,
      jsonb_build_object(
        'listing_id', NEW.id,
        'buy_order_id', buy_order.id,
        'price', NEW.price,
        'match_score', match_score
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Function to find and queue matches for a new buy order
CREATE OR REPLACE FUNCTION public.find_matches_for_buy_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  listing RECORD;
  match_score NUMERIC;
  price_match NUMERIC;
BEGIN
  -- Only process active buy orders
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;

  -- Find matching listings
  FOR listing IN 
    SELECT l.* 
    FROM listings l
    WHERE l.status = 'active'
      AND l.category = NEW.category
      AND l.price <= NEW.max_price
      AND (
        NEW.market_item_id IS NULL 
        OR l.market_item_id = NEW.market_item_id
      )
      AND l.seller_id != NEW.buyer_id
      -- Name match (fuzzy)
      AND (
        LOWER(l.title) LIKE '%' || LOWER(SPLIT_PART(NEW.item_name, ' ', 1)) || '%'
        OR LOWER(NEW.item_name) LIKE '%' || LOWER(SPLIT_PART(l.title, ' ', 1)) || '%'
      )
  LOOP
    -- Calculate match score (0-100)
    match_score := 50; -- Base score
    
    -- Exact name match bonus
    IF LOWER(listing.title) = LOWER(NEW.item_name) THEN
      match_score := match_score + 30;
    ELSIF LOWER(listing.title) LIKE '%' || LOWER(NEW.item_name) || '%' THEN
      match_score := match_score + 20;
    END IF;
    
    -- Price match (how good of a deal)
    price_match := (1 - (listing.price / NEW.max_price)) * 100;
    match_score := match_score + LEAST(20, price_match / 2);
    
    -- Condition match bonus
    IF NEW.condition IS NOT NULL AND listing.condition = NEW.condition THEN
      match_score := match_score + 10;
    END IF;
    
    -- Grade match bonus
    IF NEW.grade IS NOT NULL AND listing.grade = NEW.grade THEN
      match_score := match_score + 10;
    END IF;
    
    -- Insert match into queue (ignore duplicates)
    INSERT INTO auto_match_queue (
      match_type, buy_order_id, listing_id, buyer_id, seller_id,
      match_score, price_match_percent
    ) VALUES (
      'buy_order_to_listing', NEW.id, listing.id, NEW.buyer_id, listing.seller_id,
      LEAST(100, match_score), price_match
    )
    ON CONFLICT (buy_order_id, listing_id) DO UPDATE SET
      match_score = EXCLUDED.match_score,
      price_match_percent = EXCLUDED.price_match_percent,
      updated_at = now();
    
    -- Create notification for seller
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      listing.seller_id, 
      'match', 
      'Buyer Found!',
      'Someone wants to buy your "' || listing.title || '" for up to $' || NEW.max_price,
      jsonb_build_object(
        'listing_id', listing.id,
        'buy_order_id', NEW.id,
        'max_price', NEW.max_price,
        'match_score', match_score
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER trigger_auto_match_listing
  AFTER INSERT OR UPDATE OF status ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.find_matches_for_listing();

CREATE TRIGGER trigger_auto_match_buy_order
  AFTER INSERT OR UPDATE OF status ON public.buy_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.find_matches_for_buy_order();

-- Add updated_at trigger
CREATE TRIGGER update_auto_match_queue_updated_at
  BEFORE UPDATE ON public.auto_match_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for matches
ALTER PUBLICATION supabase_realtime ADD TABLE public.auto_match_queue;