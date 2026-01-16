-- Create quick_sell_offers table to track instant buy requests
CREATE TABLE public.quick_sell_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_item_id UUID NOT NULL REFERENCES public.vault_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  market_price NUMERIC(12,2) NOT NULL,
  offer_price NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'paid', 'cancelled')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  transaction_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add quick sell fields to vault_items
ALTER TABLE public.vault_items 
ADD COLUMN IF NOT EXISTS quick_sell_requested BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS quick_sell_offer_price NUMERIC(12,2);

-- Enable RLS
ALTER TABLE public.quick_sell_offers ENABLE ROW LEVEL SECURITY;

-- Users can view their own quick sell offers
CREATE POLICY "Users can view own quick sell offers"
ON public.quick_sell_offers
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create quick sell offers for their own vault items
CREATE POLICY "Users can create quick sell offers"
ON public.quick_sell_offers
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.vault_items 
    WHERE id = vault_item_id AND owner_id = auth.uid()
  )
);

-- Users can cancel their own pending offers
CREATE POLICY "Users can update own pending offers"
ON public.quick_sell_offers
FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending_review');

-- Create index for faster lookups
CREATE INDEX idx_quick_sell_vault_item ON public.quick_sell_offers(vault_item_id);
CREATE INDEX idx_quick_sell_user ON public.quick_sell_offers(user_id);
CREATE INDEX idx_quick_sell_status ON public.quick_sell_offers(status);

-- Add trigger for updated_at
CREATE TRIGGER update_quick_sell_offers_updated_at
BEFORE UPDATE ON public.quick_sell_offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();