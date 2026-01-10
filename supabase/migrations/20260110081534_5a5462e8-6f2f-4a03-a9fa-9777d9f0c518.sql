-- Create saved_cards table for iyzico tokenization
CREATE TABLE IF NOT EXISTS public.saved_cards (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    card_token TEXT NOT NULL,
    card_user_key TEXT NOT NULL,
    last_four TEXT NOT NULL,
    card_brand TEXT,
    card_family TEXT,
    card_bank_name TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_cards ENABLE ROW LEVEL SECURITY;

-- Users can only see their own saved cards
CREATE POLICY "Users can view own saved cards" ON public.saved_cards
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own saved cards
CREATE POLICY "Users can insert own saved cards" ON public.saved_cards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own saved cards
CREATE POLICY "Users can update own saved cards" ON public.saved_cards
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own saved cards
CREATE POLICY "Users can delete own saved cards" ON public.saved_cards
    FOR DELETE USING (auth.uid() = user_id);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_saved_cards_user_id ON public.saved_cards(user_id);