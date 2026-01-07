-- Add auction fees and vault storage fee columns
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS listing_fee NUMERIC(10,2) DEFAULT 0.50;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS sale_fee_rate NUMERIC(4,3) DEFAULT 0.05;

-- Add monthly storage fee tracking for vault
ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS storage_fee_cents INTEGER DEFAULT 200;
ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS last_storage_charge_at TIMESTAMPTZ;
ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS total_storage_fees_paid_cents INTEGER DEFAULT 0;

-- Create vault_storage_charges table for billing history
CREATE TABLE IF NOT EXISTS vault_storage_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_item_id UUID REFERENCES vault_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 200,
  charged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'waived')),
  transaction_id UUID REFERENCES transactions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE vault_storage_charges ENABLE ROW LEVEL SECURITY;

-- RLS policies for vault_storage_charges
CREATE POLICY "Users can view their own storage charges"
  ON vault_storage_charges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage storage charges"
  ON vault_storage_charges FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create index
CREATE INDEX IF NOT EXISTS idx_vault_storage_charges_user ON vault_storage_charges(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_storage_charges_vault_item ON vault_storage_charges(vault_item_id);

-- Add outbid notification tracking to auction_bids
ALTER TABLE auction_bids ADD COLUMN IF NOT EXISTS outbid_notified BOOLEAN DEFAULT false;

-- Add counter-offer support to offers table
ALTER TABLE offers ADD COLUMN IF NOT EXISTS is_counter_offer BOOLEAN DEFAULT false;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS parent_offer_id UUID REFERENCES offers(id);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS counter_price NUMERIC(10,2);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours');