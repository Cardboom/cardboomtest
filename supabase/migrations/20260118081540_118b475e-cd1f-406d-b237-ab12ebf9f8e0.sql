-- Add scan enforcement columns to vault_items
ALTER TABLE public.vault_items 
ADD COLUMN IF NOT EXISTS scan_session_id UUID,
ADD COLUMN IF NOT EXISTS front_image_url TEXT,
ADD COLUMN IF NOT EXISTS back_image_url TEXT,
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS ai_detected_name TEXT,
ADD COLUMN IF NOT EXISTS ai_detected_set TEXT,
ADD COLUMN IF NOT EXISTS ai_detected_number TEXT,
ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS scan_completed_at TIMESTAMP WITH TIME ZONE;

-- Create vault_scan_sessions table to track scan attempts
CREATE TABLE IF NOT EXISTS public.vault_scan_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  front_image_url TEXT NOT NULL,
  back_image_url TEXT,
  video_url TEXT,
  ai_detected_name TEXT,
  ai_detected_set TEXT,
  ai_detected_number TEXT,
  ai_detected_category TEXT,
  ai_confidence DECIMAL(5,4),
  scan_status TEXT NOT NULL DEFAULT 'pending',
  image_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  vault_item_id UUID REFERENCES public.vault_items(id)
);

-- Enable RLS on vault_scan_sessions
ALTER TABLE public.vault_scan_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only view their own scan sessions
CREATE POLICY "Users can view own scan sessions"
ON public.vault_scan_sessions FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own scan sessions
CREATE POLICY "Users can create own scan sessions"
ON public.vault_scan_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending scan sessions
CREATE POLICY "Users can update own scan sessions"
ON public.vault_scan_sessions FOR UPDATE
USING (auth.uid() = user_id AND scan_status = 'pending');

-- Admins can view all scan sessions
CREATE POLICY "Admins can view all scan sessions"
ON public.vault_scan_sessions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create vault_audit_log table for security tracking
CREATE TABLE IF NOT EXISTS public.vault_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  vault_item_id UUID REFERENCES public.vault_items(id),
  scan_session_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on vault_audit_log - admins only
ALTER TABLE public.vault_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view vault audit log"
ON public.vault_audit_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert vault audit log"
ON public.vault_audit_log FOR INSERT
WITH CHECK (true);

-- Add index for duplicate detection
CREATE INDEX IF NOT EXISTS idx_vault_scan_sessions_image_hash 
ON public.vault_scan_sessions(image_hash) WHERE image_hash IS NOT NULL;

-- Add index for user lookups
CREATE INDEX IF NOT EXISTS idx_vault_scan_sessions_user_id 
ON public.vault_scan_sessions(user_id);

-- Add foreign key from vault_items to scan_sessions
ALTER TABLE public.vault_items
ADD CONSTRAINT fk_vault_items_scan_session
FOREIGN KEY (scan_session_id) REFERENCES public.vault_scan_sessions(id);

-- Update vault_items to add status constraint (via check)
-- Add new status values for the scan flow
COMMENT ON COLUMN public.vault_items.status IS 'Status flow: scanned -> in_transit -> received -> verified -> stored -> released';