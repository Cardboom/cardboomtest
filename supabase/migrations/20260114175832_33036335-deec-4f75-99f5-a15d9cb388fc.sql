-- Create table to track tweet reward claims
CREATE TABLE public.tweet_reward_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tweet_id TEXT NOT NULL UNIQUE,
  tweet_url TEXT NOT NULL,
  tweet_author_handle TEXT,
  gems_awarded INTEGER NOT NULL DEFAULT 50,
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'awarded'))
);

-- Enable RLS
ALTER TABLE public.tweet_reward_claims ENABLE ROW LEVEL SECURITY;

-- Users can view their own claims
CREATE POLICY "Users can view their own tweet claims"
  ON public.tweet_reward_claims
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own claims
CREATE POLICY "Users can submit tweet claims"
  ON public.tweet_reward_claims
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_tweet_reward_claims_user_id ON public.tweet_reward_claims(user_id);
CREATE INDEX idx_tweet_reward_claims_tweet_id ON public.tweet_reward_claims(tweet_id);
CREATE INDEX idx_tweet_reward_claims_status ON public.tweet_reward_claims(status);