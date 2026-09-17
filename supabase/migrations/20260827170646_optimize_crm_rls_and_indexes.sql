create index if not exists leads_capture_form_id_idx
  on public.leads (capture_form_id);

drop policy if exists "clients_select_own" on public.clients;
create policy "clients_select_own"
  on public.clients for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "clients_insert_own" on public.clients;
create policy "clients_insert_own"
  on public.clients for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "clients_update_own" on public.clients;
create policy "clients_update_own"
  on public.clients for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "clients_delete_own" on public.clients;
create policy "clients_delete_own"
  on public.clients for delete
  to authenticated
  using ((select auth.uid()) = user_id);
