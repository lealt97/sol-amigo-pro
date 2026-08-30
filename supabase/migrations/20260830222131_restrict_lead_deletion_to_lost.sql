drop policy if exists "leads_delete_own" on public.leads;

create policy "leads_delete_own"
  on public.leads for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and status = 'perdido'
  );
