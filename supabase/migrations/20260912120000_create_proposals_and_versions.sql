-- Migration: 20260912120000_create_proposals_and_versions.sql
-- Descrição: Criação das tabelas de propostas e versões imutáveis com RLS e auditoria.

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  code text not null check (char_length(code) between 3 and 40),
  public_token uuid not null default gen_random_uuid() unique,
  status text not null default 'rascunho'
    check (status in ('rascunho', 'enviada', 'visualizada', 'em_negociacao', 'aprovada', 'recusada', 'expirada')),
  current_version_number integer not null default 1 check (current_version_number >= 1),
  total_value numeric(14,2) not null default 0 check (total_value >= 0),
  valid_until date,
  sent_at timestamptz,
  viewed_at timestamptz,
  decided_at timestamptz,
  decision_notes text check (decision_notes is null or char_length(decision_notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proposals_user_lead_unique unique (user_id, lead_id)
);

create index if not exists proposals_user_updated_idx
  on public.proposals (user_id, updated_at desc);

create index if not exists proposals_lead_id_idx
  on public.proposals (lead_id);

create index if not exists proposals_public_token_idx
  on public.proposals (public_token);

alter table public.proposals enable row level security;

drop policy if exists "proposals_select_own" on public.proposals;
create policy "proposals_select_own"
  on public.proposals for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "proposals_insert_own" on public.proposals;
create policy "proposals_insert_own"
  on public.proposals for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.leads
      where leads.id = proposals.lead_id
        and leads.user_id = (select auth.uid())
    )
  );

drop policy if exists "proposals_update_own" on public.proposals;
create policy "proposals_update_own"
  on public.proposals for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.proposals from authenticated;
grant select, insert, update on public.proposals to authenticated;
grant select, insert, update, delete on public.proposals to service_role;
revoke all on public.proposals from anon;

drop trigger if exists proposals_set_updated_at on public.proposals;
create trigger proposals_set_updated_at
before update on public.proposals
for each row execute function private.set_updated_at();

-- Tabela de versões imutáveis da proposta
create table if not exists public.proposal_versions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  version_number integer not null check (version_number >= 1),
  status text not null default 'rascunho'
    check (status in ('rascunho', 'enviada', 'visualizada', 'aprovada', 'recusada', 'substituida')),
  valid_until date,
  total_value numeric(14,2) not null default 0 check (total_value >= 0),
  sizing_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(sizing_snapshot) = 'object'),
  equipment_snapshot jsonb not null default '[]'::jsonb check (jsonb_typeof(equipment_snapshot) = 'array'),
  costs_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(costs_snapshot) = 'object'),
  commercial_conditions jsonb not null default '{}'::jsonb check (jsonb_typeof(commercial_conditions) = 'object'),
  pdf_settings_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(pdf_settings_snapshot) = 'object'),
  custom_notes text check (custom_notes is null or char_length(custom_notes) <= 4000),
  sent_at timestamptz,
  viewed_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 500),
  created_at timestamptz not null default now(),
  constraint proposal_versions_proposal_version_unique unique (proposal_id, version_number)
);

create index if not exists proposal_versions_proposal_idx
  on public.proposal_versions (proposal_id, version_number desc);

create index if not exists proposal_versions_user_idx
  on public.proposal_versions (user_id);

alter table public.proposal_versions enable row level security;

drop policy if exists "proposal_versions_select_own" on public.proposal_versions;
create policy "proposal_versions_select_own"
  on public.proposal_versions for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "proposal_versions_insert_own" on public.proposal_versions;
create policy "proposal_versions_insert_own"
  on public.proposal_versions for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.proposals
      where proposals.id = proposal_versions.proposal_id
        and proposals.user_id = (select auth.uid())
    )
  );

drop policy if exists "proposal_versions_update_own" on public.proposal_versions;
create policy "proposal_versions_update_own"
  on public.proposal_versions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.proposal_versions from authenticated;
grant select, insert, update on public.proposal_versions to authenticated;
grant select, insert, update, delete on public.proposal_versions to service_role;
revoke all on public.proposal_versions from anon;

-- Atualizar restrição de lead_activities para incluir atividades de propostas
alter table public.lead_activities
  drop constraint if exists lead_activities_activity_type_check;

alter table public.lead_activities
  add constraint lead_activities_activity_type_check check (
    activity_type in (
      'lead_criado', 'status_alterado', 'contato', 'nota', 'tarefa_criada',
      'tarefa_concluida', 'qualificado', 'conversao', 'perdido', 'reaberto',
      'dimensionamento', 'proposta_criada', 'proposta_enviada', 'proposta_visualizada',
      'proposta_aprovada', 'proposta_recusada'
    )
  );

comment on table public.proposals is 'Proposta comercial central por atendimento com chave única para o lead.';
comment on table public.proposal_versions is 'Versões imutáveis de propostas comerciais com snapshots completos.';
