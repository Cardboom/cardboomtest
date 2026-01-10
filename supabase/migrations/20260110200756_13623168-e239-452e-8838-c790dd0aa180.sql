-- Onboarding checklist progress table
CREATE TABLE public.user_onboarding_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  completed_steps TEXT[] DEFAULT '{}',
  claimed_rewards TEXT[] DEFAULT '{}',
  total_xp_earned INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own onboarding progress"
ON public.user_onboarding_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding progress"
ON public.user_onboarding_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding progress"
ON public.user_onboarding_progress FOR UPDATE
USING (auth.uid() = user_id);

-- Referral leaderboard cache (for fast display)
CREATE TABLE public.referral_leaderboard_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  total_referrals INTEGER DEFAULT 0,
  total_volume NUMERIC DEFAULT 0,
  rank INTEGER,
  tier TEXT DEFAULT 'bronze',
  period TEXT DEFAULT 'all_time',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (public readable)
ALTER TABLE public.referral_leaderboard_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaderboard is publicly readable"
ON public.referral_leaderboard_cache FOR SELECT
USING (true);

-- Trigger for onboarding progress updated_at
CREATE TRIGGER update_user_onboarding_progress_updated_at
BEFORE UPDATE ON public.user_onboarding_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();