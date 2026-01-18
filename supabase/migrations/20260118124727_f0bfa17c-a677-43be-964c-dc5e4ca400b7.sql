-- Table to track creator content views for rewards
CREATE TABLE IF NOT EXISTS public.creator_content_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  viewer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('profile', 'pick', 'reel', 'post')),
  content_id UUID,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_hash TEXT,
  is_unique_daily BOOLEAN DEFAULT true
);

-- Index for efficient querying
CREATE INDEX idx_creator_views_creator_date ON creator_content_views(creator_id, viewed_at);
CREATE INDEX idx_creator_views_viewer ON creator_content_views(viewer_user_id) WHERE viewer_user_id IS NOT NULL;

-- Enable RLS
ALTER TABLE creator_content_views ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert views (for tracking)
CREATE POLICY "Anyone can track views" ON creator_content_views FOR INSERT WITH CHECK (true);

-- Policy: Creators can view their own analytics
CREATE POLICY "Creators can view their stats" ON creator_content_views FOR SELECT
  USING (creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid()));

-- Table for creator view rewards (payouts)
CREATE TABLE IF NOT EXISTS public.creator_view_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_views BIGINT NOT NULL DEFAULT 0,
  unique_viewer_views BIGINT NOT NULL DEFAULT 0,
  reward_gems INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE creator_view_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view their rewards" ON creator_view_rewards FOR SELECT
  USING (creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid()));

-- Add likes/comments tracking columns to creator_profiles if not exists
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS total_likes INTEGER DEFAULT 0;
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS total_comments INTEGER DEFAULT 0;

-- Add view count to creator_picks for individual pick insights
ALTER TABLE creator_picks ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE creator_picks ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
ALTER TABLE creator_picks ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;