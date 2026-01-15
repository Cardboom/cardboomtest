-- Add shipping request approval fields to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS shipping_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS shipping_requested_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS buyer_approved_shipping BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS seller_approved_shipping BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS buyer_shipping_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS seller_shipping_approved_at TIMESTAMP WITH TIME ZONE;

-- Add comment explaining the flow
COMMENT ON COLUMN public.orders.shipping_requested_at IS 'When either party requested shipping for this order';
COMMENT ON COLUMN public.orders.shipping_requested_by IS 'User who initiated the shipping request';
COMMENT ON COLUMN public.orders.buyer_approved_shipping IS 'Whether the buyer approved the shipping request';
COMMENT ON COLUMN public.orders.seller_approved_shipping IS 'Whether the seller approved the shipping request';

-- Create index for efficient notification queries
CREATE INDEX IF NOT EXISTS idx_orders_shipping_pending_approval 
ON public.orders(buyer_id, seller_id) 
WHERE shipping_requested_at IS NOT NULL 
AND (buyer_approved_shipping IS NULL OR seller_approved_shipping IS NULL);