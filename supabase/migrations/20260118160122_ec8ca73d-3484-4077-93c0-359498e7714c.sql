-- ==================================================
-- ENGAGEMENT & NOTIFICATION SYSTEM TABLES
-- ==================================================

-- 1. Discussion Subscriptions (thread auto-subscribe with opt-out)
CREATE TABLE IF NOT EXISTS public.discussion_subscriptions (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discussion_id uuid NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  notify_on_reply boolean DEFAULT true,
  notify_on_mention boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, discussion_id)
);

ALTER TABLE public.discussion_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.discussion_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own subscriptions"
  ON public.discussion_subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- 2. Listing Watchers (for "X users watching" + alerts)
CREATE TABLE IF NOT EXISTS public.listing_watchers (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  notify_on_price_change boolean DEFAULT true,
  notify_on_expiry boolean DEFAULT true,
  notify_on_sold boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

ALTER TABLE public.listing_watchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watched listings"
  ON public.listing_watchers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage watched listings"
  ON public.listing_watchers FOR ALL
  USING (auth.uid() = user_id);

-- Public read for watcher counts
CREATE POLICY "Anyone can count watchers"
  ON public.listing_watchers FOR SELECT
  USING (true);

-- 3. Order Status History (immutable audit log)
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  previous_status text,
  changed_by uuid REFERENCES auth.users(id),
  change_reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order participants can view history"
  ON public.order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = order_id 
      AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

-- Prevent updates/deletes for audit integrity
CREATE POLICY "Only insert allowed"
  ON public.order_status_history FOR INSERT
  WITH CHECK (true);

-- 4. Seller Metrics (aggregated reputation stats)
CREATE TABLE IF NOT EXISTS public.seller_metrics (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  seller_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_orders integer DEFAULT 0,
  completed_orders integer DEFAULT 0,
  cancelled_orders integer DEFAULT 0,
  disputed_orders integer DEFAULT 0,
  fulfillment_rate numeric(5,2) DEFAULT 100.0,
  avg_ship_time_hours numeric(8,2),
  avg_response_time_hours numeric(8,2),
  dispute_rate numeric(5,4) DEFAULT 0.0,
  total_reviews integer DEFAULT 0,
  avg_rating numeric(3,2) DEFAULT 0.0,
  last_calculated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.seller_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seller metrics are public"
  ON public.seller_metrics FOR SELECT
  USING (true);

CREATE POLICY "System can update metrics"
  ON public.seller_metrics FOR ALL
  USING (auth.uid() = seller_id);

-- 5. Seller/Set Watchers (watch sellers and sets for new listings)
CREATE TABLE IF NOT EXISTS public.seller_watchers (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_on_new_listing boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, seller_id)
);

ALTER TABLE public.seller_watchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage seller watches"
  ON public.seller_watchers FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Sellers can see who watches them"
  ON public.seller_watchers FOR SELECT
  USING (auth.uid() = seller_id);

-- 6. Set Watchers
CREATE TABLE IF NOT EXISTS public.set_watchers (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  set_name text NOT NULL,
  category text NOT NULL,
  notify_on_new_listing boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, set_name, category)
);

ALTER TABLE public.set_watchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage set watches"
  ON public.set_watchers FOR ALL
  USING (auth.uid() = user_id);

-- 7. Notification Preferences Enhancement (category-based)
ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS thread_replies boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS thread_mentions boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS listing_watched boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS seller_new_listing boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS order_updates boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS price_changes boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS expiring_listings boolean DEFAULT true;

-- 8. Add mention tracking to discussion_comments
ALTER TABLE public.discussion_comments
ADD COLUMN IF NOT EXISTS mentioned_user_ids uuid[] DEFAULT '{}';

-- 9. Listing views tracking for smart selling
CREATE TABLE IF NOT EXISTS public.listing_analytics (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  view_date date NOT NULL DEFAULT CURRENT_DATE,
  view_count integer DEFAULT 0,
  unique_viewers integer DEFAULT 0,
  offer_count integer DEFAULT 0,
  watchlist_adds integer DEFAULT 0,
  UNIQUE(listing_id, view_date)
);

ALTER TABLE public.listing_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view own listing analytics"
  ON public.listing_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l 
      WHERE l.id = listing_id AND l.seller_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can increment views"
  ON public.listing_analytics FOR ALL
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_discussion_subs_user ON public.discussion_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_discussion_subs_discussion ON public.discussion_subscriptions(discussion_id);
CREATE INDEX IF NOT EXISTS idx_listing_watchers_listing ON public.listing_watchers(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_watchers_user ON public.listing_watchers(user_id);
CREATE INDEX IF NOT EXISTS idx_order_history_order ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_seller_metrics_seller ON public.seller_metrics(seller_id);
CREATE INDEX IF NOT EXISTS idx_listing_analytics_listing ON public.listing_analytics(listing_id);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.listing_watchers;