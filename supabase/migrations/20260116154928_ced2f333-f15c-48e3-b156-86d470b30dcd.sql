-- Add payment_method column to quick_sell_offers table
ALTER TABLE public.quick_sell_offers 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'gems' CHECK (payment_method IN ('gems', 'cash'));