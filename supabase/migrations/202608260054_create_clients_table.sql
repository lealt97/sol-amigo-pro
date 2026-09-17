create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  document text not null default '',
  type text not null default 'Residencial' check (type in ('Residencial','Comercial','Rural','Industrial')),
  email text not null default '',
  phone text not null default '',
  city text not null default '',
  state text not null default '',
  concessionaria text not null default '',
  avg_consumption_kwh numeric(12,2) not null default 0,
  proposals_count integer not null default 0 check (proposals_count >= 0),
  active_status text not null default 'Em atendimento' check (active_status in ('Ativo','Em atendimento','Inativo')),
  crm_status text check (crm_status is null or crm_status in ('Novo lead','Em contato','Qualificado','Proposta enviada','Negociação','Cliente','Perdido')),
  responsible text,
  source text,
  last_interaction text,
  created_at timestamptz not null default now(),
  avg_monthly_bill numeric(12,2),
  connection_type text check (connection_type is null or connection_type in ('Monofásica','Bifásica','Trifásica')),
  consumer_unit text,
  tags text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create index if not exists clients_user_id_created_at_idx
  on public.clients (user_id, created_at desc);

alter table public.clients enable row level security;

create policy "clients_select_own"
  on public.clients for select
  to authenticated
  using (user_id = auth.uid());

create policy "clients_insert_own"
  on public.clients for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "clients_update_own"
  on public.clients for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "clients_delete_own"
  on public.clients for delete
  to authenticated
  using (user_id = auth.uid());

create or replace function public.set_clients_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_clients_updated_at();
