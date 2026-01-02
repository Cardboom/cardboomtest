-- Add AI analysis columns to support_tickets
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS ai_analysis JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_suggested_priority TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_suggested_category TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_draft_response TEXT DEFAULT NULL;

-- Add AI analysis columns to order_disputes
ALTER TABLE public.order_disputes 
ADD COLUMN IF NOT EXISTS ai_analysis JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_summary TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_recommendation TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_confidence_score NUMERIC DEFAULT NULL;

-- Add AI quality columns to listings
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS ai_quality_score INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_flags TEXT[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_analysis JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_checked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add AI columns to listing_reports
ALTER TABLE public.listing_reports 
ADD COLUMN IF NOT EXISTS ai_analysis JSONB DEFAULT NULL;

-- Create index for AI-flagged listings
CREATE INDEX IF NOT EXISTS idx_listings_ai_quality ON public.listings(ai_quality_score) WHERE ai_quality_score IS NOT NULL;