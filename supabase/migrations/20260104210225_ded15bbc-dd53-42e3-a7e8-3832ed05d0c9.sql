-- Add admin adjustment types to transaction_type enum
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'admin_credit';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'admin_debit';