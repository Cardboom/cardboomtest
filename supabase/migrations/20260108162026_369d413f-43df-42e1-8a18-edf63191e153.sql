-- Create sms_otps table for storing OTP codes
CREATE TABLE public.sms_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('verification', 'password_reset', 'login_otp')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(phone, type)
);

-- Enable RLS
ALTER TABLE public.sms_otps ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (edge functions use service role)
CREATE POLICY "Service role only" ON public.sms_otps
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Add phone_verified columns to profiles if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups
CREATE INDEX idx_sms_otps_phone_type ON public.sms_otps(phone, type);
CREATE INDEX idx_sms_otps_expires_at ON public.sms_otps(expires_at);