-- Drop the foreign key constraint on featured_card_id to allow 
-- featuring cards from any source (portfolio, listings, etc.)
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_featured_card_id_fkey;