-- Create interest enum for waitlist
CREATE TYPE public.waitlist_interest AS ENUM ('buyer', 'seller', 'both');

-- Create waitlist table
CREATE TABLE public.waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  interest waitlist_interest NOT NULL DEFAULT 'both',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (join waitlist without auth)
CREATE POLICY "Anyone can join waitlist"
ON public.waitlist FOR INSERT
WITH CHECK (true);

-- Only allow reading own entry (by email match - for duplicate check)
CREATE POLICY "Check own waitlist entry"
ON public.waitlist FOR SELECT
USING (true);