
-- =====================================================
-- PRODUCTION-CRITICAL: INVENTORY & ESCROW SYSTEM
-- =====================================================

-- 1) Create inventory status enum
DO $$ BEGIN
  CREATE TYPE inventory_status AS ENUM (
    'in_vault',
    'listed_for_sale',
    'reserved_checkout',
    'sold_pending',
    'in_verification',
    'verified',
    'verification_failed',
    'shipped',
    'delivered',
    'completed',
    'disputed',
    'refunded',
    'archived'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) Create inventory location enum
DO $$ BEGIN
  CREATE TYPE inventory_location AS ENUM (
    'user_vault',
    'marketplace',
    'grading_facility',
    'verification_hub',
    'in_transit',
    'buyer_received',
    'external'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3) Create sale lane enum
DO $$ BEGIN
  CREATE TYPE sale_lane AS ENUM (
    'instant',
    'escrow_verification'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4) Create card_instances table (CANONICAL SOURCE OF TRUTH)
CREATE TABLE IF NOT EXISTS public.card_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id),
  
  -- Card metadata
  market_item_id uuid REFERENCES public.market_items(id),
  title text NOT NULL,
  category text NOT NULL,
  condition text NOT NULL DEFAULT 'near_mint',
  grade text,
  grading_company text,
  image_url text,
  
  -- Status machine
  status inventory_status NOT NULL DEFAULT 'in_vault',
  location inventory_location NOT NULL DEFAULT 'user_vault',
  is_active boolean NOT NULL DEFAULT true,
  
  -- Lock mechanism
  locked_at timestamp with time zone,
  lock_reason text,
  locked_by_order_id uuid,
  
  -- Value tracking
  current_value numeric NOT NULL DEFAULT 0,
  acquisition_price numeric,
  acquisition_date timestamp with time zone,
  
  -- References
  source_vault_item_id uuid,
  source_listing_id uuid,
  source_grading_order_id uuid,
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);

-- 5) Create escrow_transactions table
CREATE TABLE IF NOT EXISTS public.escrow_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  card_instance_id uuid NOT NULL REFERENCES public.card_instances(id),
  
  -- Parties
  buyer_id uuid NOT NULL REFERENCES auth.users(id),
  seller_id uuid NOT NULL REFERENCES auth.users(id),
  
  -- Amounts
  sale_amount numeric NOT NULL,
  escrow_held numeric NOT NULL,
  marketplace_fee numeric NOT NULL DEFAULT 0,
  verification_fee numeric NOT NULL DEFAULT 0,
  shipping_fee numeric NOT NULL DEFAULT 0,
  seller_payout numeric NOT NULL DEFAULT 0,
  
  -- Lane routing
  sale_lane sale_lane NOT NULL DEFAULT 'escrow_verification',
  lane_reason text,
  
  -- Status tracking
  status text NOT NULL DEFAULT 'pending',
  funds_captured boolean NOT NULL DEFAULT false,
  funds_released boolean NOT NULL DEFAULT false,
  
  -- Verification
  requires_verification boolean NOT NULL DEFAULT true,
  verification_status text,
  verification_notes text,
  verified_by uuid,
  verified_at timestamp with time zone,
  
  -- Delivery
  shipped_at timestamp with time zone,
  delivered_at timestamp with time zone,
  delivery_confirmed_by text,
  auto_confirm_at timestamp with time zone,
  
  -- Payout
  payout_eligible_at timestamp with time zone,
  payout_released_at timestamp with time zone,
  payout_transaction_id uuid,
  
  -- Dispute
  dispute_opened_at timestamp with time zone,
  dispute_reason text,
  dispute_resolved_at timestamp with time zone,
  dispute_outcome text,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 6) Create inventory_audit_log table (FULL AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS public.inventory_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_instance_id uuid NOT NULL,
  
  -- Status transition
  from_status inventory_status,
  to_status inventory_status NOT NULL,
  from_location inventory_location,
  to_location inventory_location,
  
  -- Actor
  actor_user_id uuid,
  actor_type text NOT NULL DEFAULT 'user', -- user, system, admin
  
  -- Related entities
  related_order_id uuid,
  related_listing_id uuid,
  related_escrow_id uuid,
  related_payment_id uuid,
  
  -- Details
  action text NOT NULL,
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 7) Create inventory_integrity_issues table
CREATE TABLE IF NOT EXISTS public.inventory_integrity_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_instance_id uuid,
  
  issue_type text NOT NULL,
  issue_description text NOT NULL,
  severity text NOT NULL DEFAULT 'warning', -- info, warning, critical
  
  detected_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  resolved_by uuid,
  resolution_action text,
  
  auto_repaired boolean DEFAULT false,
  repair_details jsonb
);

-- 8) Add trust/risk fields to profiles if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS seller_trust_score numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS instant_sale_eligible boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS instant_sale_limit numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS risk_flags jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS total_sales_completed integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_sales_value numeric DEFAULT 0;

-- 9) Add escrow fields to orders if not exists
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS card_instance_id uuid,
ADD COLUMN IF NOT EXISTS sale_lane sale_lane,
ADD COLUMN IF NOT EXISTS escrow_transaction_id uuid,
ADD COLUMN IF NOT EXISTS inventory_locked_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS verification_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS payout_status text DEFAULT 'pending';

-- 10) Enable RLS on new tables
ALTER TABLE public.card_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_integrity_issues ENABLE ROW LEVEL SECURITY;

-- 11) RLS Policies for card_instances
CREATE POLICY "Users can view their own card instances"
ON public.card_instances FOR SELECT
USING (auth.uid() = owner_user_id);

CREATE POLICY "Admins can view all card instances"
ON public.card_instances FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own card instances"
ON public.card_instances FOR INSERT
WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "System can update card instances"
ON public.card_instances FOR UPDATE
USING (true);

-- 12) RLS Policies for escrow_transactions
CREATE POLICY "Participants can view their escrow transactions"
ON public.escrow_transactions FOR SELECT
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Admins can view all escrow transactions"
ON public.escrow_transactions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage escrow transactions"
ON public.escrow_transactions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert escrow transactions"
ON public.escrow_transactions FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update escrow transactions"
ON public.escrow_transactions FOR UPDATE
USING (true);

-- 13) RLS Policies for inventory_audit_log
CREATE POLICY "Admins can view all audit logs"
ON public.inventory_audit_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert audit logs"
ON public.inventory_audit_log FOR INSERT
WITH CHECK (true);

-- 14) RLS Policies for inventory_integrity_issues
CREATE POLICY "Admins can manage integrity issues"
ON public.inventory_integrity_issues FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert integrity issues"
ON public.inventory_integrity_issues FOR INSERT
WITH CHECK (true);

-- 15) Create function to lock inventory atomically
CREATE OR REPLACE FUNCTION public.lock_inventory_for_sale(
  p_card_instance_id uuid,
  p_order_id uuid,
  p_actor_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_instance record;
  v_result jsonb;
BEGIN
  -- Lock the row for update
  SELECT * INTO v_instance
  FROM public.card_instances
  WHERE id = p_card_instance_id
  FOR UPDATE NOWAIT;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Card instance not found');
  END IF;
  
  -- Check if already locked or not available
  IF v_instance.locked_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Card already locked for another transaction');
  END IF;
  
  IF v_instance.status NOT IN ('in_vault', 'listed_for_sale') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Card not available for sale: ' || v_instance.status::text);
  END IF;
  
  IF NOT v_instance.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Card instance is not active');
  END IF;
  
  -- Lock the inventory
  UPDATE public.card_instances
  SET 
    status = 'reserved_checkout',
    locked_at = now(),
    lock_reason = 'CHECKOUT',
    locked_by_order_id = p_order_id,
    updated_at = now()
  WHERE id = p_card_instance_id;
  
  -- Log the audit trail
  INSERT INTO public.inventory_audit_log (
    card_instance_id, from_status, to_status, from_location, to_location,
    actor_user_id, actor_type, related_order_id, action, reason
  ) VALUES (
    p_card_instance_id, v_instance.status, 'reserved_checkout', 
    v_instance.location, v_instance.location,
    p_actor_user_id, 'system', p_order_id, 'lock_for_sale', 'Checkout initiated'
  );
  
  RETURN jsonb_build_object('success', true, 'locked_at', now());
EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object('success', false, 'error', 'Card is being processed by another transaction');
END;
$$;

-- 16) Create function to unlock inventory on failure
CREATE OR REPLACE FUNCTION public.unlock_inventory(
  p_card_instance_id uuid,
  p_order_id uuid,
  p_reason text,
  p_actor_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_instance record;
  v_previous_status inventory_status;
BEGIN
  SELECT * INTO v_instance
  FROM public.card_instances
  WHERE id = p_card_instance_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Card instance not found');
  END IF;
  
  -- Determine previous status (default to in_vault if source_listing exists, else in_vault)
  v_previous_status := CASE 
    WHEN v_instance.source_listing_id IS NOT NULL THEN 'listed_for_sale'::inventory_status
    ELSE 'in_vault'::inventory_status
  END;
  
  -- Unlock
  UPDATE public.card_instances
  SET 
    status = v_previous_status,
    locked_at = NULL,
    lock_reason = NULL,
    locked_by_order_id = NULL,
    updated_at = now()
  WHERE id = p_card_instance_id;
  
  -- Log the audit trail
  INSERT INTO public.inventory_audit_log (
    card_instance_id, from_status, to_status, from_location, to_location,
    actor_user_id, actor_type, related_order_id, action, reason
  ) VALUES (
    p_card_instance_id, v_instance.status, v_previous_status, 
    v_instance.location, v_instance.location,
    p_actor_user_id, 'system', p_order_id, 'unlock_inventory', p_reason
  );
  
  RETURN jsonb_build_object('success', true, 'restored_status', v_previous_status);
END;
$$;

-- 17) Create function to route sale to lane
CREATE OR REPLACE FUNCTION public.determine_sale_lane(
  p_seller_id uuid,
  p_card_value numeric,
  p_card_instance_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_seller record;
  v_instance record;
  v_lane sale_lane;
  v_reason text;
  v_instant_limit numeric := 100; -- Default $100 limit
  v_trust_threshold numeric := 80; -- Trust score threshold
BEGIN
  -- Get seller profile
  SELECT * INTO v_seller
  FROM public.profiles
  WHERE id = p_seller_id;
  
  -- Get card instance
  SELECT * INTO v_instance
  FROM public.card_instances
  WHERE id = p_card_instance_id;
  
  -- Default to escrow
  v_lane := 'escrow_verification';
  v_reason := 'Default escrow routing';
  
  -- Check for instant sale eligibility
  IF v_seller.instant_sale_eligible = true 
     AND COALESCE(v_seller.seller_trust_score, 0) >= v_trust_threshold
     AND p_card_value <= COALESCE(v_seller.instant_sale_limit, v_instant_limit)
     AND COALESCE(v_seller.risk_flags, '[]'::jsonb) = '[]'::jsonb
  THEN
    v_lane := 'instant';
    v_reason := 'Seller eligible for instant sale';
  ELSE
    -- Build reason for escrow
    IF COALESCE(v_seller.seller_trust_score, 0) < v_trust_threshold THEN
      v_reason := 'Low seller trust score';
    ELSIF p_card_value > COALESCE(v_seller.instant_sale_limit, v_instant_limit) THEN
      v_reason := 'Card value exceeds instant limit';
    ELSIF COALESCE(v_seller.risk_flags, '[]'::jsonb) != '[]'::jsonb THEN
      v_reason := 'Seller has risk flags';
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'lane', v_lane,
    'reason', v_reason,
    'requires_verification', v_lane = 'escrow_verification',
    'seller_trust_score', COALESCE(v_seller.seller_trust_score, 0),
    'instant_eligible', v_seller.instant_sale_eligible
  );
END;
$$;

-- 18) Create function to complete sale and transfer ownership
CREATE OR REPLACE FUNCTION public.complete_sale_transfer(
  p_order_id uuid,
  p_escrow_id uuid,
  p_actor_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_escrow record;
  v_instance record;
BEGIN
  -- Get escrow transaction
  SELECT * INTO v_escrow
  FROM public.escrow_transactions
  WHERE id = p_escrow_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Escrow transaction not found');
  END IF;
  
  -- Get and lock card instance
  SELECT * INTO v_instance
  FROM public.card_instances
  WHERE id = v_escrow.card_instance_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Card instance not found');
  END IF;
  
  -- Transfer ownership
  UPDATE public.card_instances
  SET 
    owner_user_id = v_escrow.buyer_id,
    status = 'completed',
    location = 'buyer_received',
    locked_at = NULL,
    lock_reason = NULL,
    locked_by_order_id = NULL,
    updated_at = now()
  WHERE id = v_escrow.card_instance_id;
  
  -- Update escrow
  UPDATE public.escrow_transactions
  SET 
    status = 'completed',
    funds_released = true,
    payout_released_at = now(),
    updated_at = now()
  WHERE id = p_escrow_id;
  
  -- Update order
  UPDATE public.orders
  SET 
    status = 'completed',
    payout_status = 'released',
    updated_at = now()
  WHERE id = p_order_id;
  
  -- Update seller stats
  UPDATE public.profiles
  SET 
    total_sales_completed = COALESCE(total_sales_completed, 0) + 1,
    total_sales_value = COALESCE(total_sales_value, 0) + v_escrow.sale_amount
  WHERE id = v_escrow.seller_id;
  
  -- Log audit trail
  INSERT INTO public.inventory_audit_log (
    card_instance_id, from_status, to_status, from_location, to_location,
    actor_user_id, actor_type, related_order_id, related_escrow_id, action, reason
  ) VALUES (
    v_escrow.card_instance_id, v_instance.status, 'completed', 
    v_instance.location, 'buyer_received',
    p_actor_user_id, 'system', p_order_id, p_escrow_id, 
    'complete_sale_transfer', 'Ownership transferred to buyer'
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'new_owner_id', v_escrow.buyer_id,
    'payout_amount', v_escrow.seller_payout
  );
END;
$$;

-- 19) Create function to check inventory integrity
CREATE OR REPLACE FUNCTION public.check_inventory_integrity()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_issues integer := 0;
  v_orphaned_vault integer := 0;
  v_orphaned_listings integer := 0;
  v_status_mismatches integer := 0;
  v_locked_orphans integer := 0;
BEGIN
  -- Check for locked cards without active orders
  SELECT COUNT(*) INTO v_locked_orphans
  FROM public.card_instances ci
  WHERE ci.locked_at IS NOT NULL
    AND ci.locked_by_order_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = ci.locked_by_order_id 
      AND o.status IN ('pending', 'paid', 'processing')
    );
  
  IF v_locked_orphans > 0 THEN
    INSERT INTO public.inventory_integrity_issues (
      issue_type, issue_description, severity
    ) VALUES (
      'orphaned_locks', 
      v_locked_orphans || ' cards locked without active orders',
      'critical'
    );
    v_issues := v_issues + v_locked_orphans;
  END IF;
  
  -- Check for sold cards still showing as active listings
  SELECT COUNT(*) INTO v_status_mismatches
  FROM public.listings l
  WHERE l.status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.card_instances ci
      WHERE ci.source_listing_id = l.id
      AND ci.status IN ('sold_pending', 'completed', 'delivered')
    );
  
  IF v_status_mismatches > 0 THEN
    INSERT INTO public.inventory_integrity_issues (
      issue_type, issue_description, severity
    ) VALUES (
      'listing_status_mismatch', 
      v_status_mismatches || ' active listings with sold inventory',
      'critical'
    );
    v_issues := v_issues + v_status_mismatches;
  END IF;
  
  RETURN jsonb_build_object(
    'total_issues', v_issues,
    'orphaned_locks', v_locked_orphans,
    'status_mismatches', v_status_mismatches,
    'checked_at', now()
  );
END;
$$;

-- 20) Create trigger to update timestamps
CREATE OR REPLACE FUNCTION public.update_card_instance_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_card_instances_timestamp ON public.card_instances;
CREATE TRIGGER update_card_instances_timestamp
BEFORE UPDATE ON public.card_instances
FOR EACH ROW
EXECUTE FUNCTION public.update_card_instance_timestamp();

DROP TRIGGER IF EXISTS update_escrow_transactions_timestamp ON public.escrow_transactions;
CREATE TRIGGER update_escrow_transactions_timestamp
BEFORE UPDATE ON public.escrow_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 21) Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_card_instances_owner ON public.card_instances(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_card_instances_status ON public.card_instances(status);
CREATE INDEX IF NOT EXISTS idx_card_instances_active ON public.card_instances(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_card_instances_locked ON public.card_instances(locked_at) WHERE locked_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_order ON public.escrow_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_status ON public.escrow_transactions(status);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_log_instance ON public.inventory_audit_log(card_instance_id);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_log_created ON public.inventory_audit_log(created_at);
