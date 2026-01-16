-- Boom Pack Types (admin-defined pack configurations)
CREATE TABLE public.boom_pack_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price_gems INTEGER NOT NULL CHECK (price_gems > 0),
  cards_count INTEGER NOT NULL DEFAULT 1 CHECK (cards_count >= 1),
  category TEXT NOT NULL DEFAULT 'pokemon',
  rarity_distribution JSONB DEFAULT '{"common": 70, "uncommon": 20, "rare": 8, "ultra_rare": 2}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  stock_limit INTEGER,
  stock_sold INTEGER NOT NULL DEFAULT 0,
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User-purchased boom packs (inventory before opening)
CREATE TABLE public.boom_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pack_type_id UUID NOT NULL REFERENCES public.boom_pack_types(id),
  status TEXT NOT NULL DEFAULT 'sealed' CHECK (status IN ('sealed', 'opening', 'opened')),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened_at TIMESTAMPTZ,
  gems_spent INTEGER NOT NULL,
  bonus_gems_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cards allocated from opened boom packs
CREATE TABLE public.boom_pack_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  boom_pack_id UUID NOT NULL REFERENCES public.boom_packs(id),
  user_id UUID NOT NULL,
  card_instance_id UUID REFERENCES public.card_instances(id),
  market_item_id UUID REFERENCES public.market_items(id),
  card_name TEXT NOT NULL,
  card_image_url TEXT,
  rarity TEXT NOT NULL DEFAULT 'common',
  utility_value_gems INTEGER NOT NULL DEFAULT 0,
  origin_tag TEXT NOT NULL DEFAULT 'boom_pack',
  cooldown_until TIMESTAMPTZ NOT NULL,
  can_list_after TIMESTAMPTZ NOT NULL,
  is_shipped BOOLEAN NOT NULL DEFAULT false,
  is_in_vault BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log for compliance
CREATE TABLE public.boom_pack_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('pack_purchase', 'pack_open', 'card_allocation', 'guaranteed_value_bonus', 'gems_topup', 'cooldown_complete', 'card_listed')),
  pack_id UUID REFERENCES public.boom_packs(id),
  pack_type_id UUID REFERENCES public.boom_pack_types(id),
  details JSONB,
  gems_amount INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CardBoom-owned inventory pool for boom packs
CREATE TABLE public.boom_pack_inventory_pool (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  market_item_id UUID REFERENCES public.market_items(id),
  card_name TEXT NOT NULL,
  card_image_url TEXT,
  category TEXT NOT NULL DEFAULT 'pokemon',
  rarity TEXT NOT NULL DEFAULT 'common',
  utility_value_gems INTEGER NOT NULL DEFAULT 100,
  is_available BOOLEAN NOT NULL DEFAULT true,
  allocated_to_pack_id UUID REFERENCES public.boom_packs(id),
  allocated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.boom_pack_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boom_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boom_pack_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boom_pack_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boom_pack_inventory_pool ENABLE ROW LEVEL SECURITY;

-- RLS Policies for boom_pack_types (public read)
CREATE POLICY "Anyone can view active pack types"
ON public.boom_pack_types FOR SELECT
USING (is_active = true);

-- RLS Policies for boom_packs
CREATE POLICY "Users can view their own packs"
ON public.boom_packs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own packs"
ON public.boom_packs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own packs"
ON public.boom_packs FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for boom_pack_cards
CREATE POLICY "Users can view their own pack cards"
ON public.boom_pack_cards FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pack cards"
ON public.boom_pack_cards FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pack cards"
ON public.boom_pack_cards FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for audit log (user can view own logs)
CREATE POLICY "Users can view their own audit logs"
ON public.boom_pack_audit_log FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit logs"
ON public.boom_pack_audit_log FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Inventory pool is managed by system (no direct user access)
CREATE POLICY "Inventory pool read for authenticated"
ON public.boom_pack_inventory_pool FOR SELECT
TO authenticated
USING (is_available = true);

-- Indexes for performance
CREATE INDEX idx_boom_packs_user_id ON public.boom_packs(user_id);
CREATE INDEX idx_boom_packs_status ON public.boom_packs(status);
CREATE INDEX idx_boom_pack_cards_user_id ON public.boom_pack_cards(user_id);
CREATE INDEX idx_boom_pack_cards_cooldown ON public.boom_pack_cards(cooldown_until);
CREATE INDEX idx_boom_pack_inventory_available ON public.boom_pack_inventory_pool(is_available, category, rarity);
CREATE INDEX idx_boom_pack_audit_user ON public.boom_pack_audit_log(user_id, event_type);

-- Trigger for updated_at on pack types
CREATE TRIGGER update_boom_pack_types_updated_at
BEFORE UPDATE ON public.boom_pack_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();