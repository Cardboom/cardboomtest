-- Create table for creator applications
CREATE TABLE public.creator_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_name TEXT NOT NULL,
  email TEXT NOT NULL,
  platform TEXT NOT NULL,
  handle TEXT NOT NULL,
  follower_count TEXT,
  categories TEXT[] DEFAULT '{}',
  bio TEXT,
  portfolio_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'waitlisted')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creator_applications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (submit application)
CREATE POLICY "Anyone can submit creator applications"
  ON public.creator_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can view all applications
CREATE POLICY "Admins can view all applications"
  ON public.creator_applications
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update applications
CREATE POLICY "Admins can update applications"
  ON public.creator_applications
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add updated_at trigger
CREATE TRIGGER update_creator_applications_updated_at
  BEFORE UPDATE ON public.creator_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();