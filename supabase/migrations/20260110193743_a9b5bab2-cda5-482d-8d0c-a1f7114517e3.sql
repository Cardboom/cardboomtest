-- =============================================
-- EMAIL DRIP SEQUENCES & ABANDONED CART RECOVERY
-- =============================================

-- Email drip campaigns table
CREATE TABLE IF NOT EXISTS public.email_drip_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- 'signup', 'first_purchase', 'abandoned_cart', 'inactive'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email drip sequences (individual emails in a campaign)
CREATE TABLE IF NOT EXISTS public.email_drip_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.email_drip_campaigns(id) ON DELETE CASCADE,
  sequence_order INTEGER NOT NULL,
  subject TEXT NOT NULL,
  template_key TEXT NOT NULL, -- template identifier
  delay_hours INTEGER NOT NULL DEFAULT 24, -- hours after previous email
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User drip enrollment tracking
CREATE TABLE IF NOT EXISTS public.user_drip_enrollment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_id UUID NOT NULL REFERENCES public.email_drip_campaigns(id),
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  current_sequence INTEGER DEFAULT 1,
  last_email_sent_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'unsubscribed', 'paused'
  UNIQUE(user_id, campaign_id)
);

-- =============================================
-- FIRST PURCHASE DISCOUNT TRACKING
-- =============================================

CREATE TABLE IF NOT EXISTS public.first_purchase_discounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  discount_percent INTEGER DEFAULT 50, -- 50% off commission
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  order_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- UTM ATTRIBUTION TRACKING
-- =============================================

CREATE TABLE IF NOT EXISTS public.utm_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_id TEXT NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  referrer TEXT,
  landing_page TEXT,
  ip_country TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Attribution events (signups, purchases linked to UTM)
CREATE TABLE IF NOT EXISTS public.attribution_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  utm_tracking_id UUID REFERENCES public.utm_tracking(id),
  event_type TEXT NOT NULL, -- 'signup', 'first_purchase', 'subscription', 'listing'
  event_value NUMERIC DEFAULT 0, -- revenue value
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- ABANDONED CART RECOVERY
-- =============================================

CREATE TABLE IF NOT EXISTS public.abandoned_carts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_id TEXT,
  email TEXT,
  listing_id UUID,
  listing_title TEXT,
  listing_price NUMERIC,
  listing_image TEXT,
  cart_data JSONB,
  recovery_email_sent_at TIMESTAMP WITH TIME ZONE,
  recovery_email_count INTEGER DEFAULT 0,
  recovered_at TIMESTAMP WITH TIME ZONE,
  order_id UUID,
  status TEXT DEFAULT 'abandoned', -- 'abandoned', 'recovered', 'expired'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for finding abandoned carts to email
CREATE INDEX idx_abandoned_carts_status ON public.abandoned_carts(status, created_at);
CREATE INDEX idx_abandoned_carts_user ON public.abandoned_carts(user_id);
CREATE INDEX idx_utm_tracking_session ON public.utm_tracking(session_id);
CREATE INDEX idx_attribution_user ON public.attribution_events(user_id);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.email_drip_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_drip_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_drip_enrollment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.first_purchase_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utm_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribution_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;

-- Public read for campaigns (templates)
CREATE POLICY "Anyone can view active campaigns" ON public.email_drip_campaigns
  FOR SELECT USING (is_active = true);

-- Users can see their own enrollment
CREATE POLICY "Users can view own enrollment" ON public.user_drip_enrollment
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own enrollment" ON public.user_drip_enrollment
  FOR UPDATE USING (auth.uid() = user_id);

-- First purchase discounts
CREATE POLICY "Users can view own discount" ON public.first_purchase_discounts
  FOR SELECT USING (auth.uid() = user_id);

-- UTM - users can see their own, service role can insert
CREATE POLICY "Users can view own UTM data" ON public.utm_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert UTM tracking" ON public.utm_tracking
  FOR INSERT WITH CHECK (true);

-- Attribution events
CREATE POLICY "Users can view own attribution" ON public.attribution_events
  FOR SELECT USING (auth.uid() = user_id);

-- Abandoned carts - users can see and update their own
CREATE POLICY "Users can view own abandoned carts" ON public.abandoned_carts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert abandoned cart" ON public.abandoned_carts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own abandoned carts" ON public.abandoned_carts
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- =============================================
-- SEED DEFAULT DRIP CAMPAIGNS
-- =============================================

INSERT INTO public.email_drip_campaigns (name, description, trigger_type, is_active) VALUES
('Welcome Series', 'Onboard new users with tips and platform features', 'signup', true),
('Abandoned Cart Recovery', 'Recover users who left items in cart', 'abandoned_cart', true),
('First Purchase Nudge', 'Encourage first purchase with discount', 'first_purchase', true),
('Re-engagement', 'Win back inactive users', 'inactive', true)
ON CONFLICT DO NOTHING;

-- Seed welcome series sequences
INSERT INTO public.email_drip_sequences (campaign_id, sequence_order, subject, template_key, delay_hours) 
SELECT id, 1, 'Welcome to CardBoom! 🎴 Your TCG journey starts here', 'welcome_1', 0
FROM public.email_drip_campaigns WHERE trigger_type = 'signup'
ON CONFLICT DO NOTHING;

INSERT INTO public.email_drip_sequences (campaign_id, sequence_order, subject, template_key, delay_hours) 
SELECT id, 2, 'Did you know? 5 hidden features on CardBoom', 'welcome_2', 48
FROM public.email_drip_campaigns WHERE trigger_type = 'signup'
ON CONFLICT DO NOTHING;

INSERT INTO public.email_drip_sequences (campaign_id, sequence_order, subject, template_key, delay_hours) 
SELECT id, 3, '🎁 Your exclusive 50% off first purchase commission', 'welcome_3_discount', 72
FROM public.email_drip_campaigns WHERE trigger_type = 'signup'
ON CONFLICT DO NOTHING;

INSERT INTO public.email_drip_sequences (campaign_id, sequence_order, subject, template_key, delay_hours) 
SELECT id, 4, 'Top sellers share their secrets 📈', 'welcome_4', 120
FROM public.email_drip_campaigns WHERE trigger_type = 'signup'
ON CONFLICT DO NOTHING;

-- Seed abandoned cart sequences
INSERT INTO public.email_drip_sequences (campaign_id, sequence_order, subject, template_key, delay_hours) 
SELECT id, 1, 'You left something behind! 👀', 'abandoned_1', 1
FROM public.email_drip_campaigns WHERE trigger_type = 'abandoned_cart'
ON CONFLICT DO NOTHING;

INSERT INTO public.email_drip_sequences (campaign_id, sequence_order, subject, template_key, delay_hours) 
SELECT id, 2, 'Still interested? Your item is waiting', 'abandoned_2', 24
FROM public.email_drip_campaigns WHERE trigger_type = 'abandoned_cart'
ON CONFLICT DO NOTHING;

INSERT INTO public.email_drip_sequences (campaign_id, sequence_order, subject, template_key, delay_hours) 
SELECT id, 3, 'Last chance! Item may sell soon ⚡', 'abandoned_3', 72
FROM public.email_drip_campaigns WHERE trigger_type = 'abandoned_cart'
ON CONFLICT DO NOTHING;