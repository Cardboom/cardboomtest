-- =====================================================
-- BOUNTY SYSTEM TABLES
-- =====================================================

-- Bounties table - stores bounty definitions
CREATE TABLE public.bounties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  bounty_type TEXT NOT NULL, -- 'grading_count', 'referral_grading', 'referral_sales', 'listing_count', 'sale_count'
  target_count INTEGER NOT NULL DEFAULT 5,
  reward_gems INTEGER NOT NULL DEFAULT 100, -- in cents (100 = $1)
  period_type TEXT NOT NULL DEFAULT 'monthly', -- 'weekly', 'monthly'
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  icon TEXT DEFAULT '🎯',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  auto_generated BOOLEAN DEFAULT false
);

-- Bounty progress - tracks user progress on bounties
CREATE TABLE public.bounty_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bounty_id UUID NOT NULL REFERENCES public.bounties(id) ON DELETE CASCADE,
  current_count INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  reward_claimed BOOLEAN DEFAULT false,
  reward_claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, bounty_id)
);

-- Referral grading tracking - tracks gradings done by referrals
CREATE TABLE public.referral_gradings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grading_order_id UUID REFERENCES public.grading_orders(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Referral sales tracking - tracks sales done by referrals  
CREATE TABLE public.referral_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id),
  sale_amount INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bounties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bounty_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_gradings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_sales ENABLE ROW LEVEL SECURITY;

-- Bounties policies (public read for active bounties)
CREATE POLICY "Anyone can view active bounties" 
ON public.bounties FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage bounties" 
ON public.bounties FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Bounty progress policies
CREATE POLICY "Users can view own progress" 
ON public.bounty_progress FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" 
ON public.bounty_progress FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" 
ON public.bounty_progress FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress" 
ON public.bounty_progress FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Referral gradings policies
CREATE POLICY "Users can view own referral gradings" 
ON public.referral_gradings FOR SELECT 
USING (auth.uid() = referrer_id);

CREATE POLICY "System can insert referral gradings" 
ON public.referral_gradings FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all referral gradings" 
ON public.referral_gradings FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Referral sales policies
CREATE POLICY "Users can view own referral sales" 
ON public.referral_sales FOR SELECT 
USING (auth.uid() = referrer_id);

CREATE POLICY "System can insert referral sales" 
ON public.referral_sales FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all referral sales" 
ON public.referral_sales FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Function to update bounty progress
CREATE OR REPLACE FUNCTION public.update_bounty_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_bounty RECORD;
  v_progress RECORD;
  v_user_id UUID;
  v_referrer_id UUID;
  v_count INTEGER;
BEGIN
  -- Handle grading orders
  IF TG_TABLE_NAME = 'grading_orders' AND NEW.status = 'completed' THEN
    v_user_id := NEW.user_id;
    
    -- Update direct grading bounties
    FOR v_bounty IN 
      SELECT * FROM bounties 
      WHERE is_active = true 
      AND bounty_type = 'grading_count'
      AND now() BETWEEN starts_at AND ends_at
    LOOP
      -- Count user's gradings in period
      SELECT COUNT(*) INTO v_count
      FROM grading_orders
      WHERE user_id = v_user_id
      AND status = 'completed'
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
    
    -- Track referral grading
    SELECT referred_by INTO v_referrer_id
    FROM profiles WHERE id = v_user_id;
    
    IF v_referrer_id IS NOT NULL THEN
      INSERT INTO referral_gradings (referrer_id, referred_user_id, grading_order_id)
      VALUES (v_referrer_id, v_user_id, NEW.id);
      
      -- Update referral grading bounties for referrer
      FOR v_bounty IN 
        SELECT * FROM bounties 
        WHERE is_active = true 
        AND bounty_type = 'referral_grading'
        AND now() BETWEEN starts_at AND ends_at
      LOOP
        SELECT COUNT(*) INTO v_count
        FROM referral_gradings
        WHERE referrer_id = v_referrer_id
        AND created_at >= v_bounty.starts_at
        AND created_at <= v_bounty.ends_at;
        
        INSERT INTO bounty_progress (user_id, bounty_id, current_count)
        VALUES (v_referrer_id, v_bounty.id, v_count)
        ON CONFLICT (user_id, bounty_id) 
        DO UPDATE SET 
          current_count = v_count,
          is_completed = v_count >= v_bounty.target_count,
          completed_at = CASE WHEN v_count >= v_bounty.target_count AND bounty_progress.completed_at IS NULL THEN now() ELSE bounty_progress.completed_at END,
          updated_at = now();
      END LOOP;
    END IF;
  END IF;
  
  -- Handle orders (sales)
  IF TG_TABLE_NAME = 'orders' AND NEW.status = 'completed' THEN
    v_user_id := NEW.seller_id;
    
    -- Track referral sale
    SELECT referred_by INTO v_referrer_id
    FROM profiles WHERE id = v_user_id;
    
    IF v_referrer_id IS NOT NULL THEN
      INSERT INTO referral_sales (referrer_id, referred_user_id, order_id, sale_amount)
      VALUES (v_referrer_id, v_user_id, NEW.id, NEW.price_cents);
      
      -- Update referral sales bounties
      FOR v_bounty IN 
        SELECT * FROM bounties 
        WHERE is_active = true 
        AND bounty_type = 'referral_sales'
        AND now() BETWEEN starts_at AND ends_at
      LOOP
        SELECT COUNT(*) INTO v_count
        FROM referral_sales
        WHERE referrer_id = v_referrer_id
        AND created_at >= v_bounty.starts_at
        AND created_at <= v_bounty.ends_at;
        
        INSERT INTO bounty_progress (user_id, bounty_id, current_count)
        VALUES (v_referrer_id, v_bounty.id, v_count)
        ON CONFLICT (user_id, bounty_id) 
        DO UPDATE SET 
          current_count = v_count,
          is_completed = v_count >= v_bounty.target_count,
          completed_at = CASE WHEN v_count >= v_bounty.target_count AND bounty_progress.completed_at IS NULL THEN now() ELSE bounty_progress.completed_at END,
          updated_at = now();
      END LOOP;
    END IF;
    
    -- Update sale count bounties for seller
    FOR v_bounty IN 
      SELECT * FROM bounties 
      WHERE is_active = true 
      AND bounty_type = 'sale_count'
      AND now() BETWEEN starts_at AND ends_at
    LOOP
      SELECT COUNT(*) INTO v_count
      FROM orders
      WHERE seller_id = v_user_id
      AND status = 'completed'
      AND created_at >= v_bounty.starts_at
      AND created_at <= v_bounty.ends_at;
      
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
CREATE TRIGGER update_bounty_on_grading
AFTER UPDATE ON public.grading_orders
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE FUNCTION public.update_bounty_progress();

CREATE TRIGGER update_bounty_on_sale
AFTER UPDATE ON public.orders
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE FUNCTION public.update_bounty_progress();

-- Function to claim bounty reward
CREATE OR REPLACE FUNCTION public.claim_bounty_reward(p_bounty_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_progress RECORD;
  v_bounty RECORD;
  v_gem_amount INTEGER;
BEGIN
  -- Get progress
  SELECT * INTO v_progress
  FROM bounty_progress
  WHERE user_id = auth.uid() AND bounty_id = p_bounty_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Progress not found');
  END IF;
  
  IF NOT v_progress.is_completed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bounty not completed');
  END IF;
  
  IF v_progress.reward_claimed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reward already claimed');
  END IF;
  
  -- Get bounty
  SELECT * INTO v_bounty FROM bounties WHERE id = p_bounty_id;
  v_gem_amount := v_bounty.reward_gems;
  
  -- Award gems
  INSERT INTO cardboom_points (user_id, balance, total_earned)
  VALUES (auth.uid(), v_gem_amount, v_gem_amount)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = cardboom_points.balance + v_gem_amount,
    total_earned = cardboom_points.total_earned + v_gem_amount,
    updated_at = now();
  
  -- Record history
  INSERT INTO cardboom_points_history (user_id, amount, transaction_type, source, description, reference_id)
  VALUES (auth.uid(), v_gem_amount, 'earn', 'bounty', v_bounty.title, p_bounty_id);
  
  -- Mark as claimed
  UPDATE bounty_progress
  SET reward_claimed = true, reward_claimed_at = now()
  WHERE user_id = auth.uid() AND bounty_id = p_bounty_id;
  
  RETURN jsonb_build_object('success', true, 'gems_awarded', v_gem_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add updated_at trigger
CREATE TRIGGER update_bounty_progress_updated_at
BEFORE UPDATE ON public.bounty_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_bounties_active ON public.bounties(is_active, ends_at);
CREATE INDEX idx_bounty_progress_user ON public.bounty_progress(user_id);
CREATE INDEX idx_referral_gradings_referrer ON public.referral_gradings(referrer_id);
CREATE INDEX idx_referral_sales_referrer ON public.referral_sales(referrer_id);