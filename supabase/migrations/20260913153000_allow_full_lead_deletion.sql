-- Migration: 20260913153000_allow_full_lead_deletion.sql
-- Descrição: Permite que o integrador autenticado exclua qualquer um de seus leads/atendimentos,
-- removendo a restrição que limitava a exclusão apenas para status = 'perdido'.

drop policy if exists "leads_delete_own" on public.leads;

create policy "leads_delete_own"
  on public.leads for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
  );

notify pgrst, 'reload schema';
