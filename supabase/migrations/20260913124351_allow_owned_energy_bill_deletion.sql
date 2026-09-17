-- Permite que o integrador remova o arquivo privado antes de excluir
-- definitivamente um atendimento perdido. Nenhum upload ou alteração direta
-- é liberado ao cliente autenticado.
drop policy if exists "lead_energy_bills_delete_own" on storage.objects;
create policy "lead_energy_bills_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'lead-energy-bills'
    and exists (
      select 1
      from public.lead_documents
      where lead_documents.bucket_id = storage.objects.bucket_id
        and lead_documents.object_path = storage.objects.name
        and lead_documents.user_id = (select auth.uid())
    )
  );
