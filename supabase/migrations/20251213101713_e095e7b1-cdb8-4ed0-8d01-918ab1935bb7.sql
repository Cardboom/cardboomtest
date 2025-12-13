-- Add guru_expertise column to profiles table for storing collection expertise
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS guru_expertise text[] DEFAULT '{}'::text[];

-- Add custom_guru column for free text expertise
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_guru text DEFAULT NULL;

-- Add is_id_verified column for profile verification
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_id_verified boolean DEFAULT false;

-- Add id_document_url column for storing the national ID document
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_document_url text DEFAULT NULL;