-- Private snapshots; only the token-checking Edge Function reads them publicly.
create table public.public_proposal_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id text not null check (char_length(source_id) between 1 and 200),
  code text not null check (char_length(code) between 1 and 100),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  document jsonb not null check (jsonb_typeof(document) = 'object' and octet_length(document::text) <= 12582912),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days')
);
create index public_proposal_documents_owner_source_idx on public.public_proposal_documents(user_id, source_id);
alter table public.public_proposal_documents enable row level security;
revoke all on public.public_proposal_documents from public, anon, authenticated;
grant select, insert, delete on public.public_proposal_documents to authenticated;
grant select on public.public_proposal_documents to service_role;
create policy public_proposal_documents_select_own on public.public_proposal_documents for select to authenticated using ((select auth.uid()) = user_id);
create policy public_proposal_documents_insert_own on public.public_proposal_documents for insert to authenticated with check ((select auth.uid()) = user_id and expires_at > now() and expires_at <= now() + interval '90 days');
create policy public_proposal_documents_delete_own on public.public_proposal_documents for delete to authenticated using ((select auth.uid()) = user_id);
