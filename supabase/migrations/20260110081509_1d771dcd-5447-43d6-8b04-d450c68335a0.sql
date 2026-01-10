-- Add grading columns to listings table
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS grading_company TEXT,
ADD COLUMN IF NOT EXISTS grade TEXT;

-- Create index for graded listings lookup
CREATE INDEX IF NOT EXISTS idx_listings_grading ON public.listings(grading_company, grade) WHERE grading_company IS NOT NULL;