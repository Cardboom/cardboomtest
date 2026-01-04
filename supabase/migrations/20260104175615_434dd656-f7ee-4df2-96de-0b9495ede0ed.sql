-- Fix the check_auto_buy function that references non-existent market_item_id on listings
CREATE OR REPLACE FUNCTION public.check_auto_buy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config record;
  v_market_item record;
  v_discount_percent numeric;
  v_order_id uuid;
  v_buyer_wallet record;
BEGIN
  -- Only process active listings
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;

  -- Get auto-buy config
  SELECT * INTO v_config FROM public.auto_buy_config WHERE is_enabled = true LIMIT 1;
  
  -- If no config or disabled, skip
  IF v_config IS NULL OR v_config.system_buyer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Don't auto-buy our own listings
  IF NEW.seller_id = v_config.system_buyer_id THEN
    RETURN NEW;
  END IF;

  -- Find matching market item by name/title similarity
  SELECT * INTO v_market_item 
  FROM public.market_items 
  WHERE LOWER(name) = LOWER(NEW.title)
     OR LOWER(NEW.title) LIKE '%' || LOWER(name) || '%'
  ORDER BY current_price DESC
  LIMIT 1;

  -- If no market item found, try category matching
  IF v_market_item IS NULL THEN
    SELECT * INTO v_market_item 
    FROM public.market_items 
    WHERE category = NEW.category
    ORDER BY 
      similarity(LOWER(name), LOWER(NEW.title)) DESC,
      current_price DESC
    LIMIT 1;
  END IF;

  -- If still no match or market price is 0, skip
  IF v_market_item IS NULL OR v_market_item.current_price <= 0 THEN
    RETURN NEW;
  END IF;

  -- Calculate discount percentage
  v_discount_percent := 1 - (NEW.price / v_market_item.current_price);

  -- Check if discount meets threshold (e.g., 60% below = listing is 40% of market price)
  IF v_discount_percent >= v_config.discount_threshold THEN
    -- Check max buy amount
    IF NEW.price > v_config.max_buy_amount THEN
      INSERT INTO public.auto_buy_logs (listing_id, listing_price, market_price, discount_percent, status, error_message)
      VALUES (NEW.id, NEW.price, v_market_item.current_price, v_discount_percent * 100, 'skipped', 'Exceeds max buy amount');
      RETURN NEW;
    END IF;

    -- Check buyer has sufficient wallet balance
    SELECT * INTO v_buyer_wallet FROM public.wallets WHERE user_id = v_config.system_buyer_id;
    
    IF v_buyer_wallet IS NULL OR v_buyer_wallet.balance < NEW.price THEN
      INSERT INTO public.auto_buy_logs (listing_id, listing_price, market_price, discount_percent, status, error_message)
      VALUES (NEW.id, NEW.price, v_market_item.current_price, v_discount_percent * 100, 'failed', 'Insufficient wallet balance');
      RETURN NEW;
    END IF;

    -- Create order
    INSERT INTO public.orders (listing_id, buyer_id, seller_id, amount, status)
    VALUES (NEW.id, v_config.system_buyer_id, NEW.seller_id, NEW.price, 'completed')
    RETURNING id INTO v_order_id;

    -- Update listing status
    NEW.status := 'sold';

    -- Deduct from buyer wallet
    UPDATE public.wallets 
    SET balance = balance - NEW.price 
    WHERE user_id = v_config.system_buyer_id;

    -- Add to seller wallet
    UPDATE public.wallets 
    SET balance = balance + NEW.price 
    WHERE user_id = NEW.seller_id;

    -- Log successful auto-buy
    INSERT INTO public.auto_buy_logs (listing_id, listing_price, market_price, discount_percent, status, order_id)
    VALUES (NEW.id, NEW.price, v_market_item.current_price, v_discount_percent * 100, 'completed', v_order_id);
  END IF;

  RETURN NEW;
END;
$$;