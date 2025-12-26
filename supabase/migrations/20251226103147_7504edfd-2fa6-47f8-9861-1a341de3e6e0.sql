-- Create grading order status enum
CREATE TYPE public.grading_order_status AS ENUM (
  'pending_payment',
  'queued',
  'in_review',
  'completed',
  'failed',
  'refunded'
);

-- Create grading orders table
CREATE TABLE public.grading_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  status grading_order_status NOT NULL DEFAULT 'pending_payment',
  
  -- Images
  front_image_url TEXT,
  back_image_url TEXT,
  
  -- Pricing
  price_usd NUMERIC NOT NULL DEFAULT 20,
  
  -- External API
  external_request_id TEXT,
  
  -- Results
  final_grade NUMERIC,
  grade_label TEXT,
  corners_grade NUMERIC,
  edges_grade NUMERIC,
  surface_grade NUMERIC,
  centering_grade NUMERIC,
  overlay_coordinates JSONB,
  grading_notes TEXT,
  confidence NUMERIC,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for user lookups
CREATE INDEX idx_grading_orders_user_id ON public.grading_orders(user_id);
CREATE INDEX idx_grading_orders_status ON public.grading_orders(status);
CREATE INDEX idx_grading_orders_idempotency ON public.grading_orders(idempotency_key);

-- Enable RLS
ALTER TABLE public.grading_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own grading orders"
ON public.grading_orders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own grading orders"
ON public.grading_orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their pending orders"
ON public.grading_orders FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending_payment');

CREATE POLICY "Admins can view all grading orders"
ON public.grading_orders FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all grading orders"
ON public.grading_orders FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_grading_orders_updated_at
BEFORE UPDATE ON public.grading_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create grading storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('grading-images', 'grading-images', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for grading images
CREATE POLICY "Users can view their own grading images"
ON storage.objects FOR SELECT
USING (bucket_id = 'grading-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own grading images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'grading-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own grading images"
ON storage.objects FOR DELETE
USING (bucket_id = 'grading-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add grading_fee transaction type support (the transactions table already exists)
-- We'll use the existing transactions table with type = 'grading_fee'