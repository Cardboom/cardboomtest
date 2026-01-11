-- Add 2FA fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS two_factor_phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS two_factor_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS remember_me_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS remember_me_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_categories TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_games TEXT[] DEFAULT '{}';

-- Create 2FA verification codes table
CREATE TABLE IF NOT EXISTS public.two_factor_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT '2fa_login',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '5 minutes'),
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.two_factor_codes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own codes (service role handles creation)
CREATE POLICY "Users can view own 2FA codes"
  ON public.two_factor_codes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_two_factor_codes_user_phone ON public.two_factor_codes(user_id, phone, type);
CREATE INDEX IF NOT EXISTS idx_two_factor_codes_expires ON public.two_factor_codes(expires_at);

-- Cleanup expired codes (will be called by a cron job)
CREATE OR REPLACE FUNCTION public.cleanup_expired_2fa_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.two_factor_codes WHERE expires_at < now();
END;
$$;