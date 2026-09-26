-- (select auth.uid()) é avaliado uma vez por query em vez de uma vez por linha.
drop policy "holdings_select_own" on public.holdings;
drop policy "holdings_insert_own" on public.holdings;
drop policy "holdings_update_own" on public.holdings;
drop policy "holdings_delete_own" on public.holdings;
drop policy "quotes_cache_select_authenticated" on public.quotes_cache;
drop policy "notification_settings_select_own" on public.notification_settings;
drop policy "notification_settings_insert_own" on public.notification_settings;
drop policy "notification_settings_update_own" on public.notification_settings;

create policy "holdings_select_own" on public.holdings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "holdings_insert_own" on public.holdings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "holdings_update_own" on public.holdings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "holdings_delete_own" on public.holdings
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "quotes_cache_select_authenticated" on public.quotes_cache
  for select to authenticated using (true);

create policy "notification_settings_select_own" on public.notification_settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "notification_settings_insert_own" on public.notification_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "notification_settings_update_own" on public.notification_settings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop index if exists public.holdings_ticker_idx;
