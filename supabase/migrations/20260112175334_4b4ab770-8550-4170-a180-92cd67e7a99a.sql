-- Fix Security Definer View: Recreate card_donation_totals as SECURITY INVOKER
DROP VIEW IF EXISTS public.card_donation_totals;

CREATE VIEW public.card_donation_totals 
WITH (security_invoker = true)
AS
SELECT 
  COALESCE(card_instance_id::text, listing_id::text, market_item_id::text) as target_id,
  card_instance_id,
  listing_id,
  market_item_id,
  owner_user_id,
  SUM(amount_cents) FILTER (WHERE status = 'pending') as total_pending_cents,
  SUM(amount_cents) FILTER (WHERE status = 'applied') as total_applied_cents,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count
FROM public.grading_donations
GROUP BY card_instance_id, listing_id, market_item_id, owner_user_id;