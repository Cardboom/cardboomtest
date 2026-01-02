-- Buy Orders / Instant Offers table
CREATE TABLE public.buy_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id),
  market_item_id UUID REFERENCES public.market_items(id),
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  condition TEXT,
  grade TEXT,
  max_price NUMERIC NOT NULL CHECK (max_price > 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  filled_quantity INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'partially_filled', 'filled', 'cancelled', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Buy order fills (when seller accepts)
CREATE TABLE public.buy_order_fills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buy_order_id UUID NOT NULL REFERENCES public.buy_orders(id),
  seller_id UUID NOT NULL REFERENCES public.profiles(id),
  listing_id UUID REFERENCES public.listings(id),
  order_id UUID REFERENCES public.orders(id),
  fill_price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Seller trust scores table (cached calculations)
CREATE TABLE public.seller_trust_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id),
  overall_score NUMERIC NOT NULL DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 100),
  delivery_speed_score NUMERIC DEFAULT 0,
  dispute_rate_score NUMERIC DEFAULT 0,
  graded_ratio_score NUMERIC DEFAULT 0,
  volume_score NUMERIC DEFAULT 0,
  response_time_score NUMERIC DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  avg_delivery_days NUMERIC DEFAULT 0,
  dispute_rate NUMERIC DEFAULT 0,
  graded_sales_ratio NUMERIC DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'new' CHECK (tier IN ('new', 'bronze', 'silver', 'gold', 'platinum', 'diamond')),
  badge_earned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Creator storefronts
CREATE TABLE public.creator_storefronts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL UNIQUE REFERENCES public.creator_profiles(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  theme_color TEXT DEFAULT '#8B5CF6',
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  total_sales INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  follower_count INTEGER DEFAULT 0,
  featured_items UUID[] DEFAULT '{}',
  social_links JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Escrow tracking for orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS escrow_status TEXT DEFAULT 'pending' CHECK (escrow_status IN ('pending', 'funds_locked', 'shipped', 'delivered', 'released', 'disputed', 'refunded'));
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS escrow_locked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS escrow_released_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ship_by_deadline TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_deadline TIMESTAMP WITH TIME ZONE;

-- Enable RLS
ALTER TABLE public.buy_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buy_order_fills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_storefronts ENABLE ROW LEVEL SECURITY;

-- Buy Orders policies
CREATE POLICY "Anyone can view active buy orders" ON public.buy_orders FOR SELECT USING (status = 'active' OR buyer_id = auth.uid());
CREATE POLICY "Users can create buy orders" ON public.buy_orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Users can update own buy orders" ON public.buy_orders FOR UPDATE USING (auth.uid() = buyer_id);
CREATE POLICY "Users can delete own buy orders" ON public.buy_orders FOR DELETE USING (auth.uid() = buyer_id);

-- Buy Order Fills policies
CREATE POLICY "Participants can view fills" ON public.buy_order_fills FOR SELECT USING (
  seller_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM buy_orders bo WHERE bo.id = buy_order_id AND bo.buyer_id = auth.uid())
);
CREATE POLICY "Sellers can create fills" ON public.buy_order_fills FOR INSERT WITH CHECK (auth.uid() = seller_id);

-- Seller Trust Scores policies
CREATE POLICY "Anyone can view trust scores" ON public.seller_trust_scores FOR SELECT USING (true);
CREATE POLICY "System can manage trust scores" ON public.seller_trust_scores FOR ALL USING (true) WITH CHECK (true);

-- Creator Storefronts policies
CREATE POLICY "Anyone can view active storefronts" ON public.creator_storefronts FOR SELECT USING (is_active = true);
CREATE POLICY "Owners can manage storefronts" ON public.creator_storefronts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_buy_orders_status ON public.buy_orders(status) WHERE status = 'active';
CREATE INDEX idx_buy_orders_category ON public.buy_orders(category);
CREATE INDEX idx_buy_orders_market_item ON public.buy_orders(market_item_id) WHERE market_item_id IS NOT NULL;
CREATE INDEX idx_seller_trust_scores_tier ON public.seller_trust_scores(tier);
CREATE INDEX idx_creator_storefronts_slug ON public.creator_storefronts(slug);

-- Trigger for updated_at
CREATE TRIGGER update_buy_orders_updated_at BEFORE UPDATE ON public.buy_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_seller_trust_scores_updated_at BEFORE UPDATE ON public.seller_trust_scores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_creator_storefronts_updated_at BEFORE UPDATE ON public.creator_storefronts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate seller trust score
CREATE OR REPLACE FUNCTION calculate_seller_trust_score(p_seller_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total_sales INTEGER;
  v_avg_delivery NUMERIC;
  v_dispute_rate NUMERIC;
  v_graded_ratio NUMERIC;
  v_delivery_score NUMERIC;
  v_dispute_score NUMERIC;
  v_graded_score NUMERIC;
  v_volume_score NUMERIC;
  v_overall_score NUMERIC;
  v_tier TEXT;
BEGIN
  -- Get total completed sales
  SELECT COUNT(*) INTO v_total_sales
  FROM orders WHERE seller_id = p_seller_id AND status = 'completed';
  
  -- Calculate average delivery time (days between created and shipped)
  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (shipped_at - created_at)) / 86400), 0)
  INTO v_avg_delivery
  FROM orders WHERE seller_id = p_seller_id AND status = 'completed' AND shipped_at IS NOT NULL;
  
  -- Calculate dispute rate
  SELECT COALESCE(
    (SELECT COUNT(*)::NUMERIC FROM orders WHERE seller_id = p_seller_id AND status = 'disputed') /
    NULLIF(v_total_sales, 0), 0
  ) INTO v_dispute_rate;
  
  -- Calculate graded cards ratio
  SELECT COALESCE(
    (SELECT COUNT(*)::NUMERIC FROM orders o 
     JOIN listings l ON o.listing_id = l.id 
     WHERE o.seller_id = p_seller_id AND l.grade IS NOT NULL) /
    NULLIF(v_total_sales, 0), 0
  ) INTO v_graded_ratio;
  
  -- Calculate component scores (0-100)
  v_delivery_score := GREATEST(0, 100 - (v_avg_delivery * 10)); -- Faster = better
  v_dispute_score := (1 - v_dispute_rate) * 100; -- Lower dispute = better
  v_graded_score := v_graded_ratio * 100;
  v_volume_score := LEAST(100, v_total_sales * 2); -- Cap at 50 sales = 100
  
  -- Calculate overall score (weighted average)
  v_overall_score := (v_delivery_score * 0.3) + (v_dispute_score * 0.35) + (v_graded_score * 0.15) + (v_volume_score * 0.2);
  
  -- Determine tier
  v_tier := CASE
    WHEN v_total_sales < 5 THEN 'new'
    WHEN v_overall_score >= 95 THEN 'diamond'
    WHEN v_overall_score >= 85 THEN 'platinum'
    WHEN v_overall_score >= 70 THEN 'gold'
    WHEN v_overall_score >= 50 THEN 'silver'
    ELSE 'bronze'
  END;
  
  -- Upsert trust score
  INSERT INTO seller_trust_scores (
    seller_id, overall_score, delivery_speed_score, dispute_rate_score, 
    graded_ratio_score, volume_score, total_sales, avg_delivery_days,
    dispute_rate, graded_sales_ratio, tier
  ) VALUES (
    p_seller_id, v_overall_score, v_delivery_score, v_dispute_score,
    v_graded_score, v_volume_score, v_total_sales, v_avg_delivery,
    v_dispute_rate, v_graded_ratio, v_tier
  )
  ON CONFLICT (seller_id) DO UPDATE SET
    overall_score = EXCLUDED.overall_score,
    delivery_speed_score = EXCLUDED.delivery_speed_score,
    dispute_rate_score = EXCLUDED.dispute_rate_score,
    graded_ratio_score = EXCLUDED.graded_ratio_score,
    volume_score = EXCLUDED.volume_score,
    total_sales = EXCLUDED.total_sales,
    avg_delivery_days = EXCLUDED.avg_delivery_days,
    dispute_rate = EXCLUDED.dispute_rate,
    graded_sales_ratio = EXCLUDED.graded_sales_ratio,
    tier = EXCLUDED.tier,
    updated_at = now();
  
  RETURN v_overall_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;