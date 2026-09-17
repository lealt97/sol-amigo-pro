-- PR #1: central de leads com conversão em cliente e criação de proposta.

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_lead_id uuid references public.leads(id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  phone text not null check (char_length(phone) between 8 and 30),
  email text,
  city text not null,
  state text not null check (state ~ '^[A-Z]{2}$'),
  property_type text not null check (property_type in ('Residencial', 'Comercial', 'Rural', 'Industrial')),
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_lead_id)
);

alter table public.leads add column if not exists client_id uuid references public.clients(id) on delete set null;

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  code text not null,
  system_type text not null default 'On-Grid' check (system_type in ('On-Grid', 'Híbrido')),
  status text not null default 'rascunho' check (status in ('rascunho', 'enviada', 'aprovada', 'recusada', 'cancelada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, code)
);

create index if not exists clients_user_id_created_at_idx on public.clients (user_id, created_at desc);
create index if not exists proposals_user_id_lead_id_created_at_idx on public.proposals (user_id, lead_id, created_at desc);

alter table public.clients enable row level security;
alter table public.proposals enable row level security;

drop policy if exists "clients_select_own" on public.clients;
create policy "clients_select_own" on public.clients for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "clients_insert_own" on public.clients;
create policy "clients_insert_own" on public.clients for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "clients_update_own" on public.clients;
create policy "clients_update_own" on public.clients for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "clients_delete_own" on public.clients;
create policy "clients_delete_own" on public.clients for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "proposals_select_own" on public.proposals;
create policy "proposals_select_own" on public.proposals for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "proposals_insert_own" on public.proposals;
create policy "proposals_insert_own" on public.proposals for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "proposals_update_own" on public.proposals;
create policy "proposals_update_own" on public.proposals for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "proposals_delete_own" on public.proposals;
create policy "proposals_delete_own" on public.proposals for delete to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.clients to authenticated, service_role;
grant select, insert, update, delete on public.proposals to authenticated, service_role;
revoke all on public.clients from anon;
revoke all on public.proposals from anon;

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at before update on public.clients
for each row execute function private.set_updated_at();

drop trigger if exists proposals_set_updated_at on public.proposals;
create trigger proposals_set_updated_at before update on public.proposals
for each row execute function private.set_updated_at();

create or replace function public.add_lead_to_clients(p_lead_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_lead public.leads%rowtype;
  v_client_id uuid;
begin
  if v_user_id is null then raise exception 'Autenticação obrigatória'; end if;

  select * into v_lead from public.leads
  where id = p_lead_id and user_id = v_user_id;
  if not found then raise exception 'Lead não encontrado'; end if;

  insert into public.clients (user_id, source_lead_id, name, phone, email, city, state, property_type)
  values (v_user_id, v_lead.id, v_lead.name, v_lead.phone, v_lead.email, v_lead.city, v_lead.state, v_lead.property_type)
  on conflict (user_id, source_lead_id) do update set
    name = excluded.name, phone = excluded.phone, email = excluded.email,
    city = excluded.city, state = excluded.state, property_type = excluded.property_type
  returning id into v_client_id;

  update public.leads set client_id = v_client_id where id = v_lead.id and user_id = v_user_id;
  insert into public.lead_activities (user_id, lead_id, activity_type, title, metadata)
  values (v_user_id, v_lead.id, 'conversao', 'Lead adicionado aos clientes', jsonb_build_object('client_id', v_client_id));
  return v_client_id;
end;
$$;

create or replace function public.create_proposal_from_lead(p_lead_id uuid, p_system_type text default 'On-Grid')
returns table (proposal_id uuid, proposal_code text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_lead public.leads%rowtype;
  v_code text;
begin
  if v_user_id is null then raise exception 'Autenticação obrigatória'; end if;
  if p_system_type not in ('On-Grid', 'Híbrido') then raise exception 'Tipo de sistema inválido'; end if;

  select * into v_lead from public.leads
  where id = p_lead_id and user_id = v_user_id;
  if not found then raise exception 'Lead não encontrado'; end if;

  v_code := 'PROP-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  insert into public.proposals (user_id, lead_id, client_id, code, system_type)
  values (v_user_id, v_lead.id, v_lead.client_id, v_code, p_system_type)
  returning id, code into proposal_id, proposal_code;

  insert into public.lead_activities (user_id, lead_id, activity_type, title, metadata)
  values (v_user_id, v_lead.id, 'proposta_criada', 'Proposta em rascunho criada',
    jsonb_build_object('proposal_id', proposal_id, 'code', proposal_code, 'system_type', p_system_type));
  return next;
end;
$$;

create or replace function public.delete_owned_lead(p_lead_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Autenticação obrigatória'; end if;
  delete from public.leads where id = p_lead_id and user_id = v_user_id;
  return found;
end;
$$;

revoke all on function public.add_lead_to_clients(uuid) from public, anon;
revoke all on function public.create_proposal_from_lead(uuid, text) from public, anon;
revoke all on function public.delete_owned_lead(uuid) from public, anon;
grant execute on function public.add_lead_to_clients(uuid) to authenticated, service_role;
grant execute on function public.create_proposal_from_lead(uuid, text) to authenticated, service_role;
grant execute on function public.delete_owned_lead(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';
