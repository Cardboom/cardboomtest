-- =====================================================
-- CARDBOOM ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_buy_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_buy_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_relist_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_call_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_market_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_access_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebay_card_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_liquidity_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fractional_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fractional_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fractional_share_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fractional_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_item_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_heat_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_backgrounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regret_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reputation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shadow_wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ibans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_market_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_unlocked_backgrounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whale_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wire_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES
-- =====================================================
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- WALLETS
-- =====================================================
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create wallets" ON public.wallets FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update wallets" ON public.wallets FOR UPDATE USING (true);

-- =====================================================
-- TRANSACTIONS
-- =====================================================
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (EXISTS (SELECT 1 FROM wallets WHERE wallets.id = transactions.wallet_id AND wallets.user_id = auth.uid()));
CREATE POLICY "System can create transactions" ON public.transactions FOR INSERT WITH CHECK (true);

-- =====================================================
-- MARKET ITEMS (PUBLIC CATALOG)
-- =====================================================
CREATE POLICY "Anyone can view market items" ON public.market_items FOR SELECT USING (true);
CREATE POLICY "System can manage market items" ON public.market_items FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- PRICE HISTORY (PUBLIC)
-- =====================================================
CREATE POLICY "Anyone can view price history" ON public.price_history FOR SELECT USING (true);
CREATE POLICY "System can insert price history" ON public.price_history FOR INSERT WITH CHECK (true);

-- =====================================================
-- MARKET ITEM GRADES (PUBLIC)
-- =====================================================
CREATE POLICY "Anyone can view grades" ON public.market_item_grades FOR SELECT USING (true);

-- =====================================================
-- LISTINGS
-- =====================================================
CREATE POLICY "Anyone can view active listings" ON public.listings FOR SELECT USING (status = 'active' OR seller_id = auth.uid());
CREATE POLICY "Users can create listings" ON public.listings FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update own listings" ON public.listings FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete own listings" ON public.listings FOR DELETE USING (auth.uid() = seller_id);

-- =====================================================
-- ORDERS
-- =====================================================
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Users can create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Participants can update orders" ON public.orders FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- =====================================================
-- ACHIEVEMENTS
-- =====================================================
CREATE POLICY "Anyone can view achievements" ON public.achievements FOR SELECT USING (is_active = true);

-- =====================================================
-- USER ACHIEVEMENTS
-- =====================================================
CREATE POLICY "Users can view own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage user achievements" ON public.user_achievements FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- USER ROLES
-- =====================================================
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- WATCHLIST
-- =====================================================
CREATE POLICY "Users can view own watchlist" ON public.watchlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own watchlist" ON public.watchlist FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- PORTFOLIO ITEMS
-- =====================================================
CREATE POLICY "Users can view own portfolio" ON public.portfolio_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own portfolio" ON public.portfolio_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- PORTFOLIO HEAT SCORES
-- =====================================================
CREATE POLICY "Users can view own heat scores" ON public.portfolio_heat_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage heat scores" ON public.portfolio_heat_scores FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- REVIEWS
-- =====================================================
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- =====================================================
-- VERIFIED SELLERS
-- =====================================================
CREATE POLICY "Anyone can view verified sellers" ON public.verified_sellers FOR SELECT USING (status = 'approved');
CREATE POLICY "Users can submit verification" ON public.verified_sellers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own verification" ON public.verified_sellers FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- CONVERSATIONS & MESSAGES
-- =====================================================
CREATE POLICY "Participants can view conversations" ON public.conversations FOR SELECT USING (auth.uid() = participant_1 OR auth.uid() = participant_2);
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Participants can view messages" ON public.messages FOR SELECT USING (EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())));
CREATE POLICY "Participants can send messages" ON public.messages FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())));
CREATE POLICY "Users can mark messages read" ON public.messages FOR UPDATE USING (EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())));

-- =====================================================
-- OFFERS
-- =====================================================
CREATE POLICY "Participants can view offers" ON public.offers FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Users can create offers" ON public.offers FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Participants can update offers" ON public.offers FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- =====================================================
-- TRADES
-- =====================================================
CREATE POLICY "Participants can view trades" ON public.trades FOR SELECT USING (auth.uid() = initiator_id OR auth.uid() = recipient_id);
CREATE POLICY "Users can create trades" ON public.trades FOR INSERT WITH CHECK (auth.uid() = initiator_id);
CREATE POLICY "Participants can update trades" ON public.trades FOR UPDATE USING (auth.uid() = initiator_id OR auth.uid() = recipient_id);

CREATE POLICY "Participants can view trade items" ON public.trade_items FOR SELECT USING (EXISTS (SELECT 1 FROM trades WHERE trades.id = trade_items.trade_id AND (trades.initiator_id = auth.uid() OR trades.recipient_id = auth.uid())));
CREATE POLICY "Participants can add trade items" ON public.trade_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM trades WHERE trades.id = trade_items.trade_id AND (trades.initiator_id = auth.uid() OR trades.recipient_id = auth.uid())));

-- =====================================================
-- VAULT ITEMS
-- =====================================================
CREATE POLICY "Users can view own vault items" ON public.vault_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage vault items" ON public.vault_items FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- REFERRALS
-- =====================================================
CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "System can manage referrals" ON public.referrals FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view own commissions" ON public.referral_commissions FOR SELECT USING (auth.uid() = referrer_id);
CREATE POLICY "System can create commissions" ON public.referral_commissions FOR INSERT WITH CHECK (true);

-- =====================================================
-- XP & DAILY LOGINS
-- =====================================================
CREATE POLICY "Users can view own xp history" ON public.xp_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage xp" ON public.xp_history FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view their logins" ON public.daily_logins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can log daily login" ON public.daily_logins FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- REWARDS
-- =====================================================
CREATE POLICY "Anyone can view rewards catalog" ON public.rewards_catalog FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view own rewards" ON public.user_rewards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage user rewards" ON public.user_rewards FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- USER SUBSCRIPTIONS
-- =====================================================
CREATE POLICY "Users can view own subscription" ON public.user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage subscriptions" ON public.user_subscriptions FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- PRICE ALERTS
-- =====================================================
CREATE POLICY "Users can view own alerts" ON public.price_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own alerts" ON public.price_alerts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- DISCUSSIONS
-- =====================================================
CREATE POLICY "Anyone can view active discussions" ON public.discussions FOR SELECT USING (is_active = true);
CREATE POLICY "System can create event discussions" ON public.discussions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can create strategy discussions" ON public.discussions FOR INSERT WITH CHECK (type <> 'strategy' OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update discussions" ON public.discussions FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view non-collapsed comments" ON public.discussion_comments FOR SELECT USING (true);
CREATE POLICY "Eligible users can post comments" ON public.discussion_comments FOR INSERT WITH CHECK (
  auth.uid() = user_id 
  AND length(content) > 10 
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND (
      p.created_at < (now() - '7 days'::interval)
      OR p.reputation_score > 0
      OR EXISTS (SELECT 1 FROM orders WHERE orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
      OR EXISTS (SELECT 1 FROM listings WHERE listings.seller_id = auth.uid())
      OR EXISTS (SELECT 1 FROM portfolio_items WHERE portfolio_items.user_id = auth.uid())
    )
  )
);
CREATE POLICY "Users can update own comments" ON public.discussion_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.discussion_comments FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view vote counts" ON public.discussion_votes FOR SELECT USING (true);
CREATE POLICY "Users can add their vote" ON public.discussion_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their vote" ON public.discussion_votes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view reactions" ON public.discussion_reactions FOR SELECT USING (true);
CREATE POLICY "Users can add reactions" ON public.discussion_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own reactions" ON public.discussion_reactions FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- FOLLOWS
-- =====================================================
CREATE POLICY "Anyone can view follows" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- =====================================================
-- BIDS (WANTED BOARD)
-- =====================================================
CREATE POLICY "Anyone can view active bids" ON public.bids FOR SELECT USING (status = 'active');
CREATE POLICY "Users can create bids" ON public.bids FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their bids" ON public.bids FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can cancel their bids" ON public.bids FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- CREATOR PROFILES
-- =====================================================
CREATE POLICY "Anyone can view public creator profiles" ON public.creator_profiles FOR SELECT USING (is_public = true);
CREATE POLICY "Users can manage own creator profile" ON public.creator_profiles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view follower counts" ON public.creator_followers FOR SELECT USING (true);
CREATE POLICY "Users can follow creators" ON public.creator_followers FOR INSERT WITH CHECK (auth.uid() = follower_user_id);
CREATE POLICY "Users can unfollow" ON public.creator_followers FOR DELETE USING (auth.uid() = follower_user_id);

CREATE POLICY "Anyone can view public watchlists" ON public.creator_watchlists FOR SELECT USING (is_public = true);
CREATE POLICY "Creators can manage own watchlists" ON public.creator_watchlists FOR ALL USING (EXISTS (SELECT 1 FROM creator_profiles cp WHERE cp.id = creator_watchlists.creator_id AND cp.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM creator_profiles cp WHERE cp.id = creator_watchlists.creator_id AND cp.user_id = auth.uid()));

CREATE POLICY "Anyone can view public watchlist items" ON public.creator_watchlist_items FOR SELECT USING (EXISTS (SELECT 1 FROM creator_watchlists cw WHERE cw.id = creator_watchlist_items.watchlist_id AND cw.is_public = true));
CREATE POLICY "Creators can manage own watchlist items" ON public.creator_watchlist_items FOR ALL USING (EXISTS (SELECT 1 FROM creator_watchlists cw JOIN creator_profiles cp ON cp.id = cw.creator_id WHERE cw.id = creator_watchlist_items.watchlist_id AND cp.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM creator_watchlists cw JOIN creator_profiles cp ON cp.id = cw.creator_id WHERE cw.id = creator_watchlist_items.watchlist_id AND cp.user_id = auth.uid()));

CREATE POLICY "Anyone can view public calls" ON public.creator_market_calls FOR SELECT USING (is_public = true);
CREATE POLICY "Creators can create calls" ON public.creator_market_calls FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM creator_profiles cp WHERE cp.id = creator_market_calls.creator_id AND cp.user_id = auth.uid()));

CREATE POLICY "Anyone can view followups" ON public.creator_call_followups FOR SELECT USING (true);
CREATE POLICY "Creators can add followups to own calls" ON public.creator_call_followups FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM creator_market_calls cmc JOIN creator_profiles cp ON cp.id = cmc.creator_id WHERE cmc.id = creator_call_followups.call_id AND cp.user_id = auth.uid()));

CREATE POLICY "Anyone can view public creator picks" ON public.creator_picks FOR SELECT USING (is_public = true AND EXISTS (SELECT 1 FROM creator_profiles cp WHERE cp.id = creator_picks.creator_id AND cp.is_public = true));
CREATE POLICY "Creators can manage own picks" ON public.creator_picks FOR ALL USING (EXISTS (SELECT 1 FROM creator_profiles cp WHERE cp.id = creator_picks.creator_id AND cp.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM creator_profiles cp WHERE cp.id = creator_picks.creator_id AND cp.user_id = auth.uid()));

CREATE POLICY "Creators can view own analytics" ON public.creator_analytics FOR SELECT USING (EXISTS (SELECT 1 FROM creator_profiles cp WHERE cp.id = creator_analytics.creator_id AND cp.user_id = auth.uid()));
CREATE POLICY "System can manage analytics" ON public.creator_analytics FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- FRACTIONAL OWNERSHIP
-- =====================================================
CREATE POLICY "Anyone can view active fractional listings" ON public.fractional_listings FOR SELECT USING (status = 'active' OR owner_id = auth.uid());
CREATE POLICY "Owners can create fractional listings" ON public.fractional_listings FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their listings" ON public.fractional_listings FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can view their ownership" ON public.fractional_ownership FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Listing owners can view all ownership" ON public.fractional_ownership FOR SELECT USING (EXISTS (SELECT 1 FROM fractional_listings fl WHERE fl.id = fractional_ownership.fractional_listing_id AND fl.owner_id = auth.uid()));
CREATE POLICY "System can create ownership records" ON public.fractional_ownership FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view active share listings" ON public.fractional_share_listings FOR SELECT USING (status = 'active' OR seller_id = auth.uid());
CREATE POLICY "Users can list their shares" ON public.fractional_share_listings FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update their listings" ON public.fractional_share_listings FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete their listings" ON public.fractional_share_listings FOR DELETE USING (auth.uid() = seller_id);

CREATE POLICY "Anyone can view verifications" ON public.fractional_verifications FOR SELECT USING (true);
CREATE POLICY "Owners can add verifications" ON public.fractional_verifications FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM fractional_listings fl WHERE fl.id = fractional_verifications.fractional_listing_id AND fl.owner_id = auth.uid()));

-- =====================================================
-- ADMIN TABLES
-- =====================================================
CREATE POLICY "Admins can view auto_buy_config" ON public.auto_buy_config FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert auto_buy_config" ON public.auto_buy_config FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update auto_buy_config" ON public.auto_buy_config FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view auto_buy_logs" ON public.auto_buy_logs FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert auto_buy_logs" ON public.auto_buy_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Sellers can manage own relist settings" ON public.auto_relist_settings FOR ALL USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Users can view own relist settings" ON public.auto_relist_settings FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Admins can manage market controls" ON public.market_controls FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view market controls" ON public.market_controls FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- API SUBSCRIPTIONS
-- =====================================================
CREATE POLICY "Users can view own subscriptions" ON public.api_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own subscriptions" ON public.api_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscriptions" ON public.api_subscriptions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage logs" ON public.api_request_logs FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- EBAY CACHE & EXTERNAL DATA
-- =====================================================
CREATE POLICY "Anyone can view card cache" ON public.ebay_card_cache FOR SELECT USING (true);
CREATE POLICY "System can insert card cache" ON public.ebay_card_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update card cache" ON public.ebay_card_cache FOR UPDATE USING (true);

CREATE POLICY "Anyone can view external liquidity" ON public.external_liquidity_signals FOR SELECT USING (true);
CREATE POLICY "System can manage external liquidity" ON public.external_liquidity_signals FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- OTHER TABLES
-- =====================================================
CREATE POLICY "Anyone can log views" ON public.item_views FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view comments" ON public.listing_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON public.listing_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.listing_comments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete comments" ON public.listing_comments FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all comments" ON public.listing_comments FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view data access levels" ON public.data_access_levels FOR SELECT USING (true);

CREATE POLICY "Users can view own market memory" ON public.market_memory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own market memory" ON public.market_memory FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own notification preferences" ON public.notification_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage platform settings" ON public.platform_settings FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own pending payments" ON public.pending_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage pending payments" ON public.pending_payments FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can view price votes" ON public.price_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote" ON public.price_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view backgrounds" ON public.profile_backgrounds FOR SELECT USING (true);

CREATE POLICY "Users can view own receipts" ON public.receipts FOR SELECT USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = receipts.order_id AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())));
CREATE POLICY "System can create receipts" ON public.receipts FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view reference listings" ON public.reference_listings FOR SELECT USING (true);
CREATE POLICY "System can manage reference listings" ON public.reference_listings FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view own simulations" ON public.regret_simulations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create simulations" ON public.regret_simulations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own reputation events" ON public.reputation_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage reputation" ON public.reputation_events FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view own shadow wishlists" ON public.shadow_wishlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage shadow wishlists" ON public.shadow_wishlists FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view tournament entries" ON public.tournament_entries FOR SELECT USING (true);
CREATE POLICY "Users can manage own entries" ON public.tournament_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own ibans" ON public.user_ibans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own ibans" ON public.user_ibans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own market signals" ON public.user_market_signals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own signals" ON public.user_market_signals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own unlocked backgrounds" ON public.user_unlocked_backgrounds FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage unlocked backgrounds" ON public.user_unlocked_backgrounds FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can join waitlist" ON public.waitlist FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view wallet audit log" ON public.wallet_audit_log FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "System can create audit log" ON public.wallet_audit_log FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage whale invites" ON public.whale_invites FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own wire transfers" ON public.wire_transfers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create wire transfers" ON public.wire_transfers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage wire transfers" ON public.wire_transfers FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
