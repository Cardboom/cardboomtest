-- =====================================================
-- CARDBOOM DATABASE FUNCTIONS AND TRIGGERS
-- =====================================================

-- =====================================================
-- PART 1: DATABASE FUNCTIONS
-- =====================================================

-- Function: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Function: calculate_level
CREATE OR REPLACE FUNCTION public.calculate_level(xp_amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN GREATEST(1, FLOOR(SQRT(xp_amount::NUMERIC / 100)) + 1)::INTEGER;
END;
$function$;

-- Function: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

-- Function: generate_referral_code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := 'CB-' || UPPER(SUBSTRING(MD5(NEW.id::text || now()::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$function$;

-- Function: generate_wire_transfer_code
CREATE OR REPLACE FUNCTION public.generate_wire_transfer_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.wire_transfer_code IS NULL THEN
    NEW.wire_transfer_code := 'CB-' || UPPER(SUBSTRING(NEW.id::text, 1, 8));
  END IF;
  RETURN NEW;
END;
$function$;

-- Function: get_seller_rating
CREATE OR REPLACE FUNCTION public.get_seller_rating(seller_uuid uuid)
RETURNS TABLE(avg_rating numeric, review_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(AVG(r.rating)::NUMERIC, 0) as avg_rating,
    COUNT(r.id) as review_count
  FROM public.reviews r
  WHERE r.reviewed_id = seller_uuid
  AND r.review_type = 'buyer_to_seller';
END;
$function$;

-- Function: handle_new_user (for auth trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, account_type)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    COALESCE((new.raw_user_meta_data ->> 'account_type')::account_type, 'buyer')
  );
  RETURN new;
END;
$function$;

-- Function: handle_new_user_wallet (for auth trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (new.id);
  RETURN new;
END;
$function$;

-- Function: handle_first_deposit_premium
CREATE OR REPLACE FUNCTION public.handle_first_deposit_premium()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.type = 'deposit' AND NEW.amount >= 10 THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT user_id FROM wallets WHERE id = NEW.wallet_id)
      AND first_deposit_completed = true
    ) THEN
      UPDATE profiles 
      SET 
        first_deposit_completed = true,
        first_deposit_at = now(),
        activation_unlocked = true,
        premium_trial_expires_at = now() + INTERVAL '7 days'
      WHERE id = (SELECT user_id FROM wallets WHERE id = NEW.wallet_id);
      
      INSERT INTO user_subscriptions (user_id, tier, started_at, expires_at, price_monthly, auto_renew)
      VALUES (
        (SELECT user_id FROM wallets WHERE id = NEW.wallet_id),
        'pro',
        now(),
        now() + INTERVAL '7 days',
        0,
        false
      )
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        tier = 'pro',
        started_at = now(),
        expires_at = now() + INTERVAL '7 days',
        price_monthly = 0;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Function: calculate_portfolio_heat
CREATE OR REPLACE FUNCTION public.calculate_portfolio_heat(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_price_score INTEGER := 0;
  v_views_score INTEGER := 0;
  v_liquidity_score INTEGER := 0;
  v_total_score INTEGER := 0;
BEGIN
  SELECT COALESCE(
    LEAST(40, SUM(
      CASE 
        WHEN ABS(mi.change_24h) > 10 THEN 15
        WHEN ABS(mi.change_24h) > 5 THEN 10
        WHEN ABS(mi.change_24h) > 2 THEN 5
        ELSE 2
      END
    )), 0)
  INTO v_price_score
  FROM portfolio_items pi
  JOIN market_items mi ON pi.market_item_id = mi.id
  WHERE pi.user_id = p_user_id;

  SELECT COALESCE(
    LEAST(30, SUM(
      CASE 
        WHEN mi.views_24h > 50 THEN 15
        WHEN mi.views_24h > 20 THEN 10
        WHEN mi.views_24h > 5 THEN 5
        ELSE 1
      END
    )), 0)
  INTO v_views_score
  FROM portfolio_items pi
  JOIN market_items mi ON pi.market_item_id = mi.id
  WHERE pi.user_id = p_user_id;

  SELECT COALESCE(
    LEAST(30, SUM(
      CASE mi.liquidity
        WHEN 'high' THEN 10
        WHEN 'medium' THEN 6
        ELSE 2
      END
    )), 0)
  INTO v_liquidity_score
  FROM portfolio_items pi
  JOIN market_items mi ON pi.market_item_id = mi.id
  WHERE pi.user_id = p_user_id;

  v_total_score := LEAST(100, v_price_score + v_views_score + v_liquidity_score);

  INSERT INTO portfolio_heat_scores (user_id, score, price_movement_score, views_score, liquidity_score, calculated_at)
  VALUES (p_user_id, v_total_score, v_price_score, v_views_score, v_liquidity_score, CURRENT_DATE)
  ON CONFLICT (user_id, calculated_at) 
  DO UPDATE SET 
    score = EXCLUDED.score,
    price_movement_score = EXCLUDED.price_movement_score,
    views_score = EXCLUDED.views_score,
    liquidity_score = EXCLUDED.liquidity_score;

  RETURN v_total_score;
END;
$function$;

-- Function: update_reputation
CREATE OR REPLACE FUNCTION public.update_reputation(p_user_id uuid, p_event_type text, p_points integer, p_reference_id uuid DEFAULT NULL::uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_new_score INTEGER;
  v_new_tier TEXT;
BEGIN
  INSERT INTO reputation_events (user_id, event_type, points_change, reference_id)
  VALUES (p_user_id, p_event_type, p_points, p_reference_id);

  UPDATE profiles 
  SET reputation_score = GREATEST(0, LEAST(1000, reputation_score + p_points))
  WHERE id = p_user_id
  RETURNING reputation_score INTO v_new_score;

  v_new_tier := CASE
    WHEN v_new_score >= 800 THEN 'diamond'
    WHEN v_new_score >= 600 THEN 'platinum'
    WHEN v_new_score >= 400 THEN 'gold'
    WHEN v_new_score >= 200 THEN 'silver'
    ELSE 'bronze'
  END;

  UPDATE profiles SET reputation_tier = v_new_tier WHERE id = p_user_id;

  RETURN v_new_score;
END;
$function$;

-- Function: update_discussion_stats
CREATE OR REPLACE FUNCTION public.update_discussion_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE discussions 
    SET comment_count = comment_count + 1,
        updated_at = now()
    WHERE id = NEW.discussion_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE discussions 
    SET comment_count = comment_count - 1,
        updated_at = now()
    WHERE id = OLD.discussion_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Function: update_discussion_upvotes
CREATE OR REPLACE FUNCTION public.update_discussion_upvotes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.discussions 
    SET upvotes = upvotes + 1 
    WHERE id = NEW.discussion_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.discussions 
    SET upvotes = GREATEST(upvotes - 1, 0)
    WHERE id = OLD.discussion_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- Function: update_reaction_counts
CREATE OR REPLACE FUNCTION public.update_reaction_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.reaction_type = 'insightful' THEN
      UPDATE discussion_comments SET insightful_count = insightful_count + 1 WHERE id = NEW.comment_id;
    ELSIF NEW.reaction_type = 'outdated' THEN
      UPDATE discussion_comments SET outdated_count = outdated_count + 1 WHERE id = NEW.comment_id;
    ELSIF NEW.reaction_type = 'contradicted' THEN
      UPDATE discussion_comments SET contradicted_count = contradicted_count + 1 WHERE id = NEW.comment_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.reaction_type = 'insightful' THEN
      UPDATE discussion_comments SET insightful_count = insightful_count - 1 WHERE id = OLD.comment_id;
    ELSIF OLD.reaction_type = 'outdated' THEN
      UPDATE discussion_comments SET outdated_count = outdated_count - 1 WHERE id = OLD.comment_id;
    ELSIF OLD.reaction_type = 'contradicted' THEN
      UPDATE discussion_comments SET contradicted_count = contradicted_count - 1 WHERE id = OLD.comment_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Function: update_call_outcomes
CREATE OR REPLACE FUNCTION public.update_call_outcomes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE creator_market_calls cmc
  SET 
    current_price = mi.current_price,
    price_change_percent = CASE 
      WHEN cmc.price_at_call > 0 THEN 
        ((mi.current_price - cmc.price_at_call) / cmc.price_at_call) * 100
      ELSE 0
    END,
    outcome_updated_at = now()
  FROM market_items mi
  WHERE cmc.market_item_id = mi.id
    AND cmc.outcome_status = 'active';
    
  UPDATE creator_profiles cp
  SET 
    total_calls = (SELECT COUNT(*) FROM creator_market_calls WHERE creator_id = cp.id),
    accurate_calls = (SELECT COUNT(*) FROM creator_market_calls 
      WHERE creator_id = cp.id 
      AND ((call_type = 'buy' AND price_change_percent > 10)
        OR (call_type = 'sell' AND price_change_percent < -10))),
    accuracy_rate = CASE 
      WHEN (SELECT COUNT(*) FROM creator_market_calls WHERE creator_id = cp.id AND outcome_status != 'active') > 0 
      THEN (SELECT COUNT(*)::NUMERIC FROM creator_market_calls 
        WHERE creator_id = cp.id 
        AND ((call_type = 'buy' AND price_change_percent > 10)
          OR (call_type = 'sell' AND price_change_percent < -10))) 
        / (SELECT COUNT(*)::NUMERIC FROM creator_market_calls WHERE creator_id = cp.id AND outcome_status != 'active') * 100
      ELSE 0
    END;
END;
$function$;

-- Function: check_auto_buy
CREATE OR REPLACE FUNCTION public.check_auto_buy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_config record;
  v_market_item record;
  v_discount_percent numeric;
  v_order_id uuid;
  v_buyer_wallet record;
BEGIN
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_config FROM public.auto_buy_config WHERE is_enabled = true LIMIT 1;
  
  IF v_config IS NULL OR v_config.system_buyer_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.seller_id = v_config.system_buyer_id THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_market_item 
  FROM public.market_items 
  WHERE LOWER(name) = LOWER(NEW.title)
     OR LOWER(NEW.title) LIKE '%' || LOWER(name) || '%'
  ORDER BY current_price DESC
  LIMIT 1;

  IF v_market_item IS NULL THEN
    SELECT * INTO v_market_item 
    FROM public.market_items 
    WHERE category = NEW.category
    ORDER BY 
      similarity(LOWER(name), LOWER(NEW.title)) DESC,
      current_price DESC
    LIMIT 1;
  END IF;

  IF v_market_item IS NULL OR v_market_item.current_price <= 0 THEN
    RETURN NEW;
  END IF;

  v_discount_percent := 1 - (NEW.price / v_market_item.current_price);

  IF v_discount_percent >= v_config.discount_threshold THEN
    IF NEW.price > v_config.max_buy_amount THEN
      INSERT INTO public.auto_buy_logs (listing_id, market_item_id, listing_price, market_price, discount_percent, status, error_message)
      VALUES (NEW.id, v_market_item.id, NEW.price, v_market_item.current_price, v_discount_percent * 100, 'skipped', 'Exceeds max buy amount');
      RETURN NEW;
    END IF;

    SELECT * INTO v_buyer_wallet FROM public.wallets WHERE user_id = v_config.system_buyer_id;
    
    IF v_buyer_wallet IS NULL OR v_buyer_wallet.balance < NEW.price THEN
      INSERT INTO public.auto_buy_logs (listing_id, market_item_id, listing_price, market_price, discount_percent, status, error_message)
      VALUES (NEW.id, v_market_item.id, NEW.price, v_market_item.current_price, v_discount_percent * 100, 'failed', 'Insufficient wallet balance');
      RETURN NEW;
    END IF;

    INSERT INTO public.orders (listing_id, buyer_id, seller_id, price, buyer_fee, seller_fee, delivery_option, status)
    VALUES (NEW.id, v_config.system_buyer_id, NEW.seller_id, NEW.price, 0, NEW.price * 0.05, 'vault', 'pending')
    RETURNING id INTO v_order_id;

    NEW.status := 'sold';

    UPDATE public.wallets 
    SET balance = balance - NEW.price,
        updated_at = now()
    WHERE user_id = v_config.system_buyer_id;

    INSERT INTO public.auto_buy_logs (listing_id, market_item_id, listing_price, market_price, discount_percent, order_id, status)
    VALUES (NEW.id, v_market_item.id, NEW.price, v_market_item.current_price, v_discount_percent * 100, v_order_id, 'completed');

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (NEW.seller_id, 'order', 'Item Sold!', 'Your listing "' || NEW.title || '" was purchased for ' || NEW.price, jsonb_build_object('order_id', v_order_id));

  END IF;

  RETURN NEW;
END;
$function$;

-- =====================================================
-- PART 2: TRIGGERS
-- =====================================================

-- Auth triggers (run these in Supabase dashboard SQL editor)
-- CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
-- CREATE TRIGGER on_auth_user_created_wallet AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user_wallet();

-- Profile triggers
CREATE TRIGGER generate_profile_referral_code BEFORE INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION generate_referral_code();
CREATE TRIGGER generate_wire_code_trigger BEFORE INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION generate_wire_transfer_code();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Wallet triggers
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Transaction triggers
CREATE TRIGGER on_first_deposit_premium AFTER INSERT ON transactions FOR EACH ROW EXECUTE FUNCTION handle_first_deposit_premium();

-- Listing triggers
CREATE TRIGGER auto_buy_trigger BEFORE INSERT OR UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION check_auto_buy();
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Order triggers
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Market items triggers
CREATE TRIGGER update_market_items_updated_at BEFORE UPDATE ON market_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Portfolio triggers
CREATE TRIGGER update_portfolio_items_updated_at BEFORE UPDATE ON portfolio_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trade triggers
CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON trades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Discussion triggers
CREATE TRIGGER update_discussion_stats_trigger AFTER INSERT OR DELETE ON discussion_comments FOR EACH ROW EXECUTE FUNCTION update_discussion_stats();
CREATE TRIGGER update_reaction_counts_trigger AFTER INSERT OR DELETE ON discussion_reactions FOR EACH ROW EXECUTE FUNCTION update_reaction_counts();
CREATE TRIGGER on_discussion_vote_change AFTER INSERT OR DELETE ON discussion_votes FOR EACH ROW EXECUTE FUNCTION update_discussion_upvotes();

-- Other triggers
CREATE TRIGGER update_verified_sellers_updated_at BEFORE UPDATE ON verified_sellers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ebay_card_cache_updated_at BEFORE UPDATE ON ebay_card_cache FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fractional_share_listings_updated_at BEFORE UPDATE ON fractional_share_listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_api_subscriptions_updated_at BEFORE UPDATE ON api_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_price_alerts_updated_at BEFORE UPDATE ON price_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PART 3: AUTH TRIGGERS (Run in Supabase Dashboard)
-- =====================================================
-- IMPORTANT: These must be run manually in the Supabase SQL Editor
-- because they reference auth.users which is in a protected schema

/*
-- Create auth trigger for new user profile
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users 
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Create auth trigger for new user wallet
CREATE TRIGGER on_auth_user_created_wallet 
  AFTER INSERT ON auth.users 
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user_wallet();
*/
