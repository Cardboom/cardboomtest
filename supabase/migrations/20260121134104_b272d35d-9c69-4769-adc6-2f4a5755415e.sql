-- Add first_name and last_name columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Also ensure notify_new_login and notify_new_device columns exist (for login notifications)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notify_new_login BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_new_device BOOLEAN DEFAULT true;