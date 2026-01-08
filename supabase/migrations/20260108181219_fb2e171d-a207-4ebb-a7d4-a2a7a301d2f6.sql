-- Add currency column to listings table
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';

-- Add currency column to orders table to track what currency was used
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS listing_currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS buyer_currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS seller_currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS exchange_rate_used numeric DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS price_in_listing_currency numeric,
ADD COLUMN IF NOT EXISTS seller_payout_in_seller_currency numeric;

-- Create index for currency filtering
CREATE INDEX IF NOT EXISTS idx_listings_currency ON public.listings(currency);

-- Comment for documentation
COMMENT ON COLUMN public.listings.currency IS 'The currency the listing price is in (USD, EUR, TRY)';
COMMENT ON COLUMN public.orders.exchange_rate_used IS 'The exchange rate used at time of purchase for cross-currency transactions';