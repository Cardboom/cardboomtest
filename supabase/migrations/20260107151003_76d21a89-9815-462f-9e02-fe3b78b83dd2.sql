-- Add buyer and seller confirmation fields to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS buyer_confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS seller_confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS confirmation_deadline TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS admin_escalated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS escalation_reason TEXT DEFAULT NULL;

-- Create admin escalation notifications table
CREATE TABLE IF NOT EXISTS public.order_escalations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  escalation_type TEXT NOT NULL, -- 'buyer_no_confirm', 'seller_no_confirm', 'dispute', 'timeout'
  escalated_by TEXT NOT NULL, -- 'system' or user_id
  reason TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  resolved_by UUID DEFAULT NULL,
  resolution_notes TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on escalations table
ALTER TABLE public.order_escalations ENABLE ROW LEVEL SECURITY;

-- Admins can view all escalations
CREATE POLICY "Admins can view all escalations" ON public.order_escalations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- Admins can update escalations
CREATE POLICY "Admins can update escalations" ON public.order_escalations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- System and admins can insert escalations
CREATE POLICY "System can insert escalations" ON public.order_escalations
  FOR INSERT WITH CHECK (true);

-- Enable realtime for escalations
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_escalations;

-- Add index for quick admin lookup
CREATE INDEX IF NOT EXISTS idx_order_escalations_unresolved ON public.order_escalations(created_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_pending_confirmation ON public.orders(confirmation_deadline) WHERE buyer_confirmed_at IS NULL OR seller_confirmed_at IS NULL;