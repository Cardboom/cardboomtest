-- Add metadata column to pending_payments for storing card save preferences
ALTER TABLE public.pending_payments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;