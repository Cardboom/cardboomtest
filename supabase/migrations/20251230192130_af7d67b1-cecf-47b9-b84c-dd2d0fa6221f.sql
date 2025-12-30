-- Add status column to vault_items for tracking shipment status
ALTER TABLE public.vault_items 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending_shipment',
ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS received_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS tracking_number TEXT;

-- Allow admins to view all vault items
CREATE POLICY "Admins can view all vault items"
ON public.vault_items
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update vault items
CREATE POLICY "Admins can update vault items"
ON public.vault_items
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));