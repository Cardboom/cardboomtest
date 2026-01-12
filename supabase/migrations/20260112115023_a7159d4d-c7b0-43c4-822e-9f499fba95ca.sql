-- Add card_label column for custom card names
ALTER TABLE public.saved_cards 
ADD COLUMN IF NOT EXISTS card_label TEXT;

-- Add an index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_saved_cards_user_id ON public.saved_cards(user_id);

-- Update RLS policies to ensure users can only see and manage their own cards
DROP POLICY IF EXISTS "Users can view their own saved cards" ON public.saved_cards;
DROP POLICY IF EXISTS "Users can insert their own saved cards" ON public.saved_cards;
DROP POLICY IF EXISTS "Users can update their own saved cards" ON public.saved_cards;
DROP POLICY IF EXISTS "Users can delete their own saved cards" ON public.saved_cards;

CREATE POLICY "Users can view their own saved cards" 
ON public.saved_cards 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved cards" 
ON public.saved_cards 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved cards" 
ON public.saved_cards 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved cards" 
ON public.saved_cards 
FOR DELETE 
USING (auth.uid() = user_id);