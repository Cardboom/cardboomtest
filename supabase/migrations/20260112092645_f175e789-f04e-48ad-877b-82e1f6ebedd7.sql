
-- Final remaining fixes
DROP POLICY IF EXISTS "Sellers can update own auctions" ON public.auctions;
DROP POLICY IF EXISTS "System can update auctions" ON public.auctions;
CREATE POLICY "Sellers can update own auctions" ON public.auctions FOR UPDATE TO authenticated
USING (auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users manage own points" ON public.cardboom_points;
DROP POLICY IF EXISTS "System can manage points" ON public.cardboom_points;
CREATE POLICY "Users manage own points" ON public.cardboom_points FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own points history" ON public.cardboom_points_history;
DROP POLICY IF EXISTS "System can insert points history" ON public.cardboom_points_history;
CREATE POLICY "Users own points history" ON public.cardboom_points_history FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users own idempotency keys" ON public.idempotency_keys;
DROP POLICY IF EXISTS "System can manage idempotency keys" ON public.idempotency_keys;
CREATE POLICY "Users own idempotency keys" ON public.idempotency_keys FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own ledger entries" ON public.ledger_entries;
DROP POLICY IF EXISTS "Ledger entries are append-only system inserts" ON public.ledger_entries;
CREATE POLICY "Users can insert own ledger entries" ON public.ledger_entries FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM wallets w WHERE w.id = wallet_id AND w.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
