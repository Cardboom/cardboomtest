-- Create a table to store auto-buy configuration and the system buyer account
CREATE TABLE IF NOT EXISTS public.auto_buy_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean NOT NULL DEFAULT true,
  discount_threshold numeric NOT NULL DEFAULT 0.60, -- 60% below market price
  max_buy_amount numeric DEFAULT 10000, -- Max amount per auto-buy
  system_buyer_id uuid, -- The admin/system user who auto-buys
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create a log table for auto-purchases
CREATE TABLE IF NOT EXISTS public.auto_buy_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  market_item_id uuid REFERENCES public.market_items(id) ON DELETE SET NULL,
  listing_price numeric NOT NULL,
  market_price numeric NOT NULL,
  discount_percent numeric NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auto_buy_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_buy_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage auto-buy config
CREATE POLICY "Admins can view auto_buy_config"
  ON public.auto_buy_config FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update auto_buy_config"
  ON public.auto_buy_config FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert auto_buy_config"
  ON public.auto_buy_config FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Only admins can view auto-buy logs
CREATE POLICY "Admins can view auto_buy_logs"
  ON public.auto_buy_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert auto_buy_logs"
  ON public.auto_buy_logs FOR INSERT
  WITH CHECK (true);

-- Function to check and auto-buy underpriced listings
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
      INSERT INTO public.auto_buy_logs (listing_id, market_item_id, listing_price, market_price, discount_percent, status, error_message)
      VALUES (NEW.id, v_market_item.id, NEW.price, v_market_item.current_price, v_discount_percent * 100, 'skipped', 'Exceeds max buy amount');
      RETURN NEW;
    END IF;

    -- Check buyer has sufficient wallet balance
    SELECT * INTO v_buyer_wallet FROM public.wallets WHERE user_id = v_config.system_buyer_id;
    
    IF v_buyer_wallet IS NULL OR v_buyer_wallet.balance < NEW.price THEN
      INSERT INTO public.auto_buy_logs (listing_id, market_item_id, listing_price, market_price, discount_percent, status, error_message)
      VALUES (NEW.id, v_market_item.id, NEW.price, v_market_item.current_price, v_discount_percent * 100, 'failed', 'Insufficient wallet balance');
      RETURN NEW;
    END IF;

    -- Create the order
    INSERT INTO public.orders (listing_id, buyer_id, seller_id, price, buyer_fee, seller_fee, delivery_option, status)
    VALUES (NEW.id, v_config.system_buyer_id, NEW.seller_id, NEW.price, 0, NEW.price * 0.05, 'vault', 'pending')
    RETURNING id INTO v_order_id;

    -- Update listing status to sold
    NEW.status := 'sold';

    -- Deduct from buyer wallet
    UPDATE public.wallets 
    SET balance = balance - NEW.price,
        updated_at = now()
    WHERE user_id = v_config.system_buyer_id;

    -- Log successful auto-buy
    INSERT INTO public.auto_buy_logs (listing_id, market_item_id, listing_price, market_price, discount_percent, order_id, status)
    VALUES (NEW.id, v_market_item.id, NEW.price, v_market_item.current_price, v_discount_percent * 100, v_order_id, 'completed');

    -- Create notification for seller
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (NEW.seller_id, 'order', 'Item Sold!', 'Your listing "' || NEW.title || '" was purchased for ' || NEW.price, jsonb_build_object('order_id', v_order_id));

  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on listings
DROP TRIGGER IF EXISTS auto_buy_trigger ON public.listings;
CREATE TRIGGER auto_buy_trigger
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_auto_buy();

-- Insert default config (disabled until admin sets buyer)
INSERT INTO public.auto_buy_config (is_enabled, discount_threshold, max_buy_amount)
VALUES (false, 0.60, 10000)
ON CONFLICT DO NOTHING;