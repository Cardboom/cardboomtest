-- =====================================================
-- CARDBOOM COMPLETE DATABASE SCHEMA MIGRATION
-- Generated for external Supabase migration
-- =====================================================

-- =====================================================
-- PART 1: EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- PART 2: CUSTOM ENUM TYPES
-- =====================================================

CREATE TYPE public.account_type AS ENUM ('buyer', 'seller', 'both');
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.card_condition AS ENUM ('raw', 'psa1', 'psa2', 'psa3', 'psa4', 'psa5', 'psa6', 'psa7', 'psa8', 'psa9', 'psa10', 'bgs9', 'bgs9_5', 'bgs10', 'cgc9', 'cgc9_5', 'cgc10');
CREATE TYPE public.delivery_option AS ENUM ('vault', 'trade', 'ship');
CREATE TYPE public.discussion_reaction_type AS ENUM ('insightful', 'outdated', 'contradicted');
CREATE TYPE public.discussion_type AS ENUM ('card', 'event', 'strategy');
CREATE TYPE public.liquidity_level AS ENUM ('high', 'medium', 'low');
CREATE TYPE public.listing_status AS ENUM ('active', 'sold', 'cancelled', 'reserved');
CREATE TYPE public.offer_status AS ENUM ('pending', 'accepted', 'rejected', 'countered', 'expired', 'cancelled');
CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'processing', 'shipped', 'delivered', 'completed', 'cancelled');
CREATE TYPE public.reward_status AS ENUM ('available', 'claimed', 'expired', 'used');
CREATE TYPE public.reward_type AS ENUM ('voucher', 'free_shipping', 'early_access', 'exclusive_drop');
CREATE TYPE public.trade_status AS ENUM ('proposed', 'pending_photos', 'photos_submitted', 'pending_confirmation', 'confirmed', 'in_transit', 'completed', 'cancelled', 'disputed');
CREATE TYPE public.transaction_type AS ENUM ('topup', 'purchase', 'sale', 'fee', 'subscription', 'withdrawal');
CREATE TYPE public.verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.waitlist_interest AS ENUM ('buyer', 'seller', 'both');
CREATE TYPE public.wire_transfer_status AS ENUM ('pending', 'matched', 'confirmed', 'rejected');
CREATE TYPE public.xp_action_type AS ENUM ('purchase', 'sale', 'listing', 'referral', 'daily_login', 'review', 'first_purchase', 'streak_bonus');

-- =====================================================
-- PART 3: TABLES
-- =====================================================

-- profiles (core user table)
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  email text,
  display_name text,
  avatar_url text,
  account_type public.account_type DEFAULT 'buyer'::account_type,
  referral_code text,
  referred_by uuid,
  xp integer DEFAULT 0,
  level integer DEFAULT 1,
  reputation_score integer DEFAULT 100,
  reputation_tier text DEFAULT 'bronze'::text,
  first_deposit_completed boolean DEFAULT false,
  first_deposit_at timestamp with time zone,
  activation_unlocked boolean DEFAULT false,
  premium_trial_expires_at timestamp with time zone,
  wire_transfer_code text,
  selected_background text DEFAULT 'default'::text,
  selected_guru text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- wallets
CREATE TABLE public.wallets (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  balance numeric DEFAULT 0 NOT NULL,
  pending_balance numeric DEFAULT 0,
  currency text DEFAULT 'USD'::text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- transactions
CREATE TABLE public.transactions (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  wallet_id uuid NOT NULL,
  type public.transaction_type NOT NULL,
  amount numeric NOT NULL,
  description text,
  reference_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- market_items (catalog)
CREATE TABLE public.market_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  subcategory text,
  base_price numeric NOT NULL,
  current_price numeric NOT NULL,
  change_24h numeric DEFAULT 0,
  change_7d numeric DEFAULT 0,
  change_30d numeric DEFAULT 0,
  price_24h_ago numeric,
  price_7d_ago numeric,
  price_30d_ago numeric,
  image_url text,
  set_name text,
  rarity text,
  series text,
  character_name text,
  liquidity public.liquidity_level DEFAULT 'medium'::liquidity_level,
  is_trending boolean DEFAULT false,
  watchlist_count integer DEFAULT 0,
  views_24h integer DEFAULT 0,
  views_7d integer DEFAULT 0,
  sales_count_30d integer DEFAULT 0,
  last_sale_price numeric,
  last_sale_at timestamp with time zone,
  avg_days_to_sell numeric,
  sale_probability numeric,
  volume_trend text,
  data_source text,
  external_id text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- price_history
CREATE TABLE public.price_history (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  market_item_id uuid NOT NULL,
  price numeric NOT NULL,
  source text DEFAULT 'system'::text,
  recorded_at timestamp with time zone DEFAULT now() NOT NULL
);

-- listings
CREATE TABLE public.listings (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  seller_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  condition text DEFAULT 'Near Mint'::text NOT NULL,
  price numeric NOT NULL,
  image_url text,
  status public.listing_status DEFAULT 'active'::listing_status NOT NULL,
  allows_trade boolean DEFAULT true NOT NULL,
  allows_shipping boolean DEFAULT true NOT NULL,
  allows_vault boolean DEFAULT true NOT NULL,
  external_id text,
  external_price numeric,
  source text DEFAULT 'user'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- orders
CREATE TABLE public.orders (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  listing_id uuid,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  price numeric NOT NULL,
  buyer_fee numeric DEFAULT 0,
  seller_fee numeric DEFAULT 0,
  delivery_option public.delivery_option DEFAULT 'vault'::delivery_option,
  shipping_address jsonb,
  tracking_number text,
  status public.order_status DEFAULT 'pending'::order_status NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- achievements
CREATE TABLE public.achievements (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  icon text DEFAULT '🏆'::text NOT NULL,
  category text DEFAULT 'general'::text NOT NULL,
  tier text DEFAULT 'bronze'::text NOT NULL,
  xp_reward integer DEFAULT 50 NOT NULL,
  requirement_type text NOT NULL,
  requirement_value integer DEFAULT 1 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- user_achievements
CREATE TABLE public.user_achievements (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL,
  unlocked_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, achievement_id)
);

-- user_roles
CREATE TABLE public.user_roles (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- notifications
CREATE TABLE public.notifications (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- watchlist
CREATE TABLE public.watchlist (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  market_item_id uuid NOT NULL,
  target_price numeric,
  notify_on_price_drop boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, market_item_id)
);

-- portfolio_items
CREATE TABLE public.portfolio_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  market_item_id uuid NOT NULL,
  quantity integer DEFAULT 1,
  purchase_price numeric,
  purchase_date timestamp with time zone,
  notes text,
  grade text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, market_item_id)
);

-- portfolio_heat_scores
CREATE TABLE public.portfolio_heat_scores (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  score integer DEFAULT 0,
  price_movement_score integer DEFAULT 0,
  views_score integer DEFAULT 0,
  liquidity_score integer DEFAULT 0,
  calculated_at date DEFAULT CURRENT_DATE,
  UNIQUE(user_id, calculated_at)
);

-- reviews
CREATE TABLE public.reviews (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  order_id uuid,
  reviewer_id uuid NOT NULL,
  reviewed_id uuid NOT NULL,
  review_type text DEFAULT 'buyer_to_seller'::text,
  rating integer NOT NULL,
  comment text,
  photos text[],
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- verified_sellers
CREATE TABLE public.verified_sellers (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  status public.verification_status DEFAULT 'pending'::verification_status,
  business_name text,
  business_address text,
  tax_id text,
  id_document_url text,
  submitted_at timestamp with time zone DEFAULT now(),
  approved_at timestamp with time zone,
  rejected_reason text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- conversations
CREATE TABLE public.conversations (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  participant_1 uuid NOT NULL,
  participant_2 uuid NOT NULL,
  listing_id uuid,
  last_message_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(participant_1, participant_2, listing_id)
);

-- messages
CREATE TABLE public.messages (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- offers
CREATE TABLE public.offers (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  listing_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  amount numeric NOT NULL,
  counter_amount numeric,
  message text,
  status public.offer_status DEFAULT 'pending'::offer_status,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- trades
CREATE TABLE public.trades (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  initiator_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  status public.trade_status DEFAULT 'proposed'::trade_status,
  initiator_photos text[],
  recipient_photos text[],
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- trade_items
CREATE TABLE public.trade_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  trade_id uuid NOT NULL,
  user_id uuid NOT NULL,
  listing_id uuid,
  item_description text NOT NULL,
  estimated_value numeric,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- vault_items
CREATE TABLE public.vault_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  order_id uuid,
  listing_id uuid,
  item_name text NOT NULL,
  category text NOT NULL,
  condition text,
  image_url text,
  acquired_price numeric,
  current_value numeric,
  storage_location text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- referrals
CREATE TABLE public.referrals (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  referral_code text NOT NULL,
  status text DEFAULT 'pending'::text,
  reward_amount numeric DEFAULT 0,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(referred_id)
);

-- referral_commissions
CREATE TABLE public.referral_commissions (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  order_id uuid NOT NULL,
  commission_amount numeric NOT NULL,
  commission_rate numeric DEFAULT 0.01,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- xp_history
CREATE TABLE public.xp_history (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  action public.xp_action_type NOT NULL,
  xp_amount integer NOT NULL,
  description text,
  reference_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- daily_logins
CREATE TABLE public.daily_logins (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  login_date date DEFAULT CURRENT_DATE NOT NULL,
  streak_count integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, login_date)
);

-- rewards_catalog
CREATE TABLE public.rewards_catalog (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  name text NOT NULL,
  description text,
  type public.reward_type NOT NULL,
  xp_cost integer NOT NULL,
  value numeric,
  image_url text,
  quantity_available integer,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- user_rewards
CREATE TABLE public.user_rewards (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  reward_id uuid NOT NULL,
  status public.reward_status DEFAULT 'available'::reward_status,
  claimed_at timestamp with time zone DEFAULT now(),
  used_at timestamp with time zone,
  expires_at timestamp with time zone
);

-- user_subscriptions
CREATE TABLE public.user_subscriptions (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  tier text DEFAULT 'free'::text,
  price_monthly numeric DEFAULT 0,
  started_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  auto_renew boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- price_alerts
CREATE TABLE public.price_alerts (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  market_item_id uuid NOT NULL,
  target_price numeric NOT NULL,
  alert_type text DEFAULT 'below'::text,
  is_active boolean DEFAULT true,
  triggered_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- discussions
CREATE TABLE public.discussions (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  market_item_id uuid,
  title text NOT NULL,
  description text,
  type public.discussion_type NOT NULL,
  event_type text,
  price_at_creation numeric,
  upvotes integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  sentiment_score numeric DEFAULT 0,
  language text DEFAULT 'en'::text,
  is_active boolean DEFAULT true,
  is_admin_created boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- discussion_comments
CREATE TABLE public.discussion_comments (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  discussion_id uuid NOT NULL,
  user_id uuid NOT NULL,
  parent_id uuid,
  content text NOT NULL,
  stance text,
  price_at_post numeric,
  insightful_count integer DEFAULT 0,
  outdated_count integer DEFAULT 0,
  contradicted_count integer DEFAULT 0,
  relevance_score numeric DEFAULT 0,
  accuracy_score numeric,
  is_collapsed boolean DEFAULT false,
  collapse_reason text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- discussion_votes
CREATE TABLE public.discussion_votes (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  discussion_id uuid NOT NULL,
  user_id uuid NOT NULL,
  vote_type text DEFAULT 'up'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(discussion_id, user_id)
);

-- discussion_reactions
CREATE TABLE public.discussion_reactions (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  comment_id uuid NOT NULL,
  user_id uuid NOT NULL,
  reaction_type public.discussion_reaction_type NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(comment_id, user_id)
);

-- follows
CREATE TABLE public.follows (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(follower_id, following_id)
);

-- bids (wanted board)
CREATE TABLE public.bids (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  market_item_id uuid,
  item_name text NOT NULL,
  category text NOT NULL,
  grade text DEFAULT 'any'::text,
  bid_amount numeric NOT NULL,
  max_bid numeric,
  notes text,
  status text DEFAULT 'active'::text NOT NULL,
  expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- market_item_grades
CREATE TABLE public.market_item_grades (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  market_item_id uuid NOT NULL,
  grade public.card_condition NOT NULL,
  current_price numeric DEFAULT 0 NOT NULL,
  change_24h numeric DEFAULT 0,
  change_7d numeric DEFAULT 0,
  change_30d numeric DEFAULT 0,
  last_sale_price numeric,
  sales_count_30d integer DEFAULT 0,
  avg_days_to_sell numeric,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(market_item_id, grade)
);

-- wire_transfers
CREATE TABLE public.wire_transfers (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'TRY'::text,
  reference_code text NOT NULL,
  sender_name text,
  sender_iban text,
  status public.wire_transfer_status DEFAULT 'pending'::wire_transfer_status,
  matched_at timestamp with time zone,
  confirmed_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- pending_payments
CREATE TABLE public.pending_payments (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'USD'::text,
  payment_method text NOT NULL,
  status text DEFAULT 'pending'::text,
  iyzico_token text,
  iyzico_conversation_id text,
  callback_url text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- api_subscriptions
CREATE TABLE public.api_subscriptions (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  api_key uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  plan text DEFAULT 'basic'::text NOT NULL,
  price_monthly numeric DEFAULT 30 NOT NULL,
  requests_today integer DEFAULT 0 NOT NULL,
  requests_limit integer DEFAULT 10000 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- api_request_logs
CREATE TABLE public.api_request_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  api_key uuid NOT NULL,
  endpoint text NOT NULL,
  response_code integer,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- creator_profiles
CREATE TABLE public.creator_profiles (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  creator_name text NOT NULL,
  username text UNIQUE,
  platform text NOT NULL,
  platform_handle text,
  bio text,
  avatar_url text,
  cover_image_url text,
  specialty_categories text[] DEFAULT '{}'::text[],
  is_verified boolean DEFAULT false,
  is_public boolean DEFAULT true,
  watchlist_public boolean DEFAULT true,
  portfolio_public boolean DEFAULT true,
  follower_count integer DEFAULT 0,
  total_calls integer DEFAULT 0,
  accurate_calls integer DEFAULT 0,
  accuracy_rate numeric DEFAULT 0,
  total_views integer DEFAULT 0,
  referral_clicks integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- creator_followers
CREATE TABLE public.creator_followers (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  creator_id uuid NOT NULL,
  follower_user_id uuid NOT NULL,
  referral_source text,
  followed_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(creator_id, follower_user_id)
);

-- creator_watchlists
CREATE TABLE public.creator_watchlists (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  creator_id uuid NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  thesis text,
  is_public boolean DEFAULT true,
  views_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(creator_id, slug)
);

-- creator_watchlist_items
CREATE TABLE public.creator_watchlist_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  watchlist_id uuid NOT NULL,
  market_item_id uuid NOT NULL,
  price_when_added numeric NOT NULL,
  price_when_removed numeric,
  note text,
  is_active boolean DEFAULT true,
  added_at timestamp with time zone DEFAULT now() NOT NULL,
  removed_at timestamp with time zone
);

-- creator_market_calls
CREATE TABLE public.creator_market_calls (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  creator_id uuid NOT NULL,
  market_item_id uuid NOT NULL,
  call_type text NOT NULL,
  price_at_call numeric NOT NULL,
  current_price numeric,
  price_change_percent numeric,
  thesis text,
  time_to_exit_days integer,
  volume_at_call integer,
  liquidity_at_call text,
  outcome_status text DEFAULT 'active'::text,
  outcome_updated_at timestamp with time zone,
  is_public boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- creator_call_followups
CREATE TABLE public.creator_call_followups (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  call_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  content text NOT NULL,
  price_at_followup numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- creator_picks
CREATE TABLE public.creator_picks (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  creator_id uuid NOT NULL,
  market_item_id uuid NOT NULL,
  pick_type text NOT NULL,
  price_at_pick numeric,
  note text,
  is_public boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(creator_id, market_item_id)
);

-- creator_analytics
CREATE TABLE public.creator_analytics (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  creator_id uuid NOT NULL,
  date date DEFAULT CURRENT_DATE NOT NULL,
  page_views integer DEFAULT 0,
  unique_visitors integer DEFAULT 0,
  watchlist_views integer DEFAULT 0,
  call_views integer DEFAULT 0,
  new_followers integer DEFAULT 0,
  referral_clicks integer DEFAULT 0,
  UNIQUE(creator_id, date)
);

-- fractional_listings
CREATE TABLE public.fractional_listings (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  owner_id uuid NOT NULL,
  listing_id uuid,
  market_item_id uuid,
  total_shares integer DEFAULT 100 NOT NULL,
  available_shares integer DEFAULT 100 NOT NULL,
  share_price numeric NOT NULL,
  min_shares integer DEFAULT 10 NOT NULL,
  allows_fractional boolean DEFAULT true NOT NULL,
  daily_verification_required boolean DEFAULT true NOT NULL,
  last_verified_at timestamp with time zone,
  next_verification_due timestamp with time zone,
  status text DEFAULT 'active'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- fractional_ownership
CREATE TABLE public.fractional_ownership (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  fractional_listing_id uuid NOT NULL,
  user_id uuid NOT NULL,
  shares_owned integer NOT NULL,
  purchase_price_per_share numeric NOT NULL,
  total_invested numeric NOT NULL,
  purchased_at timestamp with time zone DEFAULT now() NOT NULL
);

-- fractional_share_listings
CREATE TABLE public.fractional_share_listings (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  fractional_listing_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  shares_for_sale integer NOT NULL,
  price_per_share numeric NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- fractional_verifications
CREATE TABLE public.fractional_verifications (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  fractional_listing_id uuid NOT NULL,
  verified_by uuid NOT NULL,
  verification_type text DEFAULT 'photo'::text NOT NULL,
  photo_url text,
  notes text,
  status text DEFAULT 'verified'::text NOT NULL,
  verified_at timestamp with time zone DEFAULT now() NOT NULL
);

-- auto_buy_config
CREATE TABLE public.auto_buy_config (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  is_enabled boolean DEFAULT true NOT NULL,
  discount_threshold numeric DEFAULT 0.60 NOT NULL,
  max_buy_amount numeric DEFAULT 10000,
  system_buyer_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- auto_buy_logs
CREATE TABLE public.auto_buy_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  listing_id uuid,
  market_item_id uuid,
  listing_price numeric NOT NULL,
  market_price numeric NOT NULL,
  discount_percent numeric NOT NULL,
  order_id uuid,
  status text DEFAULT 'pending'::text NOT NULL,
  error_message text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- auto_relist_settings
CREATE TABLE public.auto_relist_settings (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  listing_id uuid NOT NULL UNIQUE,
  seller_id uuid NOT NULL,
  original_price numeric NOT NULL,
  min_price numeric,
  price_reduction_percent numeric DEFAULT 2,
  reduction_interval_hours integer DEFAULT 48,
  price_ladder_enabled boolean DEFAULT false,
  current_suggested_price numeric,
  last_reduction_at timestamp with time zone,
  days_until_suggest integer DEFAULT 7,
  enabled boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ebay_card_cache
CREATE TABLE public.ebay_card_cache (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  card_name text NOT NULL,
  search_query text NOT NULL,
  set_name text,
  card_number text,
  avg_price numeric,
  min_price numeric,
  max_price numeric,
  sold_avg_price numeric,
  active_listings_count integer DEFAULT 0,
  sold_listings_count integer DEFAULT 0,
  liquidity text DEFAULT 'low'::text,
  image_url text,
  cached_image_path text,
  ebay_item_ids text[],
  created_at timestamp with time zone DEFAULT now(),
  last_updated timestamp with time zone DEFAULT now()
);

-- external_liquidity_signals
CREATE TABLE public.external_liquidity_signals (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  market_item_id uuid,
  platform text NOT NULL,
  volume_24h integer DEFAULT 0,
  avg_price numeric,
  spread_percent numeric,
  liquidity_level text DEFAULT 'medium'::text,
  is_recommended boolean DEFAULT false,
  recommendation_reason text,
  last_updated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- item_views
CREATE TABLE public.item_views (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  market_item_id uuid NOT NULL,
  user_id uuid,
  session_id text,
  viewed_at timestamp with time zone DEFAULT now() NOT NULL
);

-- listing_comments
CREATE TABLE public.listing_comments (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  listing_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- market_controls
CREATE TABLE public.market_controls (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  control_type text NOT NULL,
  target_category text,
  target_pattern text,
  threshold_value numeric,
  reason text NOT NULL,
  is_active boolean DEFAULT true,
  activated_by uuid,
  activated_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- market_memory
CREATE TABLE public.market_memory (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  market_item_id uuid NOT NULL,
  event_type text NOT NULL,
  price_at_event numeric NOT NULL,
  current_price numeric,
  price_diff numeric,
  notes text,
  event_date timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- notification_preferences
CREATE TABLE public.notification_preferences (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  price_alerts boolean DEFAULT true,
  order_updates boolean DEFAULT true,
  new_listings boolean DEFAULT true,
  marketing boolean DEFAULT false,
  push_enabled boolean DEFAULT false,
  push_subscription jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- platform_settings
CREATE TABLE public.platform_settings (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  updated_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- price_votes
CREATE TABLE public.price_votes (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  market_item_id uuid NOT NULL,
  user_id uuid NOT NULL,
  vote_type text NOT NULL,
  suggested_price numeric,
  reason text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(market_item_id, user_id)
);

-- profile_backgrounds
CREATE TABLE public.profile_backgrounds (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  name text NOT NULL,
  key text NOT NULL UNIQUE,
  css_class text NOT NULL,
  unlock_type text DEFAULT 'free'::text,
  unlock_requirement text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- receipts
CREATE TABLE public.receipts (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  order_id uuid NOT NULL,
  receipt_number text NOT NULL UNIQUE,
  buyer_info jsonb,
  seller_info jsonb,
  items jsonb NOT NULL,
  subtotal numeric NOT NULL,
  fees numeric DEFAULT 0,
  total numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- reference_listings
CREATE TABLE public.reference_listings (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  market_item_id uuid NOT NULL,
  platform text NOT NULL,
  external_id text,
  title text NOT NULL,
  price numeric NOT NULL,
  condition text,
  url text,
  sold_at timestamp with time zone,
  is_sold boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- regret_simulations
CREATE TABLE public.regret_simulations (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  market_item_id uuid NOT NULL,
  simulation_type text NOT NULL,
  entry_price numeric NOT NULL,
  exit_price numeric NOT NULL,
  potential_profit numeric NOT NULL,
  actual_outcome text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- reputation_events
CREATE TABLE public.reputation_events (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  points_change integer NOT NULL,
  reference_id uuid,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- shadow_wishlists
CREATE TABLE public.shadow_wishlists (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  market_item_id uuid NOT NULL,
  view_count integer DEFAULT 0,
  total_view_duration integer DEFAULT 0,
  search_count integer DEFAULT 0,
  last_viewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, market_item_id)
);

-- tournament_entries
CREATE TABLE public.tournament_entries (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  tournament_id text NOT NULL,
  score integer DEFAULT 0,
  rank integer,
  trades_completed integer DEFAULT 0,
  volume_traded numeric DEFAULT 0,
  accuracy_score numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, tournament_id)
);

-- user_ibans
CREATE TABLE public.user_ibans (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  iban text NOT NULL,
  account_holder_name text NOT NULL,
  bank_name text,
  is_verified boolean DEFAULT false,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- user_market_signals
CREATE TABLE public.user_market_signals (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  market_item_id uuid NOT NULL,
  signal_type text NOT NULL,
  confidence numeric DEFAULT 50,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- user_unlocked_backgrounds
CREATE TABLE public.user_unlocked_backgrounds (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  background_key text NOT NULL,
  unlocked_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, background_key)
);

-- waitlist
CREATE TABLE public.waitlist (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text,
  interest public.waitlist_interest DEFAULT 'both'::waitlist_interest,
  referral_source text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- wallet_audit_log
CREATE TABLE public.wallet_audit_log (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  wallet_id uuid NOT NULL,
  action text NOT NULL,
  old_balance numeric,
  new_balance numeric,
  amount numeric NOT NULL,
  reason text,
  performed_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- whale_invites
CREATE TABLE public.whale_invites (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  email text NOT NULL UNIQUE,
  invite_code text NOT NULL UNIQUE,
  portfolio_minimum numeric DEFAULT 10000,
  benefits jsonb,
  status text DEFAULT 'pending'::text,
  invited_by uuid,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- data_access_levels
CREATE TABLE public.data_access_levels (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  data_type text NOT NULL,
  field_name text NOT NULL,
  access_level text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(data_type, field_name)
);

-- =====================================================
-- PART 4: INDEXES
-- =====================================================

CREATE INDEX idx_price_history_item ON public.price_history(market_item_id);
CREATE INDEX idx_price_history_date ON public.price_history(recorded_at);
CREATE INDEX idx_market_items_category ON public.market_items(category);
CREATE INDEX idx_market_items_trending ON public.market_items(is_trending);
CREATE INDEX idx_market_items_name ON public.market_items USING gin(name gin_trgm_ops);
CREATE INDEX idx_listings_seller ON public.listings(seller_id);
CREATE INDEX idx_listings_status ON public.listings(status);
CREATE INDEX idx_listings_category ON public.listings(category);
CREATE INDEX idx_orders_buyer ON public.orders(buyer_id);
CREATE INDEX idx_orders_seller ON public.orders(seller_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read);
CREATE INDEX idx_watchlist_user ON public.watchlist(user_id);
CREATE INDEX idx_portfolio_user ON public.portfolio_items(user_id);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_xp_history_user ON public.xp_history(user_id);
CREATE INDEX idx_daily_logins_user_date ON public.daily_logins(user_id, login_date);
CREATE INDEX idx_bids_market_item ON public.bids(market_item_id);
CREATE INDEX idx_bids_status ON public.bids(status);
CREATE INDEX idx_bids_user ON public.bids(user_id);
CREATE INDEX idx_discussions_market_item ON public.discussions(market_item_id);
CREATE INDEX idx_discussions_type ON public.discussions(type);
CREATE INDEX idx_comments_discussion ON public.discussion_comments(discussion_id);
CREATE INDEX idx_comments_relevance ON public.discussion_comments(relevance_score DESC);
CREATE INDEX idx_creator_profiles_username ON public.creator_profiles(username);
CREATE INDEX idx_creator_followers_creator ON public.creator_followers(creator_id);
CREATE INDEX idx_creator_market_calls_creator ON public.creator_market_calls(creator_id);
CREATE INDEX idx_creator_market_calls_item ON public.creator_market_calls(market_item_id);
CREATE INDEX idx_creator_watchlists_creator ON public.creator_watchlists(creator_id);
CREATE INDEX idx_creator_analytics_creator_date ON public.creator_analytics(creator_id, date);
CREATE INDEX idx_api_subscriptions_api_key ON public.api_subscriptions(api_key);
CREATE INDEX idx_reference_listings_item ON public.reference_listings(market_item_id);
CREATE INDEX idx_reference_listings_platform ON public.reference_listings(platform);

-- =====================================================
-- PART 5: FOREIGN KEY CONSTRAINTS
-- =====================================================

ALTER TABLE public.price_history ADD CONSTRAINT price_history_market_item_id_fkey FOREIGN KEY (market_item_id) REFERENCES public.market_items(id) ON DELETE CASCADE;
ALTER TABLE public.watchlist ADD CONSTRAINT watchlist_market_item_id_fkey FOREIGN KEY (market_item_id) REFERENCES public.market_items(id) ON DELETE CASCADE;
ALTER TABLE public.portfolio_items ADD CONSTRAINT portfolio_items_market_item_id_fkey FOREIGN KEY (market_item_id) REFERENCES public.market_items(id) ON DELETE CASCADE;
ALTER TABLE public.market_item_grades ADD CONSTRAINT market_item_grades_market_item_id_fkey FOREIGN KEY (market_item_id) REFERENCES public.market_items(id) ON DELETE CASCADE;
ALTER TABLE public.bids ADD CONSTRAINT bids_market_item_id_fkey FOREIGN KEY (market_item_id) REFERENCES public.market_items(id);
ALTER TABLE public.discussions ADD CONSTRAINT discussions_market_item_id_fkey FOREIGN KEY (market_item_id) REFERENCES public.market_items(id);
ALTER TABLE public.discussion_comments ADD CONSTRAINT discussion_comments_discussion_id_fkey FOREIGN KEY (discussion_id) REFERENCES public.discussions(id) ON DELETE CASCADE;
ALTER TABLE public.discussion_comments ADD CONSTRAINT discussion_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.discussion_comments(id);
ALTER TABLE public.discussion_votes ADD CONSTRAINT discussion_votes_discussion_id_fkey FOREIGN KEY (discussion_id) REFERENCES public.discussions(id) ON DELETE CASCADE;
ALTER TABLE public.discussion_reactions ADD CONSTRAINT discussion_reactions_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.discussion_comments(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id);
ALTER TABLE public.offers ADD CONSTRAINT offers_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id);
ALTER TABLE public.orders ADD CONSTRAINT orders_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id);
ALTER TABLE public.trade_items ADD CONSTRAINT trade_items_trade_id_fkey FOREIGN KEY (trade_id) REFERENCES public.trades(id) ON DELETE CASCADE;
ALTER TABLE public.trade_items ADD CONSTRAINT trade_items_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id);
ALTER TABLE public.auto_relist_settings ADD CONSTRAINT auto_relist_settings_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;
ALTER TABLE public.listing_comments ADD CONSTRAINT listing_comments_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;
ALTER TABLE public.auto_buy_logs ADD CONSTRAINT auto_buy_logs_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id);
ALTER TABLE public.auto_buy_logs ADD CONSTRAINT auto_buy_logs_market_item_id_fkey FOREIGN KEY (market_item_id) REFERENCES public.market_items(id);
ALTER TABLE public.auto_buy_logs ADD CONSTRAINT auto_buy_logs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);
ALTER TABLE public.creator_followers ADD CONSTRAINT creator_followers_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creator_profiles(id) ON DELETE CASCADE;
ALTER TABLE public.creator_watchlists ADD CONSTRAINT creator_watchlists_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creator_profiles(id) ON DELETE CASCADE;
ALTER TABLE public.creator_watchlist_items ADD CONSTRAINT creator_watchlist_items_watchlist_id_fkey FOREIGN KEY (watchlist_id) REFERENCES public.creator_watchlists(id) ON DELETE CASCADE;
ALTER TABLE public.creator_watchlist_items ADD CONSTRAINT creator_watchlist_items_market_item_id_fkey FOREIGN KEY (market_item_id) REFERENCES public.market_items(id);
ALTER TABLE public.creator_market_calls ADD CONSTRAINT creator_market_calls_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creator_profiles(id) ON DELETE CASCADE;
ALTER TABLE public.creator_market_calls ADD CONSTRAINT creator_market_calls_market_item_id_fkey FOREIGN KEY (market_item_id) REFERENCES public.market_items(id);
ALTER TABLE public.creator_call_followups ADD CONSTRAINT creator_call_followups_call_id_fkey FOREIGN KEY (call_id) REFERENCES public.creator_market_calls(id) ON DELETE CASCADE;
ALTER TABLE public.creator_call_followups ADD CONSTRAINT creator_call_followups_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creator_profiles(id);
ALTER TABLE public.creator_picks ADD CONSTRAINT creator_picks_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creator_profiles(id) ON DELETE CASCADE;
ALTER TABLE public.creator_picks ADD CONSTRAINT creator_picks_market_item_id_fkey FOREIGN KEY (market_item_id) REFERENCES public.market_items(id);
ALTER TABLE public.creator_analytics ADD CONSTRAINT creator_analytics_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creator_profiles(id) ON DELETE CASCADE;
ALTER TABLE public.fractional_listings ADD CONSTRAINT fractional_listings_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id);
ALTER TABLE public.fractional_listings ADD CONSTRAINT fractional_listings_market_item_id_fkey FOREIGN KEY (market_item_id) REFERENCES public.market_items(id);
ALTER TABLE public.fractional_ownership ADD CONSTRAINT fractional_ownership_fractional_listing_id_fkey FOREIGN KEY (fractional_listing_id) REFERENCES public.fractional_listings(id);
ALTER TABLE public.fractional_share_listings ADD CONSTRAINT fractional_share_listings_fractional_listing_id_fkey FOREIGN KEY (fractional_listing_id) REFERENCES public.fractional_listings(id);
ALTER TABLE public.fractional_verifications ADD CONSTRAINT fractional_verifications_fractional_listing_id_fkey FOREIGN KEY (fractional_listing_id) REFERENCES public.fractional_listings(id);
ALTER TABLE public.external_liquidity_signals ADD CONSTRAINT external_liquidity_signals_market_item_id_fkey FOREIGN KEY (market_item_id) REFERENCES public.market_items(id);
ALTER TABLE public.item_views ADD CONSTRAINT item_views_market_item_id_fkey FOREIGN KEY (market_item_id) REFERENCES public.market_items(id);
ALTER TABLE public.price_alerts ADD CONSTRAINT price_alerts_market_item_id_fkey FOREIGN KEY (market_item_id) REFERENCES public.market_items(id);
ALTER TABLE public.price_votes ADD CONSTRAINT price_votes_market_item_id_fkey FOREIGN KEY (market_item_id) REFERENCES public.market_items(id);
ALTER TABLE public.reference_listings ADD CONSTRAINT reference_listings_market_item_id_fkey FOREIGN KEY (market_item_id) REFERENCES public.market_items(id);
ALTER TABLE public.regret_simulations ADD CONSTRAINT regret_simulations_market_item_id_fkey FOREIGN KEY (market_item_id) REFERENCES public.market_items(id);
ALTER TABLE public.shadow_wishlists ADD CONSTRAINT shadow_wishlists_market_item_id_fkey FOREIGN KEY (market_item_id) REFERENCES public.market_items(id);
ALTER TABLE public.user_market_signals ADD CONSTRAINT user_market_signals_market_item_id_fkey FOREIGN KEY (market_item_id) REFERENCES public.market_items(id);
ALTER TABLE public.market_memory ADD CONSTRAINT market_memory_market_item_id_fkey FOREIGN KEY (market_item_id) REFERENCES public.market_items(id);
ALTER TABLE public.user_achievements ADD CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id);
ALTER TABLE public.user_rewards ADD CONSTRAINT user_rewards_reward_id_fkey FOREIGN KEY (reward_id) REFERENCES public.rewards_catalog(id);
ALTER TABLE public.transactions ADD CONSTRAINT transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);
ALTER TABLE public.wallet_audit_log ADD CONSTRAINT wallet_audit_log_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);
ALTER TABLE public.receipts ADD CONSTRAINT receipts_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);
ALTER TABLE public.referral_commissions ADD CONSTRAINT referral_commissions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);
ALTER TABLE public.reviews ADD CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);
ALTER TABLE public.vault_items ADD CONSTRAINT vault_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);
ALTER TABLE public.vault_items ADD CONSTRAINT vault_items_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id);
