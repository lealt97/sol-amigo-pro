-- Migration: 20260914183000_multi_sizing_architecture.sql
-- Descrição: Evolução da tabela solar_sizings para suportar múltiplos dimensionamentos por contato/cliente,
--            vínculo com unidade consumidora e oportunidade, tipos On-Grid e Híbrido, cenários independentes,
--            arquivamento, duplicação e snapshots tipados, preservando compatibilidade e RLS.

-- 1. Remover a restrição UNIQUE(lead_id) para permitir múltiplos dimensionamentos por lead/contato
do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'solar_sizings'
      and constraint_name = 'solar_sizings_lead_id_key'
  ) then
    alter table public.solar_sizings drop constraint solar_sizings_lead_id_key;
  end if;
end $$;

-- 2. Tornar lead_id opcional para permitir que um dimensionamento pertença diretamente a um cliente/UC
alter table public.solar_sizings
  alter column lead_id drop not null;

-- 3. Adicionar novas colunas estruturadas para suportar arquitetura flexível
alter table public.solar_sizings
  add column if not exists client_id uuid references public.clients(id) on delete cascade,
  add column if not exists opportunity_id uuid,
  add column if not exists name text not null default 'Dimensionamento Solar' check (char_length(name) between 1 and 200),
  add column if not exists system_type text not null default 'On-Grid' check (system_type in ('On-Grid', 'Híbrido')),
  add column if not exists battery_capacity_kwh numeric(8,2) check (battery_capacity_kwh is null or battery_capacity_kwh >= 0),
  add column if not exists battery_count integer check (battery_count is null or battery_count >= 0),
  add column if not exists battery_dod_percent numeric(5,2) check (battery_dod_percent is null or (battery_dod_percent between 10 and 100)),
  add column if not exists battery_autonomy_hours numeric(8,2) check (battery_autonomy_hours is null or battery_autonomy_hours >= 0),
  add column if not exists assumptions jsonb not null default '{}'::jsonb,
  add column if not exists input_data jsonb not null default '{}'::jsonb,
  add column if not exists result_data jsonb not null default '{}'::jsonb,
  add column if not exists warnings text[] not null default '{}',
  add column if not exists archived_at timestamptz;

-- 4. Atualizar registros históricos garantindo compatibilidade e integridade
-- Preencher client_id a partir do lead associado, se já existir
update public.solar_sizings s
set client_id = l.client_id
from public.leads l
where s.lead_id = l.id
  and s.client_id is null
  and l.client_id is not null;

-- Preencher consumer_unit_id a partir do lead associado, caso esteja nulo
update public.solar_sizings s
set consumer_unit_id = l.consumer_unit_id
from public.leads l
where s.lead_id = l.id
  and s.consumer_unit_id is null
  and l.consumer_unit_id is not null;

-- Gerar nome legível e informativo para os registros anteriores
update public.solar_sizings
set name = case
  when system_type = 'Híbrido' then concat('Dimensionamento Híbrido (', installed_power_kwp::text, ' kWp)')
  else concat('Dimensionamento On-Grid (', installed_power_kwp::text, ' kWp)')
end
where name = 'Dimensionamento Solar';

-- 5. Criar índices para consultas eficientes por contato, cliente, UC e status
create index if not exists solar_sizings_client_idx
  on public.solar_sizings (client_id)
  where client_id is not null;

create index if not exists solar_sizings_lead_idx
  on public.solar_sizings (lead_id)
  where lead_id is not null;

create index if not exists solar_sizings_opportunity_idx
  on public.solar_sizings (opportunity_id)
  where opportunity_id is not null;

create index if not exists solar_sizings_consumer_unit_idx
  on public.solar_sizings (consumer_unit_id)
  where consumer_unit_id is not null;

create index if not exists solar_sizings_user_archived_idx
  on public.solar_sizings (user_id, archived_at, updated_at desc);

-- 6. Atualizar Políticas de RLS para validação estrita de posse e organização
alter table public.solar_sizings enable row level security;

-- Política de Leitura: somente dimensionamentos do próprio usuário autenticado
drop policy if exists "solar_sizings_select_own" on public.solar_sizings;
create policy "solar_sizings_select_own"
  on public.solar_sizings for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Política de Inserção: valida que o usuário é o dono e que, se associado a um lead ou cliente/UC, estes também pertençam a ele
drop policy if exists "solar_sizings_insert_own_qualified_lead" on public.solar_sizings;
drop policy if exists "solar_sizings_insert_own" on public.solar_sizings;
create policy "solar_sizings_insert_own"
  on public.solar_sizings for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      lead_id is null
      or exists (
        select 1
        from public.leads
        where leads.id = solar_sizings.lead_id
          and leads.user_id = (select auth.uid())
      )
    )
    and (
      client_id is null
      or exists (
        select 1
        from public.clients
        where clients.id = solar_sizings.client_id
          and clients.user_id = (select auth.uid())
      )
    )
    and (
      consumer_unit_id is null
      or exists (
        select 1
        from public.consumer_units
        where consumer_units.id = solar_sizings.consumer_unit_id
          and consumer_units.user_id = (select auth.uid())
      )
    )
  );

-- Política de Atualização: valida posse do registro e dos relacionamentos
drop policy if exists "solar_sizings_update_own_qualified_lead" on public.solar_sizings;
drop policy if exists "solar_sizings_update_own" on public.solar_sizings;
create policy "solar_sizings_update_own"
  on public.solar_sizings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      lead_id is null
      or exists (
        select 1
        from public.leads
        where leads.id = solar_sizings.lead_id
          and leads.user_id = (select auth.uid())
      )
    )
    and (
      client_id is null
      or exists (
        select 1
        from public.clients
        where clients.id = solar_sizings.client_id
          and clients.user_id = (select auth.uid())
      )
    )
    and (
      consumer_unit_id is null
      or exists (
        select 1
        from public.consumer_units
        where consumer_units.id = solar_sizings.consumer_unit_id
          and consumer_units.user_id = (select auth.uid())
      )
    )
  );

-- Política de Exclusão (para descarte seguro e testes): apenas se pertencer ao próprio usuário
drop policy if exists "solar_sizings_delete_own" on public.solar_sizings;
create policy "solar_sizings_delete_own"
  on public.solar_sizings for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.solar_sizings to authenticated;
grant select, insert, update, delete on public.solar_sizings to service_role;
revoke all on public.solar_sizings from anon;
