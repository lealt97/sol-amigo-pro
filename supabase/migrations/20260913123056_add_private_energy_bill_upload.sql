-- Contas de luz contêm dados pessoais e nunca devem ser publicadas.
-- O formulário público envia o arquivo à Edge Function, que valida o conteúdo
-- e usa a service role para gravá-lo neste bucket privado.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'lead-energy-bills',
  'lead-energy-bills',
  false,
  8388608,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.lead_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  document_type text not null default 'energy_bill'
    check (document_type in ('energy_bill')),
  bucket_id text not null default 'lead-energy-bills'
    check (bucket_id = 'lead-energy-bills'),
  object_path text not null unique,
  original_name text not null check (char_length(original_name) between 1 and 160),
  mime_type text not null
    check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes bigint not null check (size_bytes between 1 and 8388608),
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  uploaded_via text not null default 'public_form'
    check (uploaded_via in ('public_form', 'integrator')),
  created_at timestamptz not null default now(),
  unique (lead_id, document_type, content_sha256)
);

create index if not exists lead_documents_user_lead_created_idx
  on public.lead_documents (user_id, lead_id, created_at desc);

alter table public.lead_documents enable row level security;

drop policy if exists "lead_documents_select_own" on public.lead_documents;
create policy "lead_documents_select_own"
  on public.lead_documents
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.lead_documents from public, anon, authenticated;
grant select on public.lead_documents to authenticated;
grant select, insert, update, delete on public.lead_documents to service_role;

-- O usuário autenticado consegue baixar somente objetos que pertencem a um
-- atendimento da própria conta. Uploads públicos nunca recebem acesso direto
-- ao Storage; passam exclusivamente pela Edge Function validada.
drop policy if exists "lead_energy_bills_select_own" on storage.objects;
create policy "lead_energy_bills_select_own"
  on storage.objects
  for select
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

alter table public.lead_activities
  drop constraint if exists lead_activities_activity_type_check;
alter table public.lead_activities
  add constraint lead_activities_activity_type_check check (
    activity_type in (
      'lead_criado', 'status_alterado', 'contato', 'nota', 'tarefa_criada',
      'tarefa_concluida', 'qualificado', 'conversao', 'perdido', 'reaberto',
      'dimensionamento', 'proposta_criada', 'proposta_enviada', 'proposta_visualizada',
      'proposta_aprovada', 'proposta_recusada', 'proposta_expirada',
      'proposta_cancelada', 'proposta_revisada', 'documento_recebido'
    )
  );

notify pgrst, 'reload schema';
