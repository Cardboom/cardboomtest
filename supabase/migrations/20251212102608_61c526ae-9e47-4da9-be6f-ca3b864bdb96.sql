-- Create enums
CREATE TYPE public.delivery_option AS ENUM ('vault', 'trade', 'ship');
CREATE TYPE public.transaction_type AS ENUM ('topup', 'purchase', 'sale', 'fee', 'subscription', 'withdrawal');
CREATE TYPE public.listing_status AS ENUM ('active', 'sold', 'cancelled', 'reserved');
CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'processing', 'shipped', 'delivered', 'completed', 'cancelled');
CREATE TYPE public.verification_status AS ENUM ('pending', 'approved', 'rejected');

-- Wallet table for user balances
CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Transaction history
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  fee DECIMAL(12, 2) DEFAULT 0.00,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Listings (cards for sale)
CREATE TABLE public.listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  condition TEXT NOT NULL DEFAULT 'Near Mint',
  price DECIMAL(12, 2) NOT NULL CHECK (price > 0),
  image_url TEXT,
  status listing_status NOT NULL DEFAULT 'active',
  allows_vault BOOLEAN NOT NULL DEFAULT true,
  allows_trade BOOLEAN NOT NULL DEFAULT true,
  allows_shipping BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Orders
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id),
  buyer_id UUID NOT NULL REFERENCES auth.users(id),
  seller_id UUID NOT NULL REFERENCES auth.users(id),
  delivery_option delivery_option NOT NULL,
  price DECIMAL(12, 2) NOT NULL,
  buyer_fee DECIMAL(12, 2) NOT NULL,
  seller_fee DECIMAL(12, 2) NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  shipping_address JSONB,
  tracking_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Vault items (cards stored in vault)
CREATE TABLE public.vault_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id),
  order_id UUID REFERENCES public.orders(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  condition TEXT NOT NULL,
  image_url TEXT,
  estimated_value DECIMAL(12, 2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Verified sellers
CREATE TABLE public.verified_sellers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_status verification_status NOT NULL DEFAULT 'pending',
  id_document_url TEXT,
  business_name TEXT,
  business_address TEXT,
  subscription_active BOOLEAN NOT NULL DEFAULT false,
  subscription_started_at TIMESTAMP WITH TIME ZONE,
  subscription_ends_at TIMESTAMP WITH TIME ZONE,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Platform settings (commission rates etc)
CREATE TABLE public.platform_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default commission rates
INSERT INTO public.platform_settings (key, value) VALUES 
  ('topup_fee_percent', '7'),
  ('buy_fee_percent', '6'),
  ('sell_fee_percent', '6'),
  ('verified_seller_monthly_fee', '19.99');

-- Enable RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Wallet policies
CREATE POLICY "Users can view their own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System creates wallets" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Transaction policies
CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT 
  USING (wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid()));

-- Listing policies
CREATE POLICY "Anyone can view active listings" ON public.listings FOR SELECT USING (status = 'active' OR seller_id = auth.uid());
CREATE POLICY "Users can create listings" ON public.listings FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update own listings" ON public.listings FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete own listings" ON public.listings FOR DELETE USING (auth.uid() = seller_id);

-- Order policies
CREATE POLICY "Users can view their orders" ON public.orders FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Users can create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Participants can update orders" ON public.orders FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Vault policies
CREATE POLICY "Users can view their vault items" ON public.vault_items FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "System can insert vault items" ON public.vault_items FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Verified seller policies
CREATE POLICY "Users can view their verification" ON public.verified_sellers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can apply for verification" ON public.verified_sellers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update verification docs" ON public.verified_sellers FOR UPDATE USING (auth.uid() = user_id);

-- Platform settings readable by all authenticated
CREATE POLICY "Authenticated can read settings" ON public.platform_settings FOR SELECT TO authenticated USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_verified_sellers_updated_at BEFORE UPDATE ON public.verified_sellers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create wallet on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (new.id);
  RETURN new;
END;
$$;

-- Trigger to create wallet on signup
CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_wallet();