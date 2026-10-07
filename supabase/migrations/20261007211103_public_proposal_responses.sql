alter table public.public_proposal_documents
  add column viewed_at timestamptz,
  add column responded_at timestamptz,
  add column response jsonb,
  add constraint public_proposal_documents_response_check check (
    response is null or (jsonb_typeof(response) = 'object' and coalesce(response->>'status' in ('Aprovada','Recusada'), false))
  );
grant update (viewed_at, responded_at, response) on public.public_proposal_documents to service_role;
drop policy public_proposal_documents_insert_own on public.public_proposal_documents;
create policy public_proposal_documents_insert_own on public.public_proposal_documents
for insert to authenticated with check (
  (select auth.uid()) = user_id
  and expires_at > now() and expires_at <= now() + interval '90 days'
  and viewed_at is null and responded_at is null and response is null
);
