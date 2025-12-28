-- Add is_fan_account flag to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_fan_account boolean DEFAULT false;

-- Create profile reviews table for trustworthiness ratings
CREATE TABLE public.profile_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reviewer_id uuid NOT NULL,
  reviewed_user_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  transaction_type text NOT NULL DEFAULT 'purchase', -- 'purchase', 'sale', 'trade'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_review_per_order UNIQUE (reviewer_id, reviewed_user_id, order_id)
);

-- Add trust rating columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trust_rating numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS trust_review_count integer DEFAULT 0;

-- Enable RLS
ALTER TABLE public.profile_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view profile reviews"
ON public.profile_reviews FOR SELECT
USING (true);

CREATE POLICY "Users can create reviews for completed transactions"
ON public.profile_reviews FOR INSERT
WITH CHECK (
  auth.uid() = reviewer_id 
  AND reviewer_id != reviewed_user_id
  AND (
    order_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM orders o 
      WHERE o.id = order_id 
      AND o.status = 'completed'
      AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  )
);

CREATE POLICY "Users can update own reviews"
ON public.profile_reviews FOR UPDATE
USING (auth.uid() = reviewer_id);

CREATE POLICY "Users can delete own reviews"
ON public.profile_reviews FOR DELETE
USING (auth.uid() = reviewer_id);

-- Function to update profile trust rating
CREATE OR REPLACE FUNCTION public.update_profile_trust_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the reviewed user's trust rating
  UPDATE public.profiles
  SET 
    trust_rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM public.profile_reviews
      WHERE reviewed_user_id = COALESCE(NEW.reviewed_user_id, OLD.reviewed_user_id)
    ),
    trust_review_count = (
      SELECT COUNT(*)
      FROM public.profile_reviews
      WHERE reviewed_user_id = COALESCE(NEW.reviewed_user_id, OLD.reviewed_user_id)
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.reviewed_user_id, OLD.reviewed_user_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-update trust rating
CREATE TRIGGER update_trust_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.profile_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_profile_trust_rating();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profile_reviews_reviewed_user ON public.profile_reviews(reviewed_user_id);
CREATE INDEX IF NOT EXISTS idx_profile_reviews_reviewer ON public.profile_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_fan_account ON public.profiles(is_fan_account) WHERE is_fan_account = true;