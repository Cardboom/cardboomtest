-- Create instant sale requests table for admin approval workflow
CREATE TABLE public.instant_sale_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  condition TEXT NOT NULL,
  claimed_market_price DECIMAL(12, 2) NOT NULL,
  verified_market_price DECIMAL(12, 2), -- Admin can set this after verification
  instant_price DECIMAL(12, 2) NOT NULL, -- 80% of claimed price initially
  final_payout DECIMAL(12, 2), -- Admin sets this after verification
  image_url TEXT,
  shipping_tracking TEXT,
  shipping_carrier TEXT,
  status TEXT NOT NULL DEFAULT 'pending_shipment' CHECK (status IN ('pending_shipment', 'shipped', 'received', 'verified', 'approved', 'rejected', 'paid')),
  rejection_reason TEXT,
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  shipped_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  ledger_entry_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.instant_sale_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own instant sale requests"
ON public.instant_sale_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create requests
CREATE POLICY "Users can create instant sale requests"
ON public.instant_sale_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending requests (to add tracking)
CREATE POLICY "Users can update own pending requests"
ON public.instant_sale_requests
FOR UPDATE
USING (auth.uid() = user_id AND status IN ('pending_shipment', 'shipped'));

-- Admins can view all requests
CREATE POLICY "Admins can view all instant sale requests"
ON public.instant_sale_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Admins can update all requests
CREATE POLICY "Admins can update all instant sale requests"
ON public.instant_sale_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_instant_sale_requests_updated_at
BEFORE UPDATE ON public.instant_sale_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster queries
CREATE INDEX idx_instant_sale_requests_status ON public.instant_sale_requests(status);
CREATE INDEX idx_instant_sale_requests_user_id ON public.instant_sale_requests(user_id);