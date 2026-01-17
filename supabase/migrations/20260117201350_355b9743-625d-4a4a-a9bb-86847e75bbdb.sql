-- Add verified coach field to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified_coach BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coach_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coach_verified_by UUID REFERENCES auth.users(id);

-- Add card match requirement to vault_items
ALTER TABLE public.vault_items ADD COLUMN IF NOT EXISTS matched_market_item_id UUID REFERENCES public.market_items(id);
ALTER TABLE public.vault_items ADD COLUMN IF NOT EXISTS card_match_verified BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.profiles.is_verified_coach IS 'Whether the coach has been verified by admin';
COMMENT ON COLUMN public.vault_items.card_match_verified IS 'Whether the submitted card was matched and verified against catalog';