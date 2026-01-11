-- Add batch discount flag to grading_orders
ALTER TABLE grading_orders 
ADD COLUMN IF NOT EXISTS is_batch_discounted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS batch_size INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS batch_discount_percent NUMERIC(5,2) DEFAULT 0;

-- Update the bounty progress function to exclude batch-discounted orders
CREATE OR REPLACE FUNCTION public.update_bounty_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_bounty RECORD;
  v_count INTEGER;
BEGIN
  -- Get user ID based on which table triggered this
  IF TG_TABLE_NAME = 'grading_orders' AND NEW.status = 'completed' THEN
    v_user_id := NEW.user_id;
    
    -- Skip batch-discounted orders for bounty progress
    IF NEW.is_batch_discounted = true THEN
      RETURN NEW;
    END IF;
    
    -- Update direct grading bounties
    FOR v_bounty IN 
      SELECT * FROM bounties 
      WHERE is_active = true 
      AND bounty_type = 'grading_count'
      AND now() BETWEEN starts_at AND ends_at
    LOOP
      -- Count user's gradings in period (excluding batch-discounted)
      SELECT COUNT(*) INTO v_count
      FROM grading_orders
      WHERE user_id = v_user_id
      AND status = 'completed'
      AND (is_batch_discounted = false OR is_batch_discounted IS NULL)
      AND completed_at >= v_bounty.starts_at
      AND completed_at <= v_bounty.ends_at;
      
      -- Upsert progress
      INSERT INTO bounty_progress (user_id, bounty_id, current_count)
      VALUES (v_user_id, v_bounty.id, v_count)
      ON CONFLICT (user_id, bounty_id) 
      DO UPDATE SET 
        current_count = v_count,
        is_completed = v_count >= v_bounty.target_count,
        completed_at = CASE WHEN v_count >= v_bounty.target_count AND bounty_progress.completed_at IS NULL THEN now() ELSE bounty_progress.completed_at END,
        updated_at = now();
    END LOOP;
  END IF;
  
  IF TG_TABLE_NAME = 'orders' AND NEW.status = 'completed' THEN
    v_user_id := NEW.buyer_id;
    
    -- Update purchase count bounties
    FOR v_bounty IN 
      SELECT * FROM bounties 
      WHERE is_active = true 
      AND bounty_type = 'purchase_count'
      AND now() BETWEEN starts_at AND ends_at
    LOOP
      SELECT COUNT(*) INTO v_count
      FROM orders
      WHERE buyer_id = v_user_id
      AND status = 'completed'
      AND completed_at >= v_bounty.starts_at
      AND completed_at <= v_bounty.ends_at;
      
      INSERT INTO bounty_progress (user_id, bounty_id, current_count)
      VALUES (v_user_id, v_bounty.id, v_count)
      ON CONFLICT (user_id, bounty_id) 
      DO UPDATE SET 
        current_count = v_count,
        is_completed = v_count >= v_bounty.target_count,
        completed_at = CASE WHEN v_count >= v_bounty.target_count AND bounty_progress.completed_at IS NULL THEN now() ELSE bounty_progress.completed_at END,
        updated_at = now();
    END LOOP;
    
    -- Also update seller's sale count bounties
    FOR v_bounty IN 
      SELECT * FROM bounties 
      WHERE is_active = true 
      AND bounty_type = 'sale_count'
      AND now() BETWEEN starts_at AND ends_at
    LOOP
      SELECT COUNT(*) INTO v_count
      FROM orders
      WHERE seller_id = NEW.seller_id
      AND status = 'completed'
      AND completed_at >= v_bounty.starts_at
      AND completed_at <= v_bounty.ends_at;
      
      INSERT INTO bounty_progress (user_id, bounty_id, current_count)
      VALUES (NEW.seller_id, v_bounty.id, v_count)
      ON CONFLICT (user_id, bounty_id) 
      DO UPDATE SET 
        current_count = v_count,
        is_completed = v_count >= v_bounty.target_count,
        completed_at = CASE WHEN v_count >= v_bounty.target_count AND bounty_progress.completed_at IS NULL THEN now() ELSE bounty_progress.completed_at END,
        updated_at = now();
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add comment explaining batch discount exclusion
COMMENT ON COLUMN grading_orders.is_batch_discounted IS 'Orders placed with batch discount do not count toward Boom Challenges';