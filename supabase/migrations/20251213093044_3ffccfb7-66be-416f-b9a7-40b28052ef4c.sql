-- Add profile customization fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_background text DEFAULT 'default',
ADD COLUMN IF NOT EXISTS is_beta_tester boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS badges jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS title text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS showcase_items uuid[] DEFAULT '{}';

-- Create profile_backgrounds catalog table
CREATE TABLE public.profile_backgrounds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'solid', -- solid, gradient, animated, special
  css_value text NOT NULL,
  unlock_level integer DEFAULT 1,
  xp_cost integer DEFAULT 0,
  is_premium boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_backgrounds ENABLE ROW LEVEL SECURITY;

-- Anyone can view backgrounds
CREATE POLICY "Anyone can view backgrounds" 
ON public.profile_backgrounds 
FOR SELECT 
USING (true);

-- Insert default backgrounds
INSERT INTO public.profile_backgrounds (name, type, css_value, unlock_level, xp_cost, is_premium) VALUES
('Default', 'solid', 'hsl(240, 10%, 4%)', 1, 0, false),
('Midnight Blue', 'gradient', 'linear-gradient(135deg, hsl(220, 60%, 15%) 0%, hsl(240, 40%, 8%) 100%)', 1, 0, false),
('Ocean Depths', 'gradient', 'linear-gradient(180deg, hsl(200, 80%, 20%) 0%, hsl(220, 60%, 10%) 100%)', 3, 100, false),
('Sunset Glow', 'gradient', 'linear-gradient(135deg, hsl(20, 80%, 25%) 0%, hsl(340, 60%, 15%) 100%)', 5, 250, false),
('Forest Night', 'gradient', 'linear-gradient(180deg, hsl(140, 50%, 15%) 0%, hsl(160, 40%, 8%) 100%)', 7, 400, false),
('Royal Purple', 'gradient', 'linear-gradient(135deg, hsl(280, 60%, 25%) 0%, hsl(260, 50%, 10%) 100%)', 10, 750, false),
('Crimson Fire', 'gradient', 'linear-gradient(180deg, hsl(0, 70%, 25%) 0%, hsl(20, 60%, 10%) 100%)', 15, 1000, false),
('Golden Hour', 'gradient', 'linear-gradient(135deg, hsl(45, 80%, 30%) 0%, hsl(30, 60%, 15%) 100%)', 20, 1500, false),
('Neon Dreams', 'animated', 'linear-gradient(270deg, hsl(280, 100%, 30%), hsl(200, 100%, 30%), hsl(320, 100%, 30%))', 25, 2500, true),
('Holographic', 'animated', 'linear-gradient(45deg, hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%))', 30, 5000, true);

-- Create user_unlocked_backgrounds table
CREATE TABLE public.user_unlocked_backgrounds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  background_id uuid NOT NULL REFERENCES public.profile_backgrounds(id) ON DELETE CASCADE,
  unlocked_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, background_id)
);

-- Enable RLS
ALTER TABLE public.user_unlocked_backgrounds ENABLE ROW LEVEL SECURITY;

-- Users can view their unlocked backgrounds
CREATE POLICY "Users can view their unlocked backgrounds" 
ON public.user_unlocked_backgrounds 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can unlock backgrounds
CREATE POLICY "Users can unlock backgrounds" 
ON public.user_unlocked_backgrounds 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Mark early signups as beta testers (users who signed up before a certain date or first 1000 users)
-- This would typically be done via a scheduled job or manual update