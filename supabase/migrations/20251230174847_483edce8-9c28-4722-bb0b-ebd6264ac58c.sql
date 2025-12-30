-- Create promo_codes table for coupon management
CREATE TABLE public.promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free_shipping', 'bonus_xp')),
  discount_value NUMERIC NOT NULL DEFAULT 0,
  min_order_amount NUMERIC DEFAULT 0,
  max_discount_amount NUMERIC DEFAULT NULL,
  usage_limit INTEGER DEFAULT NULL,
  used_count INTEGER DEFAULT 0,
  per_user_limit INTEGER DEFAULT 1,
  category_restriction TEXT DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create promo_code_uses table to track individual uses
CREATE TABLE public.promo_code_uses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  discount_applied NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create admin_notifications table for bulk messaging
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'pro_users', 'verified_sellers', 'inactive_users', 'new_users', 'custom')),
  target_user_ids UUID[] DEFAULT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  sent_count INTEGER DEFAULT 0,
  is_sent BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create featured_items table for homepage curation
CREATE TABLE public.featured_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  market_item_id UUID REFERENCES public.market_items(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  feature_type TEXT NOT NULL DEFAULT 'homepage' CHECK (feature_type IN ('homepage', 'category_spotlight', 'trending', 'staff_pick', 'deal_of_day')),
  position INTEGER DEFAULT 1,
  featured_until TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  is_sponsored BOOLEAN DEFAULT false,
  sponsor_fee NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create seller_verifications table for KYC management
CREATE TABLE public.seller_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_name TEXT DEFAULT NULL,
  business_type TEXT DEFAULT 'individual' CHECK (business_type IN ('individual', 'business', 'corporation')),
  id_document_url TEXT DEFAULT NULL,
  business_document_url TEXT DEFAULT NULL,
  selfie_url TEXT DEFAULT NULL,
  address_proof_url TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'more_info_needed')),
  rejection_reason TEXT DEFAULT NULL,
  admin_notes TEXT DEFAULT NULL,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create order_disputes table for dispute management
CREATE TABLE public.order_disputes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  opened_by UUID NOT NULL,
  dispute_type TEXT NOT NULL CHECK (dispute_type IN ('item_not_received', 'item_not_as_described', 'damaged_item', 'wrong_item', 'counterfeit', 'other')),
  description TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}',
  seller_response TEXT DEFAULT NULL,
  seller_evidence_urls TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'awaiting_seller', 'awaiting_buyer', 'resolved_buyer_favor', 'resolved_seller_favor', 'resolved_split', 'closed')),
  ruling TEXT DEFAULT NULL,
  refund_amount NUMERIC DEFAULT NULL,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create listing_reports table for moderation
CREATE TABLE public.listing_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('fake', 'counterfeit', 'misleading', 'prohibited', 'duplicate', 'spam', 'inappropriate', 'other')),
  description TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'action_taken', 'dismissed')),
  action_taken TEXT DEFAULT NULL,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for promo_codes
CREATE POLICY "Admins can manage promo codes" ON public.promo_codes
  FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view active promo codes" ON public.promo_codes
  FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- RLS policies for promo_code_uses
CREATE POLICY "Admins can view all promo uses" ON public.promo_code_uses
  FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own promo uses" ON public.promo_code_uses
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert promo uses" ON public.promo_code_uses
  FOR INSERT WITH CHECK (true);

-- RLS policies for admin_notifications
CREATE POLICY "Admins can manage notifications" ON public.admin_notifications
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS policies for featured_items
CREATE POLICY "Admins can manage featured items" ON public.featured_items
  FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view active featured items" ON public.featured_items
  FOR SELECT USING (is_active = true AND (featured_until IS NULL OR featured_until > now()));

-- RLS policies for seller_verifications
CREATE POLICY "Admins can manage verifications" ON public.seller_verifications
  FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own verification" ON public.seller_verifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can submit verification" ON public.seller_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pending verification" ON public.seller_verifications
  FOR UPDATE USING (auth.uid() = user_id AND status IN ('pending', 'more_info_needed'));

-- RLS policies for order_disputes
CREATE POLICY "Admins can manage disputes" ON public.order_disputes
  FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Participants can view disputes" ON public.order_disputes
  FOR SELECT USING (
    auth.uid() = opened_by OR 
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid()))
  );
CREATE POLICY "Participants can open disputes" ON public.order_disputes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid()))
  );
CREATE POLICY "Participants can update disputes" ON public.order_disputes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid()))
  );

-- RLS policies for listing_reports
CREATE POLICY "Admins can manage reports" ON public.listing_reports
  FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can submit reports" ON public.listing_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can view own reports" ON public.listing_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Create indexes for performance
CREATE INDEX idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX idx_promo_codes_active ON public.promo_codes(is_active, expires_at);
CREATE INDEX idx_promo_code_uses_promo ON public.promo_code_uses(promo_code_id);
CREATE INDEX idx_promo_code_uses_user ON public.promo_code_uses(user_id);
CREATE INDEX idx_featured_items_active ON public.featured_items(is_active, featured_until);
CREATE INDEX idx_featured_items_type ON public.featured_items(feature_type);
CREATE INDEX idx_seller_verifications_status ON public.seller_verifications(status);
CREATE INDEX idx_seller_verifications_user ON public.seller_verifications(user_id);
CREATE INDEX idx_order_disputes_status ON public.order_disputes(status);
CREATE INDEX idx_order_disputes_order ON public.order_disputes(order_id);
CREATE INDEX idx_listing_reports_status ON public.listing_reports(status);
CREATE INDEX idx_listing_reports_listing ON public.listing_reports(listing_id);

-- Add trigger for updated_at
CREATE TRIGGER update_promo_codes_updated_at BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_seller_verifications_updated_at BEFORE UPDATE ON public.seller_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_order_disputes_updated_at BEFORE UPDATE ON public.order_disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();